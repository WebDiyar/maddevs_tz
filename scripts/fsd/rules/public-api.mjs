// scripts/fsd/rules/public-api.mjs
// Публичный API слайса: index.ts, обход API, барели, export * (FSD.md §6, §14).

import { matchesWithLines } from "./_shared.mjs";

const slicePublicApi = {
  name: "slice-public-api",
  docs: "§6",
  severity: "error",
  description: "У слайса нет публичного API",
  check(project) {
    const diagnostics = [];
    for (const slice of project.slices) {
      const hasClientIndex = slice.indexFiles.some((name) => name.startsWith("index.") && !name.startsWith("index.server"));
      if (slice.indexFiles.length === 0) {
        diagnostics.push({
          file: slice.rel,
          message: `слайс «${slice.layer}/${slice.name}» без index.ts`,
          hint: "Снаружи слайс виден только через публичный API. Заведи index.ts с явными именованными ре-экспортами.",
        });
      } else if (!hasClientIndex && slice.indexFiles.length > 0) {
        diagnostics.push({
          file: slice.rel,
          message: `у слайса есть только ${slice.indexFiles.join(", ")}, обычного index.ts нет`,
          hint: "index.server.ts дополняет публичный API, а не заменяет его.",
        });
      }
    }
    return diagnostics;
  },
};

const noPublicApiSidestep = {
  name: "no-public-api-sidestep",
  docs: "§6",
  severity: "error",
  description: "Импорт во внутренности чужого слайса в обход index.ts",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || !target.isKnownLayer || !target.slice) continue;
        if (target.crossApiFor) continue; // @x — легальный отдельный публичный API
        if (file.layer === target.layer && file.slice === target.slice) continue; // свой слайс
        if (target.pointsAtSliceRoot) continue;

        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `импорт в обход публичного API: ${dependency.spec}`,
          hint: `Импортируй из «${target.layer}/${target.slice}» — то, что не экспортируется из index.ts, снаружи использовать нельзя.`,
        });
      }
    }
    return diagnostics;
  },
};

const noLayerPublicApi = {
  name: "no-layer-public-api",
  docs: "§6",
  severity: "error",
  description: "index.ts на уровне слоя",
  check(project) {
    const diagnostics = [];
    for (const layer of project.layers.values()) {
      if (layer.sliceless) continue; // у app/shared публичный API живёт на уровне сегмента
      for (const indexFile of layer.indexFiles) {
        diagnostics.push({
          file: `${layer.name}/${indexFile}`,
          message: `публичный API на уровне слоя ${layer.name}`,
          hint: "У слоя публичного API быть не может: он собирает все слайсы в один бандл и ломает изоляцию. Удали файл.",
        });
      }
    }
    return diagnostics;
  },
};

const noSegmentBarrel = {
  name: "no-segment-barrel",
  docs: "§6",
  severity: "error",
  description: "index.ts внутри сегмента или подпапки слайса",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.isIndex || !file.slice) continue;
      const isSliceRoot = file.rel === `${file.sliceRel}/${file.name}`;
      if (isSliceRoot) continue;
      if (file.inCrossApi) continue; // @x/*.ts — это не барель

      diagnostics.push({
        file: file.rel,
        message: "барель внутри слайса",
        hint: "index.ts живёт только в корне слайса. Внутри слайса импортируй файлы напрямую относительным путём — барели замедляют дев-сервер и плодят циклы.",
      });
    }
    return diagnostics;
  },
};

const noExportStar = {
  name: "no-export-star",
  docs: "§6",
  severity: "error",
  description: "export * в публичном API",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.isIndex) continue;
      for (const { line } of matchesWithLines(file.source, /export\s+(?:type\s+)?\*(?:\s+as\s+\w+)?\s+from/g)) {
        diagnostics.push({
          file: file.rel,
          line,
          message: "export * в публичном API",
          hint: "Только явные именованные ре-экспорты: export { Dish } / export type { Dish }. Иначе наружу утекают внутренности, а tree-shaking и авто-импорт ломаются.",
        });
      }
    }
    return diagnostics;
  },
};

/**
 * FSD.md §6, §14: в shared публичный API — на уровне сегмента,
 * а для shared/ui и shared/lib — на уровне каждого компонента/библиотеки.
 */
const sharedPublicApiGranularity = {
  name: "shared-api-granularity",
  docs: "§6",
  severity: "warn",
  description: "Общий барель на весь shared/ui или shared/lib",
  check(project) {
    const shared = project.layers.get("shared");
    if (!shared) return [];

    const diagnostics = [];
    for (const file of project.files) {
      if (file.layer !== "shared" || !file.isIndex) continue;
      const parts = file.rel.split("/");
      const isSegmentRootIndex = parts.length === 3 && (parts[1] === "ui" || parts[1] === "lib");
      if (!isSegmentRootIndex) continue;

      diagnostics.push({
        file: file.rel,
        message: `общий барель на весь shared/${parts[1]}`,
        hint: `Публичный API здесь — на каждый компонент/библиотеку (@/shared/${parts[1]}/button). Общий барель тянет тяжёлые зависимости одного компонента во все страницы.`,
      });
    }
    return diagnostics;
  },
};

const serverIndexUsage = {
  name: "index-server-usage",
  docs: "§6",
  severity: "warn",
  description: "index.server.ts без server-only кода",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.isServerIndex) continue;

      const reexportsClientBits = /['"]\.\/ui\/[^'"]*client[^'"]*['"]/i.test(file.source);
      if (reexportsClientBits) {
        diagnostics.push({
          file: file.rel,
          message: "index.server.ts ре-экспортирует клиентские модули",
          hint: "Environment-specific публичный API нужен ровно для того, чтобы server-only код не утекал в клиентский граф. Клиентское — в обычный index.ts.",
        });
      }

      const importsServerOnly = file.imports.some((dependency) => dependency.spec === "server-only");
      if (!importsServerOnly && !/server-only/.test(file.source)) {
        diagnostics.push({
          file: file.rel,
          message: "index.server.ts не связан с server-only кодом",
          hint: "Заводи его только когда проблема реально возникла: server-only модули (Server Components, доступ к БД) — сюда, всё остальное — в index.ts.",
        });
      }
    }
    return diagnostics;
  },
};

const importFromOwnIndex = {
  name: "no-self-index-import",
  docs: "§6",
  severity: "error",
  description: "Импорт из собственного index.ts",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.slice) continue;
      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal") continue;
        const sameSlice = target.layer === file.layer && target.slice === file.slice;
        if (!sameSlice || !target.pointsAtSliceRoot) continue;
        if (file.isIndex) continue;

        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `импорт из собственного публичного API: ${dependency.spec}`,
          hint: "Классический источник циклических импортов. Внутри слайса импортируй файл напрямую: ../model/queries.",
        });
      }
    }
    return diagnostics;
  },
};

export default [
  slicePublicApi,
  noPublicApiSidestep,
  noLayerPublicApi,
  noSegmentBarrel,
  noExportStar,
  sharedPublicApiGranularity,
  serverIndexUsage,
  importFromOwnIndex,
];
