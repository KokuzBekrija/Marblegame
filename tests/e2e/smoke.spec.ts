import { test, expect } from '@playwright/test';

test('game boots and renders a canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
});
