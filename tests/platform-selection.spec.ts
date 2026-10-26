import { test, expect } from '@playwright/test';

test('meeting platform selection suggests the matching desktop source', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).perryParrotDesktop = {
      isDesktop: true,
      listSources: async () => [
        { id: 'screen:1', name: 'Entire screen', type: 'screen', thumbnail: '', appIcon: '' },
        { id: 'window:teams', name: 'Microsoft Teams - Interview', type: 'window', thumbnail: '', appIcon: '' },
        { id: 'window:meet', name: 'Google Meet - Mock Interview', type: 'window', thumbnail: '', appIcon: '' },
        { id: 'window:zoom', name: 'Zoom Meeting', type: 'window', thumbnail: '', appIcon: '' }
      ],
      showAnswerWindow: async () => true,
      updateAnswer: async () => true
    };
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Live Copilot/ }).click();

  const platform = page.getByLabel('Meeting platform');
  const source = page.getByLabel('Meeting display');
  await expect(platform).toHaveValue('Microsoft Teams');
  await expect(source).toHaveValue('window:teams');

  await platform.selectOption('Google Meet');
  await expect(source).toHaveValue('window:meet');
  await expect(page.getByText(/Suggested source for Google Meet/)).toBeVisible();

  await platform.selectOption('Zoom');
  await expect(source).toHaveValue('window:zoom');
  await expect(page.getByText(/Suggested source for Zoom/)).toBeVisible();
});

test('platform change clears a stale source when no matching window is found', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).perryParrotDesktop = {
      isDesktop: true,
      listSources: async () => [
        { id: 'screen:1', name: 'Entire screen', type: 'screen', thumbnail: '', appIcon: '' },
        { id: 'window:teams', name: 'Microsoft Teams - Interview', type: 'window', thumbnail: '', appIcon: '' }
      ],
      showAnswerWindow: async () => true,
      updateAnswer: async () => true
    };
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Live Copilot/ }).click();
  const platform = page.getByLabel('Meeting platform');
  const source = page.getByLabel('Meeting display');
  await expect(source).toHaveValue('window:teams');
  await platform.selectOption('Google Meet');
  await expect(source).toHaveValue('');
  await expect(page.getByText(/previous source was cleared/)).toBeVisible();
});
