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
  await expect(page.getByRole('alertdialog')).toContainText(
    /[а-я]+, \d+ [а-я]+ \d{4}, 16:00–17:00/,
  );
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
  await expect(page).toHaveTitle('Расписание · Переговорная');
  await page.getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Meeting room' })).toBeVisible();
  await expect(page).toHaveTitle('Schedule · Meeting room');

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

test('страница 404 на языке интерфейса', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.getByRole('heading', { level: 1, name: 'Страница не найдена' })).toBeVisible();
  await page.getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to schedule' }).click();
  await expect(page).toHaveURL('/');
});

test('дата в URL и горячие клавиши', async ({ page }) => {
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\?date=\d{4}-\d{2}-\d{2}$/);
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await page.keyboard.press('KeyT');
  await expect(page.getByRole('button', { name: 'Сегодня' })).toBeDisabled();

  await page.goto('/?date=2026-13-45');
  await expect(page.getByRole('button', { name: 'Сегодня' })).toBeDisabled();
});

test('занятое время недоступно в списке начала', async ({ page }) => {
  await goToFutureWorkday(page);
  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: 'Забронировать с 16:00' }).click();
  await dialog.getByRole('button', { name: 'Забронировать', exact: true }).click();
  await expect(page.getByText('Бронь создана')).toBeVisible();

  await page.getByRole('button', { name: 'Забронировать с 14:00' }).click();
  await dialog.getByLabel('Начало').click();
  await expect(page.getByRole('option', { name: '15:45' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(page.getByRole('option', { name: '16:30' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(page.getByRole('option', { name: '17:00' })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /^Изменить бронь 16:00–17:00/ }).click();
  await dialog.getByRole('button', { name: 'Удалить' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText('Бронь удалена')).toBeVisible();
});

test('выделение интервала мышью открывает форму', async ({ page }) => {
  await goToFutureWorkday(page);
  const from = await page.getByRole('button', { name: 'Забронировать с 13:00' }).boundingBox();
  const to = await page.getByRole('button', { name: 'Забронировать с 14:00' }).boundingBox();
  if (!from || !to) throw new Error('timeline is not visible');
  await page.mouse.move(from.x + 50, from.y + 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 50, to.y + to.height - 2, { steps: 8 });
  await expect(page.getByRole('status').filter({ hasText: '13:00–14:30' })).toBeVisible();
  await page.mouse.up();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Начало')).toHaveText('13:00');
  await expect(dialog.getByLabel('Окончание')).toHaveText('14:30');
});

test('переключатель темы', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /^Тема:/ });
  await toggle.click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await toggle.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
