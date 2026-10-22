// scripts/fsd/rules/segments.mjs
// Сегменты: имена по назначению, папки вместо файлов, направление зависимостей
// (FSD.md §5, §5.1, §5.2, §5.3, §14).

import { BAD_SEGMENT_NAMES, KNOWN_SEGMENTS } from "../config.mjs";
import { hasJsx, stripComments, matchesWithLines } from "./_shared.mjs";

const segmentsByPurpose = {
  name: "segments-by-purpose",
  docs: "§5",
  severity: "error",
  description: "Сегмент назван по сущности содержимого, а не по назначению",
  check(project) {
    const diagnostics = [];

    const report = (rel, name, where) => {
      diagnostics.push({
        file: rel,
        message: `сегмент «${name}» описывает сущность, а не назначение (${where})`,
        hint: "components / hooks / types / utils не помогают искать код. Разложи: отображение → ui, модель домена → model, чистые функции → lib, связь с бэком → api.",
      });
    };

    for (const slice of project.slices) {
      for (const segment of slice.segments) {
        if (BAD_SEGMENT_NAMES.has(segment)) report(`${slice.rel}/${segment}`, segment, "слайс");
      }
      for (const dir of slice.looseDirs) {
        if (BAD_SEGMENT_NAMES.has(dir)) report(`${slice.rel}/${dir}`, dir, "слайс");
      }
    }

    for (const layer of project.layers.values()) {
      if (!layer.sliceless) continue;
      for (const segment of layer.segments) {
        if (BAD_SEGMENT_NAMES.has(segment)) report(`${layer.name}/${segment}`, segment, "слой без слайсов");
      }
    }

    return diagnostics;
  },
};

const noTypesFolder = {
  name: "no-types-folder",
  docs: "§5.3",
  severity: "error",
  description: "Папка shared/types или сегмент types",
  check(project) {
    const diagnostics = [];
    const shared = project.layers.get("shared");
    if (shared?.segments.includes("types")) {
      diagnostics.push({
        file: "shared/types",
        message: "папка shared/types",
        hint: "Прямой запрет доки. DTO — рядом с запросом в api, доменные типы — в model слайса, утилитарные — в shared/lib/utility-types с README.",
      });
    }
    return diagnostics;
  },
};

const noFileSegments = {
  name: "no-file-segments",
  docs: "§5",
  severity: "warn",
  description: "Сегмент оформлен файлом вместо папки",
  check(project) {
    const diagnostics = [];
    for (const slice of project.slices) {
      for (const fileName of slice.rootFiles) {
        const base = fileName.replace(/\.[^.]+$/, "");
        if (base === "index" || base.startsWith("index.")) continue;
        if (!KNOWN_SEGMENTS.has(base)) continue;
        diagnostics.push({
          file: `${slice.rel}/${fileName}`,
          message: `сегмент-файл ${fileName}`,
          hint: `Сегмент — это папка: ${base}/. Файлом он перестаёт расти нормально, и правила сегментов к нему не применяются.`,
        });
      }
    }
    return diagnostics;
  },
};

const noSegmentsOnSlicedLayers = {
  name: "no-segments-on-sliced-layers",
  docs: "§3",
  severity: "error",
  description: "Сегмент лежит прямо в слое, у которого есть слайсы",
  check(project) {
    const diagnostics = [];
    for (const layer of project.layers.values()) {
      if (layer.sliceless) continue;
      for (const slice of layer.slices) {
        if (KNOWN_SEGMENTS.has(slice.shortName) && !slice.group) {
          diagnostics.push({
            file: slice.rel,
            message: `сегмент «${slice.shortName}» прямо в слое ${layer.name}`,
            hint: "На слоях со слайсами сегменты живут внутри слайса. Сегменты прямо в слое бывают только у app и shared.",
          });
        }
      }
      for (const fileName of layer.rootFiles) {
        diagnostics.push({
          file: `${layer.name}/${fileName}`,
          message: `файл прямо в слое ${layer.name}`,
          hint: "Слой состоит из слайсов. Код без слайса найти невозможно — заведи слайс или опусти файл в shared.",
        });
      }
    }
    return diagnostics;
  },
};

const noSegmentlessSlices = {
  name: "no-segmentless-slices",
  docs: "§5",
  severity: "warn",
  description: "Слайс без сегментов",
  check(project) {
    const diagnostics = [];
    for (const slice of project.slices) {
      if (slice.segments.length > 0) continue;
      const meaningfulFiles = slice.rootFiles.filter((name) => !name.startsWith("index."));
      if (meaningfulFiles.length === 0) continue;

      diagnostics.push({
        file: slice.rel,
        message: `слайс «${slice.name}» без сегментов (${meaningfulFiles.length} файлов лежат россыпью)`,
        hint: "Разложи по назначению: ui / api / model / lib. Без сегментов линтер не видит ни направления зависимостей, ни толщины компонентов.",
      });
    }
    return diagnostics;
  },
};

const noUiInApp = {
  name: "no-ui-in-app",
  docs: "§3",
  severity: "warn",
  description: "Сегмент ui в слое app",
  check(project) {
    const appLayer = project.layers.get(project.config.appLayer);
    if (!appLayer?.segments.includes("ui")) return [];
    return [
      {
        file: `${project.config.appLayer}/ui`,
        message: `сегмент ui в слое ${project.config.appLayer}`,
        hint: "app отвечает за инициализацию: providers, routes, store, styles, entrypoint, layout. Визуальные примитивы и layout-компоненты — в shared/ui.",
      },
    ];
  },
};

/** FSD.md §5.2, §7: model — «мозг» слайса без JSX, lib — чистые функции без React-стейта. */
const segmentDependencies = {
  name: "segment-dependencies",
  docs: "§5.2",
  severity: "warn",
  convention: true,
  description: "JSX в model или React-стейт в lib",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.segment) continue;
      const isTsx = file.ext === ".tsx" || file.ext === ".jsx";

      if (file.segment === "model" && isTsx && hasJsx(file.source)) {
        diagnostics.push({
          file: file.rel,
          message: "JSX в сегменте model",
          hint: "model — данные, схемы, сторы и бизнес-логика. Разметка живёт в ui того же слайса.",
        });
      }

      if (file.segment === "lib") {
        const stateHooks = matchesWithLines(stripComments(file.source), /\buse(?:State|Reducer|Effect|Context|Store)\s*\(/g);
        if (stateHooks.length > 0) {
          diagnostics.push({
            file: file.rel,
            line: stateHooks[0].line,
            message: "React-стейт в сегменте lib",
            hint: "lib — чистые функции, константы и мини-библиотеки. Хук со стейтом — это model.",
          });
        }
      }

      if (file.segment === "ui") {
        const fetches = matchesWithLines(stripComments(file.source), /\bfetch\s*\(|\baxios\.(?:get|post|put|patch|delete)\s*\(/g);
        if (fetches.length > 0) {
          diagnostics.push({
            file: file.rel,
            line: fetches[0].line,
            message: "запрос к бэкенду прямо в ui",
            hint: "Связь с внешним миром — сегмент api, оркестрация — model. В ui приходят готовые данные.",
          });
        }
      }
    }
    return diagnostics;
  },
};


/** FSD.md §5.1: внутрь слайса вкладываются только сегменты и папки внутри них — слои нельзя. */
const noNestedLayers = {
  name: "no-nested-layers",
  docs: "§5.1",
  severity: "error",
  description: "Папка-слой внутри слайса",
  check(project) {
    const layerNames = new Set(project.config.layers);
    const reported = new Set();
    const diagnostics = [];

    for (const file of project.files) {
      if (!file.sliceRel) continue;
      const tail = file.rel.slice(file.sliceRel.length + 1).split("/").slice(0, -1);
      const nested = tail.find((part) => layerNames.has(part));
      if (!nested) continue;

      const key = `${file.sliceRel}/${nested}`;
      if (reported.has(key)) continue;
      reported.add(key);

      diagnostics.push({
        file: key,
        message: `слой «${nested}» вложен внутрь слайса`,
        hint: "Вложенных слоёв в FSD нет: такое предлагали, но в стандарт не приняли. Внутри слайса живут только сегменты (ui/api/model/lib) и папки внутри них.",
      });
    }
    return diagnostics;
  },
};

/**
 * FSD.md §5.2: api и lib читают из model ТОЛЬКО типы домена —
 * это единственное разрешённое обращение к model снизу, без хуков, схем и сторов.
 */
const segmentTypeImports = {
  name: "segment-type-imports",
  docs: "§5.2",
  severity: "warn",
  convention: true,
  description: "api или lib импортирует из model значение, а не тип",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "api" && file.segment !== "lib") continue;

      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || target.segment !== "model") continue;
        if (target.layer !== file.layer || target.slice !== file.slice) continue;
        if (dependency.typeOnly) continue;

        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `${file.segment} тянет из model значение: ${dependency.spec}`,
          hint: "Снизу из model берут только типы: import type { Dish } from \"../model/types\". Хуки, схемы и сторы читаются сверху — из ui и model.",
        });
      }
    }
    return diagnostics;
  },
};

/** FSD.md §5.3: DTO — это форма ответа бэка, живёт рядом с функцией запроса, в сегменте api. */
const dtoLocation = {
  name: "dto-location",
  docs: "§5.3",
  severity: "warn",
  description: "DTO объявлен вне сегмента api",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.segment || file.segment === "api") continue;
      if (file.layer === "shared" && file.segment === "api") continue;

      const declarations = matchesWithLines(
        stripComments(file.source),
        /(?:interface|type)\s+([A-Za-z0-9_]*(?:Dto|DTO))\b/g,
      );
      if (declarations.length === 0) continue;

      diagnostics.push({
        file: file.rel,
        line: declarations[0].line,
        message: `DTO «${declarations[0].match[1]}» в сегменте ${file.segment}`,
        hint: "DTO без запроса не имеет смысла: держи его рядом с функцией запроса в api, там же маппер DTO → доменная модель.",
      });
    }
    return diagnostics;
  },
};

export default [
  segmentsByPurpose,
  noTypesFolder,
  noFileSegments,
  noSegmentsOnSlicedLayers,
  noSegmentlessSlices,
  noUiInApp,
  segmentDependencies,
  noNestedLayers,
  segmentTypeImports,
  dtoLocation,
];
