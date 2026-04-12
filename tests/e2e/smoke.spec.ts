import { test, expect } from '@playwright/test';

test.describe('valheim helper smoke', () => {
  test('home page loads and shows recipes', async ({ page }) => {
    await page.goto('/valheim/');
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await page.goto('/valheim/?q=iron+sword');
    await expect(page.getByText('Iron Sword')).toBeVisible();
    await page.goto('/valheim/?type=cooking');
    await expect(page.getByText('Queens Jam')).toBeVisible();
  });

  test('type chip filters the table', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: 'Cooking' }).click();
    await expect(page.getByText('Queens Jam')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('expanding a row reveals ingredient chips', async ({ page }) => {
    await page.goto('/valheim/?q=iron+sword');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await expect(page.getByRole('button', { name: /Iron ×60/ })).toBeVisible();
  });

  test('clicking an ingredient chip reverse-filters', async ({ page }) => {
    await page.goto('/valheim/?q=iron+sword');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await page.getByRole('button', { name: /Iron ×60/ }).click();
    await expect(page.getByText('Uses ingredient:')).toBeVisible();
    await expect(page.getByText('Queens Jam')).not.toBeVisible();
  });

  test('URL state survives reload', async ({ page }) => {
    await page.goto('/valheim/?type=cooking');
    await expect(page.getByText('Queens Jam')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('detail page is reachable', async ({ page }) => {
    await page.goto('/valheim/recipes/iron-sword/');
    await expect(page.getByRole('heading', { name: 'Iron Sword' })).toBeVisible();
    await expect(page.getByText(/Used as ingredient in|Ingredients/)).toBeVisible();
  });

  test('adding a recipe shows cart badge', async ({ page }) => {
    await page.goto('/valheim/');
    await expect(page.locator('.cart-badge')).not.toBeVisible();
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await expect(page.locator('.cart-badge')).toBeVisible();
    await expect(page.locator('.cart-badge__count')).toHaveText('1');
  });

  test('cart drawer opens and shows grocery list', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.locator('.cart-badge').click();
    await expect(page.locator('.cart-drawer')).toBeVisible();
    await expect(page.locator('.cart-drawer__item-name')).toHaveText('Hammer');
    await expect(page.locator('.cart-drawer__grocery-item').first()).toBeVisible();
  });

  test('quantity controls update grocery list', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.locator('.cart-badge').click();
    await page.getByRole('button', { name: /Increase.*quantity by 1/ }).click();
    await expect(page.locator('.cart-drawer__qty-input')).toHaveValue('2');
  });

  test('cart URL state survives navigation', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    const url = page.url();
    expect(url).toContain('cart=');
    await page.goto(url);
    await expect(page.locator('.cart-badge')).toBeVisible();
    await expect(page.locator('.cart-badge__count')).toHaveText('1');
  });

  test('clearing cart removes badge and closes drawer', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.locator('.cart-badge').click();
    await page.getByRole('button', { name: 'Clear Cart' }).click();
    await expect(page.locator('.cart-drawer')).not.toBeVisible();
    await expect(page.locator('.cart-badge')).not.toBeVisible();
  });

  test('recipe row displays item icon when available', async ({ page }) => {
    await page.goto('/valheim/');
    const icon = page.locator('.item-icon--md').first();
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute('src', /\/icons\/items\/.*\.svg$/);
  });

  test('ingredient chip displays icon when expanded', async ({ page }) => {
    await page.goto('/valheim/');
    const firstRow = page.locator('.recipe-row').first();
    await firstRow.click();
    const chipIcon = page.locator('.recipe-row__detail .item-icon--sm').first();
    await expect(chipIcon).toBeVisible();
  });
});
