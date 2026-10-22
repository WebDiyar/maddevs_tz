// scripts/fsd/rules/slice-groups.mjs
// Группы слайсов и гибриды «слайс + группа» (FSD.md §4.1, §4.2, §12).

const groupHasCode = {
  name: "group-has-code",
  docs: "§4.1",
  severity: "error",
  description: "Общий код внутри группы слайсов",
  check(project) {
    const diagnostics = [];
    for (const group of project.groups) {
      for (const fileName of group.rootFiles) {
        diagnostics.push({
          file: `${group.rel}/${fileName}`,
          message: `код в группе слайсов «${group.name}»`,
          hint: "Группа — чисто навигационная папка: ни сегментов, ни index.ts, ни общего кода. Общее — вниз (shared/entities) либо группа схлопывается в один слайс.",
        });
      }
      for (const indexFile of group.indexFiles) {
        diagnostics.push({
          file: `${group.rel}/${indexFile}`,
          message: `публичный API у группы слайсов «${group.name}»`,
          hint: "У группы не может быть публичного API — наружу адресуются вложенные слайсы поимённо (@/pages/order/list).",
        });
      }
    }
    return diagnostics;
  },
};

/**
 * FSD.md §4.2: папка с собственным index.ts/сегментами И вложенными слайсами —
 * два входа наружу, протекающая изоляция и слепой линтер. Чинится в одну из двух сторон.
 */
const hybridSliceGroup = {
  name: "hybrid-slice-group",
  docs: "§4.2",
  severity: "error",
  description: "Папка одновременно слайс и группа",
  check(project) {
    const diagnostics = [];
    for (const slice of project.slices) {
      if (slice.hybridChildren.length === 0) continue;
      diagnostics.push({
        file: slice.rel,
        message: `гибрид слайс+группа: «${slice.name}» имеет свой API и вложенные слайсы (${slice.hybridChildren.join(", ")})`,
        hint: "Выбери одно: раздать подпапкам index.ts и убрать код из корня (станет группой) — или разложить подпапки по сегментам корня (станет слайсом).",
      });
    }
    return diagnostics;
  },
};

const tinyGroup = {
  name: "insignificant-group",
  docs: "§4.1",
  severity: "warn",
  description: "Группа из слишком малого числа слайсов",
  check(project) {
    const min = project.config.thresholds.sliceGroupMinSlices;
    const diagnostics = [];
    for (const group of project.groups) {
      const nested = project.slices.filter((slice) => slice.group === group.name).length;
      if (nested >= min || nested === 0) continue;
      diagnostics.push({
        file: group.rel,
        message: `группа «${group.name}» из ${nested} слайс(ов)`,
        hint: `Группа оправдана, когда слайсов реально много и критерий очевиден с первого взгляда. Порог настраивается: thresholds.sliceGroupMinSlices (сейчас ${min}).`,
      });
    }
    return diagnostics;
  },
};

const excessiveSlicing = {
  name: "excessive-slicing",
  docs: "§12",
  severity: "warn",
  description: "Слишком много слайсов в слое",
  check(project) {
    const max = project.config.thresholds.maxSlicesPerLayer;
    const diagnostics = [];
    for (const layer of project.layers.values()) {
      const ungrouped = layer.slices.filter((slice) => !slice.group);
      if (ungrouped.length <= max) continue;
      diagnostics.push({
        file: layer.name,
        message: `${ungrouped.length} слайсов в слое ${layer.name} без группировки`,
        hint: `Слой — глобальный неймспейс: важное тонет в мелочи. Слей родственные слайсы или сгруппируй их в папки. Порог: thresholds.maxSlicesPerLayer (сейчас ${max}).`,
      });
    }
    return diagnostics;
  },
};

export default [groupHasCode, hybridSliceGroup, tinyGroup, excessiveSlicing];
