export const PAGE_TEXT = {
  title: 'Переговорная',
  description: 'Бронирование на рабочий день 09:00–18:00, от 30 минут до 2 часов',
  create: 'Новая бронь',
  pastDay: 'Это прошедшая дата — брони можно только посмотреть.',
  dayOver: 'Рабочий день закончился — выберите другую дату.',
  emptyTitle: 'На этот день броней нет',
  emptyDescription:
    'Переговорная свободна — выберите время в расписании или нажмите «Новая бронь».',
  loadError: 'Не удалось загрузить брони',
  refreshing: 'Обновляем…',
} as const;

export const FORM_TEXT = {
  createTitle: 'Новая бронь',
  editTitle: 'Изменить бронь',
  start: 'Начало',
  end: 'Окончание',
  title: 'Название',
  titlePlaceholder: 'Например, «Созвон с клиентом»',
  submitCreate: 'Забронировать',
  submitEdit: 'Сохранить',
  cancel: 'Отмена',
  delete: 'Удалить',
  conflictHint: 'Список броней обновлён — выберите другое время. Введённые данные сохранены.',
  created: 'Бронь создана',
  updated: 'Бронь сохранена',
  goneTitle: 'Бронь уже удалена',
} as const;

export const DELETE_TEXT = {
  title: 'Удалить бронь?',
  confirm: 'Удалить',
  cancel: 'Отмена',
  done: 'Бронь удалена',
  alreadyGone: 'Бронь уже была удалена',
} as const;
