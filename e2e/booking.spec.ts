import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const MAX_DAYS_TO_WEEKDAY = 3;
const MAX_DAYS_TO_WEEKEND = 7;

const goToFutureWorkday = async (page: Page) => {
  const next = page.getByRole('button', { name: 'Следующий день' });
  await next.click();
  for (let i = 0; i < MAX_DAYS_TO_WEEKDAY && (await page.getByText('Выходной').isVisible()); i++) {
    await next.click();
  }
  await expect(page.getByRole('button', { name: 'Забронировать с 16:00' })).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Переговорная' })).toBeVisible();
});

test('создание, редактирование и удаление брони @smoke', async ({ page }) => {
  await goToFutureWorkday(page);
  const dialog = page.getByRole('dialog');

  await page.getByRole('button', { name: 'Забронировать с 16:00' }).click();
  await dialog.getByLabel('Название').fill('E2E планёрка');
  await dialog.getByRole('button', { name: 'Забронировать', exact: true }).click();
  await expect(page.getByText('Бронь создана')).toBeVisible();

  await page.getByRole('button', { name: 'Изменить бронь 16:00–17:00, E2E планёрка' }).click();
  await dialog.getByLabel('Название').fill('E2E ретро');
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  const updated = page.getByRole('button', { name: 'Изменить бронь 16:00–17:00, E2E ретро' });
  await expect(updated).toBeVisible();

  await updated.click();
  await dialog.getByRole('button', { name: 'Удалить' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText('Бронь удалена')).toBeVisible();
  await expect(updated).toHaveCount(0);
});

test('конфликт 409: сообщение, обновление списка, данные формы сохранены', async ({ page }) => {
  await goToFutureWorkday(page);
  await page.route('**/api/bookings', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 409,
          json: { code: 'CONFLICT', message: 'Время занял другой пользователь', field: 'start' },
        })
      : route.continue(),
  );

  await page.getByRole('button', { name: 'Забронировать с 16:00' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название').fill('Не потеряется');
  const refetch = page.waitForRequest(
    (request) => request.method() === 'GET' && request.url().includes('/api/bookings?date='),
  );
  await dialog.getByRole('button', { name: 'Забронировать', exact: true }).click();

  await expect(dialog.getByRole('alert')).toContainText('Время занял другой пользователь');
  await expect(dialog.getByRole('alert')).toContainText('Введённые данные сохранены');
  await expect(dialog.getByLabel('Название')).toHaveValue('Не потеряется');
  await refetch;
});

test('прошедшая дата — только просмотр', async ({ page }) => {
  await page.getByRole('button', { name: 'Предыдущий день' }).click();
  await expect(page.getByText('Это прошедшая дата')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Новая бронь' })).toBeDisabled();
});

test('выходной — бронирование недоступно', async ({ page }) => {
  const next = page.getByRole('button', { name: 'Следующий день' });
  for (let i = 0; i < MAX_DAYS_TO_WEEKEND && !(await page.getByText('Выходной').isVisible()); i++) {
    await next.click();
  }
  await expect(page.getByText('Выходной')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Новая бронь' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Забронировать с/ })).toHaveCount(0);
});

test('ошибка загрузки и повтор', async ({ page }) => {
  await page.route('**/api/bookings?*', (route) => route.fulfill({ status: 500, json: {} }));
  await page.reload();
  await expect(page.getByText('Не удалось загрузить брони')).toBeVisible({ timeout: 10_000 });

  await page.unroute('**/api/bookings?*');
  await page.getByRole('button', { name: 'Повторить' }).click();
  await expect(page.getByRole('list', { name: 'Свободное время' })).toBeVisible();
});

test('переключение языка сохраняется @smoke', async ({ page }) => {
  await page.getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Meeting room' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Meeting room' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'How it works' })).toBeVisible();

  await page.getByRole('button', { name: 'RU' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Переговорная' })).toBeVisible();
});

test('страница документации из шапки @smoke', async ({ page }) => {
  await page.getByRole('link', { name: 'Как это работает' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Как это работает' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '7. Уточнения от рекрутера Mad Devs' }),
  ).toBeVisible();
});
