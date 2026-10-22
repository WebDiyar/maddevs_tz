import axios from 'axios';
import { ZodError } from 'zod';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Некорректный запрос',
  404: 'Запись не найдена — возможно, её уже удалили',
  409: 'Конфликт с другой бронью',
  422: 'Данные не прошли проверку',
};

const serverMessage = (data: unknown) =>
  typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
    ? data.message
    : null;

export const apiErrorMessage = (error: unknown): string => {
  if (error instanceof ZodError) return 'Сервер вернул данные в неожиданном формате';
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Нет связи с сервером — проверьте интернет и повторите';
    const { status, data } = error.response;
    return (
      serverMessage(data) ??
      STATUS_MESSAGES[status] ??
      `Ошибка сервера (${status}) — попробуйте позже`
    );
  }
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
};

export const hasStatus = (error: unknown, status: number) =>
  axios.isAxiosError(error) && error.response?.status === status;
