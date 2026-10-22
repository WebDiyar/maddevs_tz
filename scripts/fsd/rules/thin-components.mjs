// scripts/fsd/rules/thin-components.mjs
// «Тонкий компонент» — конвенция команды поверх FSD (FSD.md §7).
// Отключается целиком через conventions: false в конфиге.

import { hasComponent, hasJsx, isVendorUi, matchesWithLines, stripComments } from "./_shared.mjs";

const componentSize = {
  name: "component-file-size",
  docs: "§7",
  severity: "error",
  convention: true,
  description: "Файл компонента больше допустимого размера",
  check(project) {
    const { componentWarnLines, componentErrorLines } = project.config.thresholds;
    const diagnostics = [];

    for (const file of project.files) {
      if (file.ext !== ".tsx" && file.ext !== ".jsx" && file.ext !== ".vue" && file.ext !== ".svelte") continue;
      if (file.lines <= componentWarnLines) continue;

      const tooBig = file.lines > componentErrorLines;
      diagnostics.push({
        file: file.rel,
        severity: tooBig ? "error" : "warn",
        message: `${file.lines} строк в компоненте`,
        hint: tooBig
          ? `Больше ${componentErrorLines} строк — запрещено. Стейт и оркестрацию в model/use*.ts, чистые функции и мапы в lib/, под-компоненты в ui/components/.`
          : `Мягкий триггер (${componentWarnLines}). Посмотри, чего в файле больше — разметки или логики.`,
      });
    }
    return diagnostics;
  },
};

const inlineLookupMap = {
  name: "no-inline-lookup-map",
  docs: "§7",
  severity: "warn",
  convention: true,
  description: "Константа-мапа на уровне модуля в файле компонента",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "ui") continue;
      if (file.ext !== ".tsx" && file.ext !== ".jsx") continue;

      const source = stripComments(file.source);
      // Таблица с разметкой внутри (иконки, бейджи) — это UI, а не константа:
      // в lib она не переедет, там JSX не место.
      if (/icon:\s*</.test(source)) continue;
      const maps = matchesWithLines(source, /^const\s+([A-Z][A-Z0-9_]+)\s*(?::\s*Record<[^=]+)?=\s*[[{]/gm);
      for (const { match, line } of maps) {
        diagnostics.push({
          file: file.rel,
          line,
          message: `lookup-мапа ${match[1]} на уровне модуля в компоненте`,
          hint: "Константы и таблицы соответствий — в lib/{topic}.ts того же слайса. В компоненте остаётся разметка.",
        });
      }
    }
    return diagnostics;
  },
};

const moduleLevelHelper = {
  name: "no-helper-in-component",
  docs: "§7",
  severity: "warn",
  convention: true,
  description: "Чистая функция-хелпер объявлена в файле компонента",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "ui") continue;
      if (file.ext !== ".tsx" && file.ext !== ".jsx") continue;

      const source = stripComments(file.source);
      // «В файле компонента» — значит компонент в файле должен быть. Отдельный
      // файл-строитель (xColumns.tsx: одна функция и ни одного компонента) —
      // это и есть вынесенный помощник, ругаться на него не за что.
      if (!hasComponent(source)) continue;
      const helpers = matchesWithLines(source, /^(?:export\s+)?function\s+([a-z][A-Za-z0-9]*)\s*\(/gm);
      for (const { match, line } of helpers) {
        if (match[1].startsWith("use")) continue; // хук в ui — тоже сомнительно, но это другое правило
        diagnostics.push({
          file: file.rel,
          line,
          message: `функция ${match[1]}() в файле компонента`,
          hint: "Чистые функции (builder, formatter, mapper) — в lib/ того же слайса; там их можно переиспользовать и тестировать без рендера.",
        });
      }
    }
    return diagnostics;
  },
};

const subComponentsInOneFile = {
  name: "no-multiple-components-per-file",
  docs: "§7",
  severity: "warn",
  convention: true,
  description: "Несколько экспортируемых компонентов в одном файле",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "ui" || (file.ext !== ".tsx" && file.ext !== ".jsx")) continue;
      if (!hasJsx(file.source)) continue;

      const source = stripComments(file.source);
      // Обёртки над библиотекой примитивов (shadcn поверх Radix) приходят
      // набором: DropdownMenu, ...Trigger, ...Content — это один компонент из
      // пятнадцати частей, и разносить его значит ломать обновления сверху.
      // Какие пути такие — знает проект, а не движок (vendorUiPaths).
      if (isVendorUi(project, file)) continue;
      // Компонент — это функция. Прежняя регулярка ловила любую константу с
      // большой буквы, и `const RADIUS = 70` объявлялся «вторым компонентом».
      const components = matchesWithLines(
        source,
        /^(?:export\s+)?(?:function\s+([A-Z][A-Za-z0-9]*)|const\s+([A-Z][A-Za-z0-9]*)\s*(?::[^=]+)?=\s*(?:\(|function\b|memo\b|React\.memo|forwardRef))/gm,
      );
      if (components.length <= 1) continue;

      const names = components.map(({ match }) => match[1] ?? match[2]);
      diagnostics.push({
        file: file.rel,
        line: components[1].line,
        message: `${components.length} компонентов в одном файле: ${names.join(", ")}`,
        hint: "Под-компоненты выносятся в ui/components/{SubName}.tsx — иначе файл растёт, а переиспользовать блок нельзя.",
      });
    }
    return diagnostics;
  },
};

const hooksInComponent = {
  name: "too-many-hooks-in-component",
  docs: "§7",
  severity: "warn",
  convention: true,
  description: "Логики состояния в компоненте больше, чем разметки",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "ui" || (file.ext !== ".tsx" && file.ext !== ".jsx")) continue;

      const source = stripComments(file.source);
      const stateHooks = matchesWithLines(source, /\buse(?:State|Reducer|Effect|LayoutEffect|Memo|Callback|Ref)\s*\(/g);
      if (stateHooks.length < 6) continue;

      diagnostics.push({
        file: file.rel,
        line: stateHooks[0].line,
        message: `${stateHooks.length} стейт-хуков в компоненте`,
        hint: "Собери их в один хук model/use{Name}.ts, возвращающий { state, options, handlers, query } — компонент станет композером.",
      });
    }
    return diagnostics;
  },
};

export default [componentSize, inlineLookupMap, moduleLevelHelper, subComponentsInOneFile, hooksInComponent];
