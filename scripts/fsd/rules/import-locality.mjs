// scripts/fsd/rules/import-locality.mjs
// Внутри слайса — относительные импорты, между слайсами — абсолютные (FSD.md §6, §9).

const relativeInsideSlice = {
  name: "import-locality",
  docs: "§6",
  severity: "error",
  description: "Абсолютный алиас на собственный слайс вместо относительного пути",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.slice) continue;
      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || target.style !== "absolute") continue;
        if (target.layer !== file.layer || target.slice !== file.slice) continue;

        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `свой слайс через алиас: ${dependency.spec}`,
          hint: "Внутри слайса импортируй относительным путём (../model/queries): так слайс остаётся переносимым, а импорт не идёт через собственный index.ts.",
        });
      }
    }
    return diagnostics;
  },
};

const absoluteAcrossSlices = {
  name: "no-relative-cross-slice",
  docs: "§6",
  severity: "error",
  description: "Относительный путь в чужой слайс или слой",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || target.style !== "relative") continue;
        if (!target.isKnownLayer) continue;

        const sameLayer = target.layer === file.layer;
        const sameSlice = sameLayer && target.slice === file.slice;
        const slicelessSameLayer = sameLayer && !file.slice && !target.slice;
        if (sameSlice || slicelessSameLayer) continue;

        // Внутри app/shared сегменты соседствуют — относительный путь между ними допустим.
        if (sameLayer && (file.layer === project.config.appLayer || file.layer === "shared")) continue;

        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `относительный путь наружу слайса: ${dependency.spec}`,
          hint: `Чужой слайс адресуется абсолютно и только через публичный API: ${project.config.alias}${target.layer}${target.slice ? `/${target.slice}` : ""}.`,
        });
      }
    }
    return diagnostics;
  },
};

const outsideRootImport = {
  name: "no-import-outside-root",
  docs: "§3",
  severity: "warn",
  description: "Относительный импорт, уходящий выше корня FSD",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      for (const dependency of file.imports) {
        if (dependency.target.kind !== "outside-root") continue;
        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `импорт за пределы src: ${dependency.spec}`,
          hint: "Код вне корня FSD не покрыт правилами слоёв. Либо перенеси модуль внутрь shared, либо оформи как отдельный пакет монорепы.",
        });
      }
    }
    return diagnostics;
  },
};

export default [relativeInsideSlice, absoluteAcrossSlices, outsideRootImport];
