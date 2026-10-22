// scripts/fsd/rules/shared.mjs
// shared — фундамент без бизнес-логики (FSD.md §14, §5.3, §16).

import fs from "node:fs";
import path from "node:path";

const sharedLibGrouping = {
  name: "shared-lib-grouping",
  docs: "§14",
  severity: "warn",
  description: "shared/lib как свалка файлов вместо сфокусированных библиотек",
  check(project) {
    const shared = project.layers.get("shared");
    if (!shared) return [];

    const libAbs = path.join(shared.abs, "lib");
    if (!fs.existsSync(libAbs)) return [];

    const entries = fs.readdirSync(libAbs, { withFileTypes: true }).filter((entry) => !entry.name.startsWith("."));
    const looseFiles = entries.filter((entry) => entry.isFile() && project.config.extensions.includes(path.extname(entry.name)));
    const diagnostics = [];

    for (const file of looseFiles) {
      diagnostics.push({
        file: `shared/lib/${file.name}`,
        message: "файл лежит прямо в shared/lib",
        hint: "shared/lib — набор мини-библиотек с одной областью каждая (dates, colors, text), а не папка «утилиты». Заведи shared/lib/{область}/ с index.ts и README.",
      });
    }

    for (const dir of entries.filter((entry) => entry.isDirectory())) {
      const readme = ["README.md", "readme.md"].some((name) => fs.existsSync(path.join(libAbs, dir.name, name)));
      if (readme) continue;
      diagnostics.push({
        file: `shared/lib/${dir.name}`,
        message: `у библиотеки «${dir.name}» нет README`,
        hint: "README фиксирует границу: что сюда можно добавлять, а что нельзя. Без неё библиотека за полгода превращается в utils.",
      });
    }

    return diagnostics;
  },
};

/**
 * FSD.md §14: в shared запрещена бизнес-ЛОГИКА, но «business-themed» UI (лого, layout) — можно.
 * Проверяем по именам сущностей проекта: если файл в shared назван доменным термином — это сигнал.
 */
const sharedBusinessLogic = {
  name: "shared-business-logic",
  docs: "§14",
  severity: "warn",
  description: "Доменная логика утекла в shared",
  check(project) {
    const entities = project.layers.get("entities");
    if (!entities) return [];

    const domainWords = entities.slices
      .map((slice) => slice.shortName)
      .filter((name) => name.length > 3)
      .map((name) => name.replace(/-/g, ""));
    if (domainWords.length === 0) return [];

    const diagnostics = [];
    for (const file of project.files) {
      if (file.layer !== "shared") continue;
      if (file.segment === "ui") continue; // визуальная бизнес-тематика в shared/ui разрешена

      // Слово целиком, а не подстрока: иначе «call» находится в
      // useDebouncedCallback, а «order» — в useReorderableList, и правило
      // ругается на инфраструктуру, к домену отношения не имеющую.
      const parts = new Set(
        file.rel
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .split(/[^A-Za-z0-9]+|\s+/)
          .filter(Boolean)
          .map((part) => part.toLowerCase()),
      );
      const hit = domainWords.find((word) => parts.has(word.toLowerCase()));
      if (!hit) continue;

      diagnostics.push({
        file: file.rel,
        message: `доменное имя «${hit}» в shared/${file.segment ?? "?"}`,
        hint: `Логика и данные сущности живут в entities/${hit}, а не в фундаменте. В shared остаётся инфраструктура: клиент, форматтеры, UI-kit.`,
      });
    }
    return diagnostics;
  },
};

const sharedSegmentApi = {
  name: "shared-segment-public-api",
  docs: "§6",
  severity: "warn",
  description: "Сегмент shared без публичного API",
  check(project) {
    const shared = project.layers.get("shared");
    if (!shared) return [];

    const diagnostics = [];
    for (const segment of shared.segments) {
      if (segment === "ui" || segment === "lib") continue; // там API на каждый компонент/библиотеку
      const segmentAbs = path.join(shared.abs, segment);
      const hasIndex = fs
        .readdirSync(segmentAbs, { withFileTypes: true })
        .some((entry) => entry.isFile() && entry.name.startsWith("index."));
      if (hasIndex) continue;

      diagnostics.push({
        file: `shared/${segment}`,
        message: `сегмент shared/${segment} без index.ts`,
        hint: "На слоях без слайсов публичный API живёт на уровне сегмента. Либо заведи index.ts, либо отключи правило для мелких сегментов-констант в конфиге.",
      });
    }
    return diagnostics;
  },
};

export default [sharedLibGrouping, sharedBusinessLogic, sharedSegmentApi];
