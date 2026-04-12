import { test, expect } from '@playwright/test';

test.describe('recipe table', () => {
  test('loads and shows recipes including building type', async ({ page }) => {
    await page.goto('/valheim/');
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await page.goto('/valheim/?q=iron+sword');
    await expect(page.getByText('Iron Sword')).toBeVisible();
  });

  test('search filters the table', async ({ page }) => {
    await page.goto('/valheim/?q=chopping+block');
    await expect(page.getByText('Chopping Block')).toBeVisible();
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

  test('detail page is reachable', async ({ page }) => {
    await page.goto('/valheim/recipes/iron-sword/');
    await expect(page.getByRole('heading', { name: 'Iron Sword' })).toBeVisible();
    await expect(page.getByText(/Used as ingredient in|Ingredients/)).toBeVisible();
  });
});

test.describe('advanced filters', () => {
  test('toggle opens and closes the panel', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByText('Type')).toBeVisible();
    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByText('Type')).not.toBeVisible();
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

  test('building type filter shows station upgrades', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Building' }).click();
    await expect(page.getByText('Chopping Block')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('station-upgrade tag filter works', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'station-upgrade' }).click();
    await expect(page.getByText('Chopping Block')).toBeVisible();
    await expect(page.getByText('Forge Bellows')).toBeVisible();
  });
});
