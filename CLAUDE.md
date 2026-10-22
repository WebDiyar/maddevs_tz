@AGENTS.md

# Бронирование переговорной — правила проекта

Тестовое задание Frontend Engineer (Mad Devs). Исходное ТЗ — [docs/ТЗ Frontend Engineer.pdf](docs/ТЗ%20Frontend%20Engineer.pdf).
Этот файл — рабочая копия ТЗ и карта кода: **каждый пункт ТЗ → где реализован → как проверить**.
Любая правка не должна ломать ни один пункт §1–§4. Пользовательская версия того же — страница `/about`
(`src/_pages/about/i18n/*.json`): меняешь поведение — правь и её, и README.

**Стек:** Next.js 16.4 (App Router, Route Handlers) · React 19 · TypeScript strict · Tailwind CSS 4 (PostCSS) ·
shadcn/ui (radix-nova) · TanStack Query 5 · axios · zod 4 · react-hook-form · zustand · date-fns · next-intl
(RU основной + EN) · next-themes · sonner · lucide-react · vitest · Playwright + axe.
Архитектура — FSD (`docs/local/FSD.md`, локально, в git не едет).

Репозиторий: https://github.com/WebDiyar/maddevs_tz · Демо: https://maddevs-tz.vercel.app · Telegram автора: @a_diyar_tr
(ссылки для `/about` — `src/_pages/about/model/projectLinks.ts`)

## 0. Карта

```
app/                               роутер Next — ТОЛЬКО ре-экспорты
├── layout.tsx                     → @/_app/layout
├── page.tsx                       → @/_pages/booking
├── about/page.tsx                 → @/_pages/about
├── not-found.tsx                  → @/_pages/not-found
└── api/bookings/[id]/route.ts     → @/_app/api-routes (mock API)
src/
├── _app/
│   ├── layout/                    RootLayout, AppProviders (next-intl, QueryClient, тема, Toaster),
│   │                              SiteHeader + LocaleSwitch + ThemeSwitch (nav.config.ts), localeScript, metadata
│   ├── api-routes/                mock-бэкенд: обработчики, in-memory store, формат ошибок, i18n/ ответов
│   ├── i18n/                      сборка MESSAGES из слайсов + тексты шапки, типы AppConfig (next-intl.d.ts)
│   └── styles/globals.css         токены темы (:root / .dark), --container-page*, fluid root font-size
├── _pages/
│   ├── booking/                   экран бронирования
│   │   ├── ui/BookingPage.tsx     заголовок + <Suspense> (useSearchParams)
│   │   ├── ui/components/         BookingDay (раскладка), DateNav, DatePicker, DayCalendar, DaySchedule,
│   │   │                          BookingBlock(+Content, variants), BookingForm(+Dialog), DeleteBookingDialog,
│   │   │                          DaySummaryLine, HotkeysHint, TimeSelect, DayScheduleSkeleton
│   │   ├── model/                 zustand-стор диалогов, useBookingDay, useBookingForm, useDeleteBooking,
│   │   │                          useSelectedDate (?date=), useDragSelect, useBookingHotkeys, zod-схема формы
│   │   ├── lib/                   schedule.ts (сетка, опции формы, dragRange, daySummary, titleLines) + тест,
│   │   │                          formatDate.ts
│   │   └── i18n/                  ru.json, en.json, messages.ts
│   ├── about/                     документация: ТЗ, ответы рекрутера, решения, ссылки (model/projectLinks.ts)
│   └── not-found/                 своя 404 (RU/EN)
├── entities/booking/
│   ├── api/bookingApi.ts          zod-схемы Booking/Input/Patch + запросы (единственное место с URL)
│   ├── lib/bookingRules.ts        ВСЕ бизнес-правила (клиент и сервер) → { code, field, params } + тест
│   ├── lib/ruleMessage.ts         код нарушения → текст на языке (i18n/)
│   └── model/                     query keys, bookingsQueryOptions, useBookingsQuery, usePrefetchBookingsQuery,
│                                  useCreate/Update/DeleteBookingMutation
└── shared/
    ├── api/                       http (axios: X-Time-Zone, Accept-Language), makeQueryClient
    ├── config/                    API_BASE_URL, TIME_ZONE_HEADER, LOCALES, таймауты
    ├── lib/errors                 apiErrorMessage (+ i18n), isConflict/isNotFound, shouldRetryQuery
    ├── lib/time                   HH:mm ↔ минуты, isCalendarDate, shiftDate, weekday, zonedNow (+ тест)
    ├── model/                     useZonedNow, useLocaleStore, useReturnFocus
    └── ui/                        shadcn (kebab-файлы) + QueryZone
e2e/booking.spec.ts                Playwright (desktop + mobile @smoke)
```

## 1. Функциональные требования ТЗ

| # | Требование | Реализация | Проверка |
|---|---|---|---|
| F1 | Выбрать дату | `DateNav` (← →, «Сегодня»), `DatePicker` (popover, до `lg`), `DayCalendar` (месяц слева на `lg+`), дата в URL `?date=` | e2e «дата в URL» |
| F2 | Посмотреть брони на дату | `DaySchedule` — таймлайн 09:00–18:00, блоки, линия «сейчас»; длинные названия переносятся (`titleLines`) | `GET /api/bookings?date=` |
| F3 | Выбрать начало и окончание | `TimeSelect`, шаг 15 мин; прошедшее и занятое время `disabled` (`isStartDisabled/isEndDisabled`) | unit + e2e |
| F4 | Создать бронь | «Новая бронь» (первое свободное), клик по ячейке, выделение мышью (`dragRange`), клавиша N | `POST`, e2e |
| F5 | Редактировать | клик по брони → форма; меняются дата, время, название; после сохранения — переход на дату брони | `PATCH`, e2e |
| F6 | Удалить | «Удалить» в форме → `AlertDialog` с датой/временем/названием | `DELETE`, e2e |
| F7 | Формат отображения на выбор | таймлайн (календарь дня) | — |

Сверх ТЗ (на усмотрение, согласовано): `/about`, RU/EN, тема, дата в URL, выделение мышью, сводка дня,
горячие клавиши ← → T N, предзагрузка ±1 день (`keepPreviousData` + `inert` у устаревшего вида), своя 404.

## 2. Бизнес-правила ТЗ

Единый источник — `findRuleViolation` (`entities/booking/lib/bookingRules.ts`): форма (zod `superRefine`
в `_pages/booking/model/bookingForm.schema.ts`) и mock-сервер (`_app/api-routes/bookingHandlers.ts`).
Возвращает `{ code, field, params }` без текста; текст — `ruleMessage(violation, locale)`. Порядок проверок важен:
первым возвращается самое понятное нарушение. Любое изменение правил — сначала тест.

| # | Правило | Код / статус |
|---|---|---|
| R0 | только будни пн–пт (рекрутер) | `WEEKEND` / 422 |
| R0b | время на сетке 15 мин (рекрутер); дата — реальная (`isCalendarDate`) | `OFF_GRID` / 422; дата → 400 |
| R1 | start и end в 09:00–18:00 | `START_/END_OUTSIDE_WORKDAY` / 422 |
| R2 | start < end | `START_NOT_BEFORE_END` / 422 |
| R3 | минимум 30 минут | `TOO_SHORT` / 422 |
| R4 | максимум 2 часа | `TOO_LONG` / 422 |
| R5 | без пересечений, касание границ допустимо (`a.start < b.end && b.start < a.end`) | `CONFLICT` / 409 |
| R6a | сегодня — начало не раньше ближайшего будущего шага; секунды учитываются (сервер) | `PAST_TIME` / 422 |
| R6b | прошедшая дата — только просмотр | `PAST_DATE` / 422 |
| R6c | начавшуюся/прошедшую бронь не менять и не удалять (рекрутер) | `hasStarted` → 422 |
| R7 | при редактировании бронь не конфликтует сама с собой | `ignoreId` |
| R8 | сервер может вернуть 409, даже если UI считал слот свободным | §3.3 |

### 2.1 Ответы рекрутера (22.10.2026)

| Вопрос | Ответ | Как сделано |
|---|---|---|
| Часовой пояс | браузер | `useZonedNow()`; axios шлёт `X-Time-Zone`, сервер считает «сейчас» в нём (нет — UTC, мусор → 400) |
| Выходные | только пн–пт | R0 |
| Сейчас 14:20 — с какого времени | с ближайшего будущего (14:30) | R6a |
| Менять/удалять начавшиеся | нет | R6c |
| Шаг времени | 15 минут | `SLOT_STEP_MIN`, R0b |
| Перенос брони | можно менять всё | поле «Дата», PATCH принимает `date` |
| Случайный 409, хранение в памяти | на усмотрение | §3.3, §3.5 |
| Праздники | необязательно | не учитываются |
| Переписка с AI | файл `.md` | `docs/ai-chat.md` |
| Остальное (документация, авторизация, язык, тесты, горизонт, сверх ТЗ) | на усмотрение | §2.2 |

Заданы, ответа пока нет (реализовано по умолчанию): отклик при сохранении — ждём сервер со спиннером;
удаление — с подтверждением; 409 на демо — случайно, ~20%.

### 2.2 Решения на усмотрение

- Авторизации нет (ТЗ: «не нужна») — любой меняет любую бронь.
- Время брони без пояса (`HH:mm`) — все в одном офисе; пояс браузера только для «сейчас».
- Праздники не учитываются, горизонт не ограничен, `title` необязателен (≤ 80 символов, пустой → не сохраняется).
- Язык RU (основной) + EN; тема system/light/dark; выбор в localStorage.
- Тесты: unit (vitest) + e2e (Playwright) + axe (WCAG 2 AA).

## 3. «Что важно показать» (ТЗ)

### 3.1 Состояния UI
- **Загрузка** — `QueryZone` pending → `DayScheduleSkeleton`; фоновое обновление — «Обновляем…».
- **Смена дня** — `keepPreviousData`: старый вид полупрозрачный и `inert` (не кликается ни мышью, ни клавиатурой);
  баннеры и сводка по старым данным не считаются; соседние дни предзагружены.
- **Пусто** — плашка «На этот день броней нет» + подсказка, если можно бронировать.
- **Ошибка** — `QueryZone` error + «Повторить». Неудачное **фоновое** обновление не прячет расписание —
  строка «Не удалось обновить расписание · Повторить».
- **Отправка** — спиннер, кнопки disabled, `aria-busy`; форму нельзя закрыть во время сохранения
  (Esc, оверлей, крестик), диалог удаления — тоже.
- **Баннеры** (`dayNotice`): прошедшая дата, выходной, рабочий день закончился, свободного времени нет.

### 3.2 Ошибки сервера
- Формат: `{ code, message, field? }`, `code ∈ BAD_REQUEST | NOT_FOUND | CONFLICT | RULE_VIOLATION` → 400/404/409/422.
- Текст — на языке `Accept-Language`, включая ошибки zod (`z.locales`).
- `apiErrorMessage` берёт `message` сервера, иначе текст по статусу; `shouldRetryQuery`: 4xx и `ZodError` не повторяем.
- 404 при PATCH/DELETE — тост, форма закрывается, список обновляется.

### 3.3 Конфликт 409 (R8)
1. Сообщение — внутри формы (`Alert role="alert"`) + «Список броней обновлён — выберите другое время. Введённые данные сохранены».
2. Список перезапрашивается (`onSettled` → `invalidateQueries(['bookings'])`), чужая бронь видна за диалогом.
3. Форма не закрывается, значения не сбрасываются; валидация идёт по свежему списку (контекст правил через ref).
4. Mock: `MOCK_CONFLICT_RATE` (0.2) — доля POST, на которые сервер «отдаёт слот коллеге» (бронь «Занято коллегой»).

### 3.4 Разделение API и UI
- `ui → model (хуки) → entities/booking/api → shared/api/http`; компоненты не знают про axios и URL.
- Ответы проверяются zod; реальный API — `NEXT_PUBLIC_API_BASE_URL`; mock целиком в `_app/api-routes` + `app/api`.

### 3.5 Контракт API
```
GET    /api/bookings?date=YYYY-MM-DD   → 200 Booking[] (по start) | 400
POST   /api/bookings                   → 201 Booking | 400 | 409 | 422
PATCH  /api/bookings/:id               → 200 Booking | 400 | 404 | 409 | 422
DELETE /api/bookings/:id               → 204 | 404 | 422
type Booking = { id: string; date: string /* YYYY-MM-DD */; start: string /* HH:mm */; end: string; title?: string }
```
Хранилище — `Map` на `globalThis`: переживает HMR, не переживает рестарт и не общее между инстансами Vercel.
Сид: 2 брони на ближайший будний, 1 — на следующий будний.

### 3.6 TypeScript и структура
- `strict`, без `any`, типы из zod; `import type`; ноль комментариев в коде.
- FSD: импорт только вниз, чужой слайс — через `index.ts`, `.tsx` тонкие, один компонент — один файл.

### 3.7 Адаптивность и доступность
- **Раскладка** (Playwright, 320–2560, без горизонтального скролла):
  - телефон (< 640): одна колонка — дата, «Новая бронь» на всю ширину, баннер, чипы сводки, таймлайн; < 380 — без иконки у даты;
  - планшет (`sm`–`lg`): навигация и «Новая бронь» в одной строке;
  - `lg+`: колонки `19rem | 1fr` (`xl` — 20rem): слева `DayCalendar`, «Новая бронь», баннер, карточка сводки,
    `HotkeysHint` (sticky); справа дата-заголовок со стрелками и таймлайн. Одна разметка: обёртки `contents` + `order-*`;
  - монитор: `html { font-size: clamp(1rem, 0.75rem + 0.2778vw, 1.25rem) }`; контейнер `max-w-page` (72rem) →
    `2xl:max-w-page-wide` (84rem);
  - `/about`: на `lg` sticky-содержание слева, текст до 48rem.
- **a11y:** `lang`, landmarks, `h1`→`h2`; ячейки и брони — `<button>` с `aria-label`; `aria-keyshortcuts`;
  ошибки связаны с полями (`aria-describedby`); фокус возвращается после закрытия диалогов (`useReturnFocus`);
  контраст WCAG 2 AA (axe в e2e); прошедшие брони — замок + `sr-only`.

## 4. Сдача (ТЗ)

- [x] Репозиторий — https://github.com/WebDiyar/maddevs_tz
- [x] README — запуск, что сделано / нет, время
- [x] Deployed demo — https://maddevs-tz.vercel.app
- [x] Переписка с AI — `docs/ai-chat.md` (перед сдачей пересобрать из лога сессии)
- Таймбокс 4–6 ч.

## 5. Переводы (next-intl)

- Переводы живут в слайсе-владельце, `i18n/{ru,en}.json`: `_pages/*/i18n`, `_app/i18n` (шапка),
  `_app/api-routes/i18n`, `entities/booking/i18n` (тексты по коду нарушения), `shared/lib/errors/i18n`.
- Провайдер получает `MESSAGES` из `_app/i18n/messages.ts`; разные ключи ru/en ловит `satisfies Record<Locale, typeof ru>`.
- Компоненты — `useTranslations`; вне React — `createTranslator`. ICU: `{time}`, `{count, plural, …}`;
  ASCII-апостроф `'` не использовать — писать `’`. Тексты `/about` читаются через `useMessages` (без ICU).
- Без мигания: `localeScript` ставит `data-locale-pending`, если сохранён не русский, — `body` скрыт до переключения.
- Заголовок вкладки — `<title>{t('metaTitle')}</title>` в компоненте страницы.

## 6. Как работать в проекте

- Перед правкой Next-API — гайд в `node_modules/next/dist/docs/` (Next 16, см. AGENTS.md).
- Новый shadcn-компонент: `npx shadcn@4 add <name>` → файл попадает в `./shared/ui`, перенести в `src/shared/ui/`.
- Перед сдачей всё зелёное:
  ```bash
  npm run lint:all   # eslint --max-warnings 0, tsc, steiger, tailwind-check, fsd-check
  npm test           # vitest: правила, сетка, время
  npm run e2e        # Playwright: собирает прод и поднимает его на :3200 (dev на :3000 не мешает)
  npm run build
  ```
- Ручная проверка 409: `MOCK_CONFLICT_RATE=1 npm run dev`.
- Скриншоты и артефакты браузера — только в scratchpad; `.playwright-mcp/`, `playwright-report/`, `test-results/` удалять.
- VS Code (`.vscode/settings.json`): `.md` открываются превью без перехода в исходник; Prettier on save.
- `git add/commit/push` делает владелец.
