// scripts/fsd/rules/next.mjs
// Правила стыка FSD и Next.js (FSD.md §3 «Next.js», §6 «index.server.ts»).
// В react-версии чекера этого файла нет — там лежит rules/react.mjs.

import fs from "node:fs";
import path from "node:path";

const ROUTE_FILES = new Set([
  "page.tsx",
  "page.ts",
  "layout.tsx",
  "layout.ts",
  "template.tsx",
  "error.tsx",
  "loading.tsx",
  "not-found.tsx",
  "route.ts",
  "route.tsx",
  "default.tsx",
  "opengraph-image.tsx",
]);

const ROUTE_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

/**
 * У Pages Router нет канонических имён: маршрутом является любой модуль в папке,
 * поэтому там фильтруем по расширению, а не по имени. `_document` пропускаем —
 * он обязан содержать разметку документа и ре-экспортом быть не может.
 */
function isRouteFile(name, kind) {
  if (kind === "pages-router") {
    if (!ROUTE_EXTENSIONS.has(path.extname(name))) return false;
    const base = path.basename(name, path.extname(name));
    return base !== "_document";
  }
  return ROUTE_FILES.has(name);
}

function collectRouterFiles(dirAbs, kind = "app-router", acc = []) {
  if (!fs.existsSync(dirAbs)) return acc;
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      // api/ разбирает отдельное правило next-route-handlers — иначе route.ts
      // получал бы две почти одинаковые диагностики от двух правил сразу
      if (entry.name === "api") continue;
      collectRouterFiles(abs, kind, acc);
    } else if (isRouteFile(entry.name, kind)) {
      acc.push(abs);
    }
  }
  return acc;
}

/** Папки роутера из конфига; на старых конфигах со строковым routerDir — она одна. */
function routerDirsOf(project) {
  if (Array.isArray(project.config.routerDirs)) return project.config.routerDirs;
  const dir = project.config.routerDir ?? "app";
  return [{ dir, abs: path.join(project.config.cwd, dir), kind: path.basename(dir) === "pages" ? "pages-router" : "app-router" }];
}

/** Оба конфликтующих слоя переименованы в _app и _pages (официальная рекомендация). */
const prefixedLayers = {
  name: "next-prefixed-layers",
  docs: "§3",
  severity: "error",
  description: "Слои app/pages не переименованы в _app/_pages",
  check(project) {
    const diagnostics = [];
    for (const name of ["app", "pages"]) {
      const abs = path.join(project.config.rootAbs, name);
      if (!fs.existsSync(abs)) continue;
      diagnostics.push({
        file: `${project.config.root}/${name}`,
        message: `слой «${name}» конфликтует с роутером Next.js`,
        hint: `Переименуй ОБА слоя FSD в _app и _pages — независимо от того, какой роутер используешь. Префикс понимает и Steiger, и этот чекер.`,
      });
    }
    return diagnostics;
  },
};

/** Файлы роутера — тонкие ре-экспорты, вся начинка страницы лежит в слайсе _pages. */
const routerReexportOnly = {
  name: "next-router-reexport",
  docs: "§3",
  severity: "error",
  description: "В файле роутера Next.js лежит код страницы",
  check(project) {
    const diagnostics = [];

    for (const router of routerDirsOf(project)) {
      for (const abs of collectRouterFiles(router.abs, router.kind)) {
      const rel = path.relative(project.config.cwd, abs).split(path.sep).join("/");
      const source = fs.readFileSync(abs, "utf8");
      const meaningful = source
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*"))
        // "use client" / "use server" в файле роутера — это директива, а не код страницы:
        // error.tsx и global-error.tsx обязаны быть клиентскими даже будучи чистым ре-экспортом.
        .filter((line) => !/^["']use (client|server)["'];?$/.test(line));

      const onlyReexports = meaningful.every((line) => /^export\s+.*from\s+['"]/.test(line) || /^import\s+.*from\s+['"]/.test(line));
      if (onlyReexports) continue;

      // Голый `export … from` годится не всегда: страница с локализованным
      // заголовком обязана экспортировать generateMetadata, а он функция, и
      // ре-экспортом его не сделать. Поэтому ловим не «есть ли код», а то,
      // ради чего правило заведено: начинку страницы в папке роутера.
      const fileName = path.basename(abs);
      // Next сам требует, чтобы error.tsx и global-error.tsx были клиентскими.
      const clientRequired = fileName === "error.tsx" || fileName === "global-error.tsx";
      // Корневой layout для того и нужен, чтобы собрать провайдеры и оболочку
      // приложения — композиция здесь не «начинка страницы» (FSD.md §3).
      const composesLayout = fileName === "layout.tsx" || fileName === "_app.tsx";

      const isClient = !clientRequired && /^\s*['"]use client['"]/m.test(source);
      const callsHook = /\buse[A-Z]\w*\s*\(/.test(source);
      // Отрицательный просмотр назад отсекает дженерики: в `Promise<Metadata>`
      // угловая скобка идёт сразу за буквой. Исключать ещё и `>` нельзя —
      // это соседние теги `<main><Header />`, и второй тег терялся.
      const tags = new Set([...source.matchAll(/(?<!\w)<([A-Z][\w.]*)/g)].map((m) => m[1]));
      // Каркасные обёртки — требование фреймворка, а не разметка: без Suspense
      // страница с useSearchParams не соберётся.
      const wrappers = new Set(project.config.routerWrappers ?? []);
      const contentTags = [...tags].filter((tag) => !wrappers.has(tag));

      const reason = isClient
        ? "'use client' в файле роутера"
        : callsHook
          ? "вызов хука в файле роутера"
          : !composesLayout && contentTags.length > 1
            ? `разметка в файле роутера: ${contentTags.join(", ")}`
            : null;
      if (!reason) continue;

      diagnostics.push({
        file: rel,
        severity: "error",
        message: `${fileName}: ${reason}`,
        hint:
          router.kind === "pages-router"
            ? 'В pages/ живёт только маршрутизация: тонкий Page(), который рисует один компонент из _pages.'
            : 'В app/ живёт только маршрутизация: тонкий Page(), который рисует один компонент из _pages, плюс generateMetadata. Стейт, запросы и разметка — в слайсе _pages.',
      });
      }
    }

    return diagnostics;
  },
};

/** Route Handlers реализуются в слое _app (сегмент api-routes), в app/api остаётся ре-экспорт. */
const routeHandlersInApp = {
  name: "next-route-handlers",
  docs: "§3",
  severity: "warn",
  description: "Реализация API-роута лежит в папке роутера",
  check(project) {
    const diagnostics = [];

    for (const router of routerDirsOf(project)) {
      const apiAbs = path.join(router.abs, "api");
      // в app/api маршрут — это route.ts, в pages/api маршрутом является любой модуль
      const files = collectRouterFiles(apiAbs, router.kind === "pages-router" ? "pages-router" : "app-router");

      for (const abs of files) {
        const rel = path.relative(project.config.cwd, abs).split(path.sep).join("/");
        const source = fs.readFileSync(abs, "utf8");
        if (source.split("\n").filter((line) => line.trim().length > 0).length <= 3) continue;

        diagnostics.push({
          file: rel,
          message:
            router.kind === "pages-router"
              ? "API-роут реализован прямо в папке роутера"
              : "Route Handler реализован прямо в папке роутера",
          hint: "Обработчик — в _app/api-routes/, здесь только export { POST } from \"@/_app/api-routes\". Много эндпоинтов — выноси в отдельный пакет монорепы.",
        });
      }
    }
    return diagnostics;
  },
};

const middlewareLocation = {
  name: "next-middleware-location",
  docs: "§3",
  severity: "error",
  description: "middleware.ts / instrumentation.ts лежат внутри src",
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!/^(middleware|instrumentation)\.(ts|js)$/.test(file.name)) continue;
      diagnostics.push({
        file: file.rel,
        message: `${file.name} внутри FSD-корня`,
        hint: "Next.js ищет эти файлы только в корне проекта, рядом с папкой роутера. Логику можно держать в _app и ре-экспортировать.",
      });
    }
    return diagnostics;
  },
};

/** server-only модуль, торчащий из обычного index.ts, ломает клиентский граф (FSD.md §6). */
const serverOnlyLeak = {
  name: "next-server-only-leak",
  docs: "§6",
  severity: "error",
  description: "server-only код экспортируется из обычного index.ts",
  check(project) {
    const serverFiles = new Set(
      project.files.filter((file) => /['"]server-only['"]/.test(file.source)).map((file) => file.rel),
    );
    if (serverFiles.size === 0) return [];

    const diagnostics = [];
    for (const file of project.files) {
      if (!file.isIndex || file.isServerIndex || !file.slice) continue;

      for (const dependency of file.imports) {
        const target = dependency.target;
        if (target.kind !== "internal" && dependency.target.kind !== "outside-root") {
          if (dependency.spec === "server-only") {
            diagnostics.push({
              file: file.rel,
              line: dependency.line,
              message: "server-only прямо в публичном API слайса",
              hint: "Такой index.ts утащит server-only в любой клиентский компонент, который импортирует слайс. Вынеси в index.server.ts.",
            });
          }
          continue;
        }
        if (target.kind !== "internal") continue;
        const resolved = [...serverFiles].find((rel) => rel.startsWith(`${target.path}.`) || rel === target.path);
        if (!resolved) continue;

        diagnostics.push({
          file: file.rel,
          line: dependency.line,
          message: `index.ts ре-экспортирует server-only модуль (${resolved})`,
          hint: "Добавь рядом index.server.ts и отдай оттуда Server Components и функции доступа к данным.",
        });
      }
    }
    return diagnostics;
  },
};

const useClientInPublicApi = {
  name: "next-use-client-in-index",
  docs: "§6",
  severity: "warn",
  description: '"use client" в публичном API слайса',
  check(project) {
    const diagnostics = [];
    for (const file of project.files) {
      if (!file.isIndex) continue;
      if (!/^\s*["']use client["']/m.test(file.source)) continue;

      diagnostics.push({
        file: file.rel,
        message: '"use client" в index.ts',
        hint: "Директива на публичном API делает клиентским весь слайс целиком. Помечай конкретные компоненты в ui/, а не вход в слайс.",
      });
    }
    return diagnostics;
  },
};

export default [
  prefixedLayers,
  routerReexportOnly,
  routeHandlersInApp,
  middlewareLocation,
  serverOnlyLeak,
  useClientInPublicApi,
];
