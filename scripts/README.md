# fsd-check — сборка для Next.js

Проверка архитектуры FSD (правила из [FSD.md](../docs/local/FSD.md)) для проекта на Next.js.
Чистый Node, без зависимостей.

Официальная методология — [fsd.how](https://fsd.how), спецификация 2.1; раскладка под Next.js
описана в [Usage with Next.js](https://fsd.how/docs/guides/tech/with-nextjs).

## Установка

```bash
# из корня Next-проекта
cp -R .../fsd-scripts/next/scripts ./   # scripts/fsd-check.mjs, scripts/fsd.config.mjs, scripts/fsd/
```

```jsonc
// package.json
{
  "scripts": {
    "fsd": "node scripts/fsd-check.mjs",
    "fsd:ci": "node scripts/fsd-check.mjs --json"
  }
}
```

## Ожидаемая структура

Оба конфликтующих слоя переименованы в `_app` и `_pages` — официальная рекомендация доки
(дословно: *«rename both `app` and `pages` FSD layers to `_app` and `_pages`, regardless of which
router you use»*), её же понимает Steiger (FSD.md §3):

```
app/                          # роутер Next.js — ТОЛЬКО тонкие ре-экспорты
├── page.tsx                  # export { MenuPage as default, metadata } from "@/_pages/menu"
├── cart/page.tsx
└── api/orders/route.ts       # export { POST } from "@/_app/api-routes"
middleware.ts                 # только в корне проекта
instrumentation.ts            # только в корне проекта
src/
├── _app/                     # слой app: providers, api-routes, styles, layout
├── _pages/                   # слой pages: вся начинка страниц
├── features/
├── entities/
└── shared/
```

## Запуск

```bash
npm run fsd                        # проверить ./src
node scripts/fsd-check.mjs --no-conventions # только официальная методология
node scripts/fsd-check.mjs --rules          # список правил
node scripts/fsd-check.mjs --json           # отчёт для CI
node scripts/fsd-check.mjs --max-warnings 0 # падать и на предупреждениях
```

Exit code: `1` — есть ошибки, `0` — чисто, `2` — упал сам чекер.

## Что проверяется дополнительно к общим правилам

| Правило | Severity | Что ловит |
| --- | --- | --- |
| `next-prefixed-layers` | error | В `src/` лежат `app/` или `pages/` — конфликт с роутером. Переименуй **оба** слоя в `_app` и `_pages` |
| `next-router-reexport` | error | В файле маршрута — начинка страницы, а не маршрутизация: `'use client'`, вызов хука или разметка сверх одного компонента из `_pages`. `generateMetadata` и тонкий `Page()` разрешены — ре-экспортом функцию метаданных не объявить; `error.tsx` обязан быть клиентским по требованию Next, корневой `layout.tsx` собирает провайдеры, каркасные обёртки из `routerWrappers` (по умолчанию `Suspense`, `ErrorBoundary`) разметкой не считаются. App Router — `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `route.ts` и т.д.; Pages Router — любой модуль в `pages/`, кроме `_document` |
| `next-route-handlers` | warn | Обработчик реализован прямо в `app/api/**` или `pages/api/**`, а не в `_app/api-routes` |
| `next-middleware-location` | error | `middleware.ts` / `instrumentation.ts` попали внутрь `src` — Next.js их там не найдёт |
| `next-server-only-leak` | error | `index.ts` слайса ре-экспортирует модуль с `server-only` → нужен `index.server.ts` (FSD.md §6) |
| `next-use-client-in-index` | warn | `"use client"` в публичном API делает клиентским весь слайс |

В next-сборке **59 правил**: 53 общих плюс 6 перечисленных выше. Полный список —
в [общем README](../../../study/fsd-scripts/README.md#что-проверяется-64-правила) или `node scripts/fsd-check.mjs --rules`.
Карта покрытия FSD.md — [COVERAGE.md](../../../study/fsd-scripts/COVERAGE.md).

## Оба роутера

Дока требует переименовать слои FSD в `_app`/`_pages` **независимо от роутера**, поэтому чекер
понимает и App Router, и Pages Router — и оба сразу, если в проекте они сосуществуют.

| | App Router | Pages Router |
| --- | --- | --- |
| Папка | `app/` | `pages/` |
| Что считается файлом маршрута | канонические имена: `page`, `layout`, `template`, `error`, `loading`, `not-found`, `route`, `default`, `opengraph-image` | любой `.ts`/`.tsx`/`.js`/`.jsx` в папке |
| Исключения | — | `_document` (обязан содержать разметку документа) |
| API | `app/api/**/route.ts` | `pages/api/**` |

Папки ищутся автоматически (`routerDir: "auto"`). Если роутер лежит не в корне проекта или
называется иначе — задай явно: `routerDir: "pages"` или `routerDir: ["app", "pages"]`.

> Файлы внутри `api/` проверяет только `next-route-handlers`; `next-router-reexport` их не трогает,
> чтобы один `route.ts` не получал две почти одинаковые диагностики.

## Пример вывода

```
FSD check · пресет next · корень src · конвенции команды: вкл
30 файлов · 6 слайсов · 1 групп · 5 слоёв · 59 правил

_pages/menu/ui/MenuPage.tsx
  error импорт в обход публичного API: @/entities/category/api/category:3 [no-public-api-sidestep · FSD.md §6]
        → Импортируй из «entities/category» — то, что не экспортируется из index.ts, снаружи использовать нельзя.
  warn  lookup-мапа STATUS_TONE на уровне модуля в компоненте:6 [no-inline-lookup-map · FSD.md §7]
        → Константы и таблицы соответствий — в lib/{topic}.ts того же слайса.

app/page.tsx
  error page.tsx: вызов хука в файле роутера [next-router-reexport · FSD.md §3]
        → В app/ живёт только маршрутизация: тонкий Page(), который рисует один компонент из _pages, плюс generateMetadata.

11 error · 11 warn
```

## Настройка

Всё — в `scripts/fsd.config.mjs` рядом с `scripts/fsd-check.mjs`. Основное:

```js
export default {
  root: "src",
  preset: "next",
  routerDir: "auto",       // папки роутера в корне: найдёт app/ и pages/; можно задать явно
  alias: "@/",
  conventions: true,       // false — выключить правила «[конвенция команды]» (§7, §9, §5.2)
  vendorUiPaths: [],       // сторонний UI-набор (shadcn/ui): ["shared/ui/"] — свои имена и структура файлов
  routerWrappers: ["Suspense", "ErrorBoundary"], // каркасные обёртки в файлах роутера — не «разметка»
  ignore: ["src/legacy/**"],
  rules: { "discouraged-widgets-layer": "off" },
};
```

## CI

Готовый workflow — [`ci-fsd.yml`](ci-fsd.yml), клади в `.github/workflows/`.
