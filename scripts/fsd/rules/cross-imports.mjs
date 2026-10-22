// scripts/fsd/rules/cross-imports.mjs
// Нотация @x — публичный API для cross-import между сущностями (FSD.md §5.3, §6, §13).

const crossApiOnlyInEntities = {
  name: "cross-api-layer",
  docs: "§6",
  severity: "error",
  description: "@x за пределами слоя entities",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.inCrossApi) continue;
      if (file.layer === "entities") continue;
      diagnostics.push({
        file: file.rel,
        message: `@x на слое ${file.layer}`,
        hint: "@x применяется только к entities и по минимуму. На других слоях связь поднимают выше или опускают общее в shared.",
      });
    }

    for (const file of project.files) {
      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || !target.crossApiFor) continue;
        if (target.layer === "entities" && file.layer === "entities") continue;
        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `импорт @x-API вне пары entities: ${dependency.spec}`,
          hint: "Из features/pages сущность импортируется через обычный index.ts, а не через её @x.",
        });
      }
    }

    return diagnostics;
  },
};

/** entities/song/@x/artist.ts — API, предназначенный ровно слайсу entities/artist. */
const crossApiConsumerMatch = {
  name: "cross-api-consumer",
  docs: "§6",
  severity: "error",
  description: "@x-API используется не тем слайсом, для которого объявлен",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" || !target.crossApiFor) continue;
        if (file.layer !== "entities" || !file.slice) continue;
        if (target.crossApiFor === file.slice) continue;

        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `@x-API «${target.slice}/@x/${target.crossApiFor}» импортируется из слайса ${file.slice}`,
          hint: `Файл @x/<имя> — это API для сущности <имя>. Заведи ${target.slice}/@x/${file.slice}.ts, если связь действительно нужна.`,
        });
      }
    }
    return diagnostics;
  },
};

/** Файл @x должен быть тонким ре-экспортом, а не местом, где живёт логика. */
const crossApiReexportOnly = {
  name: "cross-api-reexport-only",
  docs: "§6",
  severity: "warn",
  description: "В @x-файле лежит код, а не ре-экспорт",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.inCrossApi) continue;
      const code = file.source
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("*") && !line.startsWith("/*"));

      const nonReexport = code.filter((line) => !/^export\s+(?:type\s+)?\{/.test(line) && !/from\s+['"]/.test(line));
      if (nonReexport.length > 0) {
        diagnostics.push({
          file: file.rel,
          message: "в @x-файле есть собственный код",
          hint: "@x — только явные ре-экспорты из своего слайса: export type { Song } from \"../model/song\".",
        });
      }
    }
    return diagnostics;
  },
};

const crossApiVolume = {
  name: "cross-api-volume",
  docs: "§13",
  severity: "warn",
  description: "Слишком много @x-связей у одной сущности",
  check(project) {
    const diagnostics = [];
    for (const slice of project.slices) {
      if (slice.layer !== "entities") continue;
      const crossFiles = slice.files.filter((file) => file.inCrossApi);
      if (crossFiles.length < 3) continue;
      diagnostics.push({
        file: slice.rel,
        message: `${crossFiles.length} @x-API у сущности «${slice.name}»`,
        hint: "Сущность, связанная со всеми, — сигнал, что взаимодействие пора поднимать в features/pages, а не размножать cross-import.",
      });
    }
    return diagnostics;
  },
};

/** entities/dish/@x/cart.ts при отсутствии entities/cart — связь ведёт в никуда. */
const crossApiOrphan = {
  name: "cross-api-orphan",
  docs: "§6",
  severity: "warn",
  description: "@x-API объявлен для несуществующей сущности",
  check(project) {
    const entities = project.layers.get("entities");
    if (!entities) return [];

    const known = new Set(entities.slices.map((slice) => slice.name));
    const diagnostics = [];

    for (const file of project.files) {
      if (!file.inCrossApi || !file.crossApiFor) continue;
      if (known.has(file.crossApiFor)) continue;

      diagnostics.push({
        file: file.rel,
        message: `@x-API для «${file.crossApiFor}», такой сущности нет`,
        hint: "Либо потребитель переехал/переименован — удали файл, либо @x заведён «на будущее»: связь без потребителя только притворяется контрактом.",
      });
    }
    return diagnostics;
  },
};

export default [crossApiOnlyInEntities, crossApiConsumerMatch, crossApiReexportOnly, crossApiVolume, crossApiOrphan];
