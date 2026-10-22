// scripts/fsd/rules/naming.mjs
// Конвенции именования команды (FSD.md §9). Отключаются через conventions: false.

import { isKebabCase, isPascalCase, isVendorUi, hasJsx } from "./_shared.mjs";

const sliceNaming = {
  name: "slice-naming",
  docs: "§9",
  severity: "warn",
  convention: true,
  description: "Имя слайса не в kebab-case или названо по типу кода",
  check(project) {
    const typeLikeNames = new Set(["models", "components", "hooks", "utils", "helpers", "types", "store", "stores", "api"]);
    const diagnostics = [];

    for (const slice of project.slices) {
      if (!isKebabCase(slice.shortName)) {
        diagnostics.push({
          file: slice.rel,
          message: `имя слайса «${slice.shortName}» не в kebab-case`,
          hint: "Слайсы называются по домену/сценарию в kebab-case: add-to-cart, order-list, user.",
        });
      }
      if (typeLikeNames.has(slice.shortName)) {
        diagnostics.push({
          file: slice.rel,
          message: `слайс назван по типу кода: «${slice.shortName}»`,
          hint: "Имя слайса = домен или сценарий, а не тип содержимого.",
        });
      }
    }
    return diagnostics;
  },
};

const componentNaming = {
  name: "component-naming",
  docs: "§9",
  severity: "warn",
  convention: true,
  description: "Файл компонента назван не в PascalCase",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "ui") continue;
      if (file.ext !== ".tsx" && file.ext !== ".jsx") continue;
      if (file.isIndex) continue;
      if (!hasJsx(file.source)) continue;
      if (isPascalCase(file.basename)) continue;
      // JSX в файле ещё не делает файл компонентом: строитель колонок таблицы
      // возвращает описание столбцов, у которых ячейка — разметка.
      if (!/^export\s+(?:default\s+)?(?:const|function)\s+[A-Z]/m.test(file.source)) continue;
      // Сторонние наборы приходят со своим соглашением об именах.
      if (isVendorUi(project, file)) continue;

      diagnostics.push({
        file: file.rel,
        message: `компонент в файле «${file.name}»`,
        hint: "Компоненты — PascalCase (DishCard.tsx). Так файл видно в дереве и он совпадает с именем экспорта.",
      });
    }
    return diagnostics;
  },
};

const hookNaming = {
  name: "hook-naming",
  docs: "§9",
  severity: "warn",
  convention: true,
  description: "Хук объявлен без префикса use",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "model" && file.segment !== "lib") continue;
      const source = file.source;
      const declarations = source.matchAll(/export\s+(?:async\s+)?(?:function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=)/g);

      for (const declaration of declarations) {
        const name = declaration[1] ?? declaration[2];
        if (!name || name.startsWith("use")) continue;
        const body = source.slice(declaration.index, declaration.index + 600);
        if (!/\buse(?:State|Effect|Query|Mutation|Memo|Callback|Context|Store)\s*\(/.test(body)) continue;

        diagnostics.push({
          file: file.rel,
          message: `функция «${name}» использует хуки, но названа не как хук`,
          hint: "Всё, что вызывает React-хуки, само является хуком: useXxx. Иначе правила хуков не проверяются линтером React.",
        });
      }
    }
    return diagnostics;
  },
};

const queryNaming = {
  name: "query-naming",
  docs: "§9",
  severity: "warn",
  convention: true,
  description: "Хуки запросов и ключи кэша названы вразнобой",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (file.segment !== "model") continue;
      if (!/useQuery\s*\(|useMutation\s*\(|useSuspenseQuery\s*\(/.test(file.source)) continue;

      const exported = [...file.source.matchAll(/export\s+(?:function\s+|const\s+)(use[A-Za-z0-9_]*)/g)].map((match) => match[1]);
      for (const name of exported) {
        const ok = /Query$|ListQuery$|Mutation$|Queries$/.test(name);
        if (ok) continue;
        diagnostics.push({
          file: file.rel,
          message: `хук данных «${name}» без суффикса Query/Mutation`,
          hint: "Договорённость: useXxxQuery / useXxxListQuery / useXxxMutation. По имени сразу видно, что это обращение к кэш-слою.",
        });
      }
    }
    return diagnostics;
  },
};

const httpFunctionNaming = {
  name: "http-function-naming",
  docs: "§9",
  severity: "warn",
  convention: true,
  description: "HTTP-функция в api названа не глаголом",
  check(project) {
    const allowed = /^(?:fetch|get|list|create|update|patch|delete|remove|upload|search|assign|adapt|to)[A-Z]/;
    const diagnostics = [];

    for (const file of project.files) {
      if (file.segment !== "api" || file.isIndex) continue;
      // shared/api — это клиент и инфраструктура (request, api, http), а не доменные запросы.
      if (file.layer === "shared") continue;
      const exported = [...file.source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)].map((match) => match[1]);

      for (const name of exported) {
        if (allowed.test(name)) continue;
        diagnostics.push({
          file: file.rel,
          message: `функция «${name}» в сегменте api`,
          hint: "Имена запросов — глаголом: fetchDishes / createOrder / updateDish / deleteDish. Мапперы — adaptXxxDTO / toXxx.",
        });
      }
    }
    return diagnostics;
  },
};

export default [sliceNaming, componentNaming, hookNaming, queryNaming, httpFunctionNaming];
