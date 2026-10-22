@AGENTS.md

# Бронирование переговорной — правила проекта

Тестовое задание Frontend Engineer (Mad Devs). Исходное ТЗ — [docs/ТЗ Frontend Engineer.pdf](docs/ТЗ%20Frontend%20Engineer.pdf).
Этот файл — рабочая копия ТЗ + карта кода: **каждый пункт ТЗ → где реализован → как проверить**.
Любая правка не должна ломать ни один пункт из §1–§3.

**Стек:** Next.js 16.4 (App Router, Route Handlers) · React 19 · TypeScript strict · Tailwind CSS 4 (PostCSS) ·
shadcn/ui (radix-nova) · TanStack Query 5 · axios · zod 4 · react-hook-form · zustand · date-fns ·
sonner · lucide-react · next-intl (RU основной + EN) · vitest · Playwright. Архитектура — FSD (`docs/local/FSD.md`, локально).

## 0. Карта

```
app/                              роутер Next — ТОЛЬКО ре-экспорты
├── layout.tsx                    → @/_app/layout
├── page.tsx                      → @/_pages/booking
├── about/page.tsx                → @/_pages/about (документация «Как это работает»)
└── api/bookings/[id]/route.ts    → @/_app/api-routes (mock API)
src/
├── _app/
│   ├── layout/                   RootLayout, SiteHeader (навигация + LocaleSwitch RU/EN, nav.config.ts),
│   │                             AppProviders (NextIntlClientProvider, QueryClient, тема, Toaster), metadata
│   ├── api-routes/               mock-бэкенд: обработчики, in-memory store, формат ошибок, i18n/ (тексты ответов)
│   ├── i18n/                     header-тексты + сборка MESSAGES из слайсов, типы AppConfig (next-intl.d.ts)
│   └── styles/globals.css        токены темы shadcn (:root / .dark)
├── _pages/about/                 документация для проверяющего: ТЗ, ответы рекрутера, решения (текст — `_pages/about/i18n/*.json`)
├── _pages/booking/               экран бронирования
│   ├── ui/BookingPage.tsx        композер: шапка → DateNav → зона данных → диалоги
│   ├── ui/components/*           DateNav, DatePicker, DaySchedule, BookingBlock, BookingForm(+Dialog), DeleteBookingDialog, TimeSelect
│   ├── model/                    zustand-стор страницы, хуки формы/дня/удаления, zod-схема формы
│   └── lib/                      расчёт сетки слотов, доступных времён, форматирование дат
├── entities/booking/             домен «бронь»
│   ├── api/bookingApi.ts         zod-схемы Booking/Input/Patch + функции запросов (единственное место с URL)
│   ├── lib/bookingRules.ts       ВСЕ бизнес-правила (общие для клиента и mock-сервера) + тест
│   └── model/                    query keys, useBookingsQuery / useXxxBookingMutation
└── shared/
    ├── api/                      http (axios, baseURL из env), makeQueryClient
    ├── config/                   API_BASE_URL, TIME_ZONE_HEADER, таймауты, staleTime
    ├── lib/errors|time           apiErrorMessage/hasStatus/shouldRetryQuery; HH:mm ↔ минуты, zonedNow
    ├── model/                    useZonedNow («сейчас» в поясе браузера), useLocaleStore (язык, localStorage)
    └── ui/                       shadcn (kebab-файлы) + QueryZone
```

## 1. Функциональные требования ТЗ

| # | Требование | Реализация | Проверка |
|---|---|---|---|
| F1 | Выбрать дату | `DateNav`: ← / → по дням, `DatePicker` (Popover + Calendar), «Сегодня» | клик по стрелкам и календарю |
| F2 | Посмотреть брони на дату | `DaySchedule` — таймлайн дня 09:00–18:00, брони блоками, линия «сейчас» | `GET /api/bookings?date=` |
| F3 | Выбрать начало и окончание | `BookingForm` → `TimeSelect` (шаг 15 мин); недоступные варианты `disabled` | открыть форму |
| F4 | Создать бронь | кнопка «Новая бронь» (первое свободное время) или клик по свободной ячейке (её время) | `POST /api/bookings` |
| F5 | Редактировать | клик по блоку брони → та же форма; меняется всё: дата, время, название. После сохранения расписание переключается на дату брони | `PATCH /api/bookings/:id` |
| F6 | Удалить | кнопка «Удалить» в форме → `AlertDialog` подтверждения | `DELETE /api/bookings/:id` |
| F7 | Формат отображения — на выбор | таймлайн (календарь дня) | — |
| F9 | Дата в URL `?date=` (сверх ТЗ) | `model/useSelectedDate` (`router.replace`, невалидная → сегодня); страница в `<Suspense>` | e2e «дата в URL» |
| F10 | Выделение интервала мышью (только `pointerType=mouse`) | `lib/schedule.dragRange` (чистая, тест) + `model/useDragSelect`; захват указателя только после 6px — клик по ячейке работает как раньше | e2e «выделение» |
| F11 | Занятое время недоступно в «Начало/Окончание» | `isStartDisabled/isEndDisabled(…, others)`; `defaultEnd` — самое длинное окончание ≤ +1 ч, которое влезает | unit + e2e |
| F12 | Сводка дня | `lib/schedule.daySummary` + `DaySummaryLine` (ICU plural) | unit |
| F13 | Горячие клавиши ← → T N | `model/useBookingHotkeys` (не срабатывают в полях и при открытых диалогах), `aria-keyshortcuts` | e2e |
| F14 | Тема system/light/dark | `_app/layout/ThemeSwitch` (next-themes) | e2e |
| F15 | Предзагрузка ±1 день, без мигания при смене дня | `usePrefetchBookingsQuery`, `placeholderData: keepPreviousData` → `isStale` (полупрозрачно, без кликов; баннеры/сводка не считаются по старым данным) | вручную |
| F8 | Документация (сверх ТЗ, согласовано) | `/about` «Как это работает», ссылка в шапке | открыть страницу |

## 2. Бизнес-правила ТЗ

Единый источник — `findRuleViolation` в `entities/booking/lib/bookingRules.ts`. Им пользуются **и** форма
(zod `superRefine` в `_pages/booking/model/bookingForm.schema.ts`), **и** mock-сервер
(`_app/api-routes/bookingHandlers.ts`). Правило меняем в одном месте. Порядок проверок важен: первым
возвращается самое понятное пользователю нарушение.

| # | Правило | Где | Код ошибки / статус |
|---|---|---|---|
| R0 | только будни пн–пт (ответ заказчика) | `isWorkday`; в календаре формы сб/вс недоступны, на выходном — баннер, ячейки закрыты | `WEEKEND` / 422 |
| R0b | время на сетке 15 мин (ответ заказчика); дата — реальная календарная | `OFF_GRID` в правилах; `isCalendarDate` в zod-схемах и GET | `OFF_GRID` / 422; дата → 400 |
| R1 | start и end в пределах 09:00–18:00 | `WORKDAY_START/END`; варианты в селектах ограничены диапазоном | `OUTSIDE_WORKDAY` / 422 |
| R2 | start < end | `findRuleViolation` | `START_NOT_BEFORE_END` / 422 |
| R3 | минимум 30 минут | `MIN_DURATION_MIN`; end-варианты короче — disabled | `TOO_SHORT` / 422 |
| R4 | максимум 2 часа | `MAX_DURATION_MIN`; end-варианты длиннее — disabled | `TOO_LONG` / 422 |
| R5 | брони не пересекаются, касание границ — не конфликт | `overlaps`: `a.start < b.end && b.start < a.end` (строгие неравенства) | `CONFLICT` / 409 |
| R6a | сегодня — прошедшие слоты недоступны; начало — с ближайшего будущего времени по сетке 15 мин | `PAST_TIME`; ячейки и варианты начала до «сейчас» недоступны, серый фон | 422 |
| R6b | прошедшая дата — создание недоступно | `PAST_DATE` (поле `date`); «Новая бронь» disabled, баннер, ячейки закрыты, в календаре формы даты до сегодня недоступны | 422 |
| R6c | начавшуюся/прошедшую бронь нельзя менять и удалять (ответ заказчика) | `hasStarted`: блок с замком; сервер на PATCH/DELETE → 422 | 422 |
| R7 | при редактировании бронь не конфликтует сама с собой | `ignoreId` в контексте правил (форма и PATCH) | — |
| R8 | сервер может вернуть 409, даже если UI считал слот свободным | см. §3.3 | 409 |

Тест правил: `src/entities/booking/lib/bookingRules.test.ts` (`npm test`). Любое изменение правил — сначала тест.

### 2.1 Ответы заказчика (рекрутер Mad Devs, 22.10.2026)

| Вопрос | Ответ | Как сделано |
|---|---|---|
| Часовой пояс | браузер пользователя | `useZonedNow()` без пояса; клиент шлёт `X-Time-Zone` (axios-интерсептор), сервер проверяет «сейчас» в этом поясе, без заголовка — UTC, мусор → 400 |
| Выходные | только пн–пт | R0 |
| Прошедший слот (сейчас 14:20) | с ближайшего будущего | первое начало — 14:30 |
| Менять/удалять начавшиеся | нет | R6c |
| Шаг времени | 15 минут | `SLOT_STEP_MIN` |
| Перенос брони | можно менять всё | поле «Дата» в форме, PATCH принимает `date` |
| Праздники | необязательно | не учитываются |
| Переписка с AI | файл `.md` | `docs/ai-chat.md` (см. §4) |
| 409-mock, хранилище, документация, авторизация, язык, тесты, горизонт | на усмотрение | ниже |

### 2.2 Решения «на усмотрение»

- **Авторизации нет** (ТЗ: «авторизация не нужна»): любой пользователь меняет и удаляет любую бронь.
- Время брони хранится без пояса (`HH:mm`): все пользователи в одном офисе, пояс браузера нужен только для «сейчас».
- 409 воспроизводится случайно (`MOCK_CONFLICT_RATE`, 20%); хранилище — in-memory.
- Горизонт бронирования не ограничен, праздники не учитываются. `title` необязателен, до 80 символов.
- Язык: русский (основной) + английский, переключатель RU/EN в шапке, выбор в localStorage. Сервер отвечает на языке из `Accept-Language`.
- Тесты: unit (vitest, бизнес-правила) + e2e (Playwright).
- Страница документации `/about` — полный разбор ТЗ, ответы рекрутера и эти решения. Меняем решение → правим и её (`_pages/about/i18n/*.json`).

## 3. Нефункциональные требования ТЗ («что важно показать»)

### 3.1 Состояния UI
- **Загрузка** — `QueryZone` pending → `DayScheduleSkeleton` той же геометрии. Фоновое обновление — «Обновляем…» со спиннером.
- **Пусто** — плашка «На этот день броней нет» + подсказка (для прошедшей даты без призыва к действию); сетка остаётся кликабельной.
- **Ошибка** — `QueryZone` error: текст `apiErrorMessage` + «Повторить» (`refetch`).
- **Отправка формы** — кнопки disabled, спиннер в submit, `aria-busy` на форме; диалог удаления не закрывается во время запроса.

### 3.2 Ошибки сервера
- Формат ошибки mock-API: `{ code, message, field? }`; `code ∈ BAD_REQUEST | NOT_FOUND | CONFLICT | RULE_VIOLATION`,
  статусы 400 / 404 / 409 / 422. `apiErrorMessage` берёт `message` сервера, иначе — текст по статусу.
- Повторы запросов (`shouldRetryQuery`): 4xx и `ZodError` не повторяем, сеть/5xx — один раз.
- 404 при PATCH/DELETE (бронь удалили параллельно) — тост, форма закрывается, список обновляется.

### 3.3 Конфликт 409 (R8) — обязательное поведение
1. Сообщение сервера показывается **внутри формы** (`Alert role="alert"`) + подсказка «Список броней обновлён — выберите другое время. Введённые данные сохранены».
2. Список броней **перезапрашивается** (`onSettled` у всех мутаций инвалидирует `['bookings']`) — новая чужая бронь появляется на таймлайне за диалогом.
3. **Данные формы не теряются**: диалог не закрывается, значения react-hook-form не сбрасываются.
4. Последующая валидация формы идёт по свежему списку (правила читают актуальный контекст через ref).

Mock воспроизводит гонку: `MOCK_CONFLICT_RATE` (по умолчанию 0.2) — доля POST, на которые сервер «отдаёт слот
другому»: создаёт чужую бронь «Занято коллегой» на это время и отвечает 409.

### 3.4 Разделение API и UI
- `ui → model (хуки) → entities/booking/api → shared/api/http`. Компоненты не знают про axios и URL.
- Ответы сервера парсятся zod-схемами — неожиданный формат превращается в понятную ошибку, а не в падение UI.
- Замена на реальный API = `NEXT_PUBLIC_API_BASE_URL` в `.env`; контракт тот же. Mock целиком в `_app/api-routes`
  и `app/api` — удаляется без правок UI.

### 3.5 Контракт API (из ТЗ)
```
GET    /api/bookings?date=YYYY-MM-DD   → 200 Booking[] (по start)   | 400
POST   /api/bookings                   → 201 Booking               | 400 | 409 | 422
PATCH  /api/bookings/:id               → 200 Booking               | 400 | 404 | 409 | 422
DELETE /api/bookings/:id               → 204                       | 404 | 422
type Booking = { id: string; date: string /* YYYY-MM-DD */; start: string /* HH:mm */; end: string; title?: string }
```
Хранилище — in-memory `Map` на `globalThis` (переживает HMR, **не** переживает рестарт и не общее между
serverless-инстансами Vercel). Сид: 2 брони на ближайший будний день, 1 — на следующий будний.

### 3.6 TypeScript и структура
- `strict`, без `any`; типы выводятся из zod (`z.infer`). `import type` для типов (ESLint).
- FSD: импорт только вниз, чужой слайс — через `index.ts`, `.tsx` тонкие (логика в `model/`/`lib/`).

### 3.7 Адаптивность и доступность
- Общая шапка `SiteHeader` (sticky): логотип + навигация «Расписание» / «Как это работает», активная ссылка — `aria-current="page"`.
- Работает от 360px: на мобилке короткая дата («чт, 22 окт.»), кнопка «Новая бронь» на всю ширину, форма в одну колонку.
- `lang="ru"`, `main`/`header`/`nav`/`section` с подписями, `h1`→`h2`.
- Свободные ячейки и брони — настоящие `<button>` с `aria-label` («Забронировать с 16:00», «Изменить бронь 10:00–11:00, …»), видимый `focus-visible`.
- Поля формы: `label`, `aria-invalid`, текст ошибки под полем; серверная ошибка — `role="alert"`; диалоги — Radix (фокус-ловушка, Esc).
- Цвет не единственный носитель смысла: прошедшие брони — замок + `sr-only` пояснение.

## 4. Сдача (ТЗ)

- [ ] Ссылка на репозиторий
- [ ] README: как запустить, что сделано / не сделано, сколько времени заняло
- [ ] Deployed demo (Vercel) — при деплое помнить про in-memory store (§3.5)
- [x] Переписка с AI — `docs/ai-chat.md` (сгенерирован из лога сессии; перед сдачей обновить: `/export` или повторный экспорт)
- Таймбокс 4–6 ч. Не успеваем — в README приоритеты и что бы доделали.

## 5. Переводы (next-intl)

- Переводы живут в слайсе-владельце, сегмент `i18n/{ru,en}.json` (FSD: `shared` не знает тексты страниц):
  `_pages/booking/i18n`, `_pages/about/i18n`, `_app/i18n` (шапка), `_app/api-routes/i18n` (ответы mock),
  `entities/booking/i18n` (тексты нарушений по коду), `shared/lib/errors/i18n` (сетевые ошибки).
- Провайдер получает `MESSAGES` из `_app/i18n/messages.ts`: `header` + `booking` + `about` (слайсы отдают их через `index.ts`).
  Типы ключей — `AppConfig` в `_app/i18n/next-intl.d.ts`; разные ключи в ru/en ловит `satisfies Record<Locale, typeof ru>`.
- Правила (`findRuleViolation`) возвращают только `{ code, field, params }`; текст — `ruleMessage(violation, locale)`.
  Тесты правил проверяют коды, а не строки.
- Компоненты: `useTranslations('booking.form')`; вне React (правила, сервер, `apiErrorMessage`) — `createTranslator`.
- Формат ICU: переменные `{time}`, условия `{hasTitle, select, yes {…} other {}}`. Не использовать ASCII-апостроф `'` (экранирование ICU) — писать `’`.
- Язык выбирается на клиенте (`useLocaleStore`, `skipHydration` → первый рендер на русском), `<html lang>` синхронизируется, axios шлёт его в `Accept-Language`.
  Без мигания: инлайн-скрипт `_app/layout/localeScript.ts` ставит `data-locale-pending`, если сохранён не русский, — `body` скрыт, пока провайдер не перейдёт на нужный язык.
- Заголовок вкладки — React `<title>{t('metaTitle')}</title>` в компоненте страницы (переводится), в `metadata` только `description`.

## 6. Как работать в проекте

- Перед правкой Next-API — гайд в `node_modules/next/dist/docs/` (Next 16, см. AGENTS.md).
- Новый shadcn-компонент: `npx shadcn@4 add <name>` → файл попадает в `./shared/ui`, перенести в `src/shared/ui/`
  (алиасы в `components.json` относительно `@/` = `src/`).
- Проверка перед сдачей — всё зелёное:
  ```bash
  npm run lint:all   # eslint --max-warnings 0, tsc, steiger, tailwind-check, fsd-check
  npm test           # vitest: бизнес-правила
  npm run e2e        # Playwright: собирает прод и поднимает его на :3200 (dev на :3000 не мешает)
  npm run build
  ```
- Ручная проверка конфликта: `MOCK_CONFLICT_RATE=1 npm run dev` → любая новая бронь получает 409.
- e2e: `e2e/booking.spec.ts` — создание/редактирование/удаление, 409 (через `page.route`), прошедшая дата, выходной,
  ошибка загрузки + «Повторить», язык, документация. Тег `@smoke` дополнительно гоняется на мобильном (Pixel 7).
- Скриншоты/артефакты браузера — не в репозиторий; `.playwright-mcp/`, `playwright-report/`, `test-results/` удалять после проверки.
- VS Code (`.vscode/settings.json`): `.md` открываются превью, двойной клик не переключает в исходник; Prettier on save.
- `git add/commit/push` делает владелец.
