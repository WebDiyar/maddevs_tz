// scripts/fsd/rules/slice-usage.mjs
// «Не плоди слайсы»: одноразовые и мёртвые слайсы, тест на удаляемость (FSD.md §11, §12, §13, §16).

const insignificantSlice = {
  name: "insignificant-slice",
  docs: "§12",
  severity: "warn",
  description: "Слайс используется только в одном месте",
  check(project) {
    const diagnostics = [];
    for (const slice of project.slices) {
      if (slice.layer === "shared" || slice.layer === project.config.appLayer) continue;
      if (slice.layer === project.config.pagesLayer) continue; // страницу дёргает роутер, а не код
      if (slice.importedBy.size !== 1) continue;

      const [consumer] = [...slice.importedBy];
      diagnostics.push({
        file: slice.rel,
        message: `«${slice.layer}/${slice.name}» используется только в ${consumer}`,
        hint: "Фича/сущность на один экран — это часть страницы. Влей код в слайс потребителя: переезд вниз при появлении второго потребителя дешевле преждевременной абстракции.",
      });
    }
    return diagnostics;
  },
};

const unusedSlice = {
  name: "unused-slice",
  docs: "§13",
  severity: "warn",
  description: "Слайс никто не импортирует",
  check(project) {
    const diagnostics = [];
    for (const slice of project.slices) {
      if (slice.importedBy.size > 0) continue;
      if (slice.layer === project.config.pagesLayer) continue; // страницы подключает роутер
      if (slice.layer === project.config.appLayer) continue;

      diagnostics.push({
        file: slice.rel,
        message: `«${slice.layer}/${slice.name}» не импортируется нигде`,
        hint: "Либо это мёртвый код (удалить), либо слайс подключён в обход алиаса — проверь пути импортов.",
      });
    }
    return diagnostics;
  },
};

/** FSD.md §13: слайс должен удаляться так, чтобы ломались только его явные потребители. */
const wideCoupling = {
  name: "slice-wide-coupling",
  docs: "§13",
  severity: "warn",
  description: "Слайс знает слишком много других слайсов",
  check(project) {
    const limit = 12;
    const diagnostics = [];

    for (const slice of project.slices) {
      const dependencies = new Set();
      for (const file of slice.files) {
        for (const dependency of file.imports) {
          const target = dependency.target;
          if (target.kind !== "internal" || !target.isKnownLayer || !target.slice) continue;
          if (target.layer === slice.layer && target.slice === slice.name) continue;
          dependencies.add(`${target.layer}/${target.slice}`);
        }
      }
      if (dependencies.size <= limit) continue;

      diagnostics.push({
        file: slice.rel,
        message: `«${slice.layer}/${slice.name}» зависит от ${dependencies.size} чужих слайсов`,
        hint: "Высокая связность: удаление или правка такого слайса тянет за собой пол-проекта. Проверь, не размазана ли по нему логика нескольких сценариев.",
      });
    }
    return diagnostics;
  },
};

export default [insignificantSlice, unusedSlice, wideCoupling];
