// scripts/fsd/rules/layers.mjs
// Главное правило импортов и статусы слоёв (FSD.md §0, §3, §13).

import { DEPRECATED_LAYERS, DISCOURAGED_LAYERS } from "../config.mjs";
import { isSameSlice } from "./_shared.mjs";

/**
 * FSD.md §3: «Модуль в слайсе может импортировать только слайсы из слоёв СТРОГО НИЖЕ».
 * Исключения: app и shared — слой и слайс одновременно, их сегменты импортируют друг друга.
 */
const forbiddenImports = {
  name: "forbidden-imports",
  docs: "§3",
  severity: "error",
  description: "Импорт «вверх» по слоям или в слайс того же слоя",
  check(project) {
    const { config } = project;
    const diagnostics = [];

    for (const file of project.files) {
      if (!file.knownLayer) continue;
      const fromIndex = config.layerIndex.get(file.layer);

      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || !target.isKnownLayer) continue;

        const toIndex = config.layerIndex.get(target.layer);

        if (toIndex < fromIndex) {
          diagnostics.push({
            file: file.rel,
            line: dependency.line,
            message: `импорт «вверх»: ${file.layer} → ${target.layer} (${dependency.spec})`,
            hint: `Переверни зависимость или подними взаимодействие на слой выше — ${target.layer} не имеет права знать про ${file.layer}.`,
          });
          continue;
        }

        if (toIndex === fromIndex) {
          const sliceless = config.appLayer === file.layer || file.layer === "shared";
          if (sliceless) continue; // сегменты app/shared свободно импортируют друг друга (§3)
          if (target.crossApiFor) continue; // @x — отдельное правило (cross-imports.mjs)
          if (isSameSlice(file, target)) continue;

          diagnostics.push({
            file: file.rel,
            line: dependency.line,
            message: `cross-import слайсов одного слоя: ${file.layer}/${file.slice} → ${target.layer}/${target.slice}`,
            hint: "Подними взаимодействие выше, опусти общее в shared или (только для entities) объяви @x-API.",
          });
        }
      }
    }

    return diagnostics;
  },
};

const unknownLayer = {
  name: "unknown-layer",
  docs: "§3",
  severity: "error",
  description: "Папка в корне FSD, которая не является слоем",
  check(project) {
    const known = project.config.layers;
    return project.unknownDirs.map((dir) => ({
      file: dir.rel,
      message: `«${dir.name}» — не слой FSD`,
      hint: `Добавлять свои слои не рекомендуется, их семантика стандартизирована. Ожидаются: ${known.join(", ")}. Если это опечатка (paged, feature, entitie) — переименуй.`,
    }));
  },
};

const deprecatedLayer = {
  name: "deprecated-layer",
  docs: "§3",
  severity: "error",
  description: "Использование deprecated-слоя processes",
  check(project) {
    const diagnostics = [];
    for (const layer of project.layers.values()) {
      if (!DEPRECATED_LAYERS.has(layer.name)) continue;
      diagnostics.push({
        file: layer.name,
        message: `слой ${layer.name} признан deprecated (${layer.files.length} файлов)`,
        hint: "Содержимое переносится в features и app.",
      });
    }
    return diagnostics;
  },
};

/**
 * FSD.md §0: слой widgets официально не рекомендуется (дока, 29.07.2026).
 * Существующие слайсы валидны, поэтому severity — warn, а не error.
 */
const discouragedLayer = {
  name: "discouraged-widgets-layer",
  docs: "§0",
  severity: "warn",
  description: "Новые слайсы в слое widgets",
  check(project) {
    const diagnostics = [];
    for (const layer of project.layers.values()) {
      if (!DISCOURAGED_LAYERS.has(layer.name)) continue;
      for (const slice of layer.slices) {
        diagnostics.push({
          file: slice.rel,
          message: `слайс в слое widgets: «${slice.name}»`,
          hint: "Дока не рекомендует widgets: композиция конкретного экрана → pages, переиспользуемое действие вместе с UI → features, нейтральный UI → shared, layout приложения → app.",
        });
      }
    }
    return diagnostics;
  },
};

const layerRootImports = {
  name: "no-layer-root-import",
  docs: "§6",
  severity: "error",
  description: "Импорт слоя целиком вместо конкретного слайса/сегмента",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || !target.isKnownLayer) continue;
        if (!target.pointsAtLayerRoot) continue;
        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `импорт слоя целиком: ${dependency.spec}`,
          hint: "У слоя не может быть публичного API. Импортируй конкретный слайс (@/entities/user) или сегмент (@/shared/ui/button).",
        });
      }
    }
    return diagnostics;
  },
};

export default [forbiddenImports, unknownLayer, deprecatedLayer, discouragedLayer, layerRootImports];
