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
});
