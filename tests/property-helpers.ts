import type { Page } from '@playwright/test';
export async function openProperties(page: Page, name: 'Color' | 'Effects' | 'Size & position' | 'Board settings') {
  const button = page.getByRole('button', { name, exact: true });
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
}
