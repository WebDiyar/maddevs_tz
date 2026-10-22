# shared/lib/errors

Разбор ошибок сетевого слоя: текст для пользователя (`apiErrorMessage`), проверка статуса
(`isConflict`, `isNotFound`), политика повторов TanStack Query (`shouldRetryQuery`). Тексты — `i18n/{ru,en}.json`.

Можно: функции над `unknown`-ошибкой axios/zod без знаний о домене.
Нельзя: тексты конкретных сущностей и сценариев — они живут в слайсе, который их показывает.
