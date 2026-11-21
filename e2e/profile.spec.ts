import { expect, test } from '@playwright/test'
import { registerAndOnboard } from './helpers.ts'

/** F006 US2: Profile page from the sidebar (quickstart scenario 5). */
test('profile shows the account, keeps preferences in sync and signs out', async ({ page }) => {
  const user = await registerAndOnboard(page)

  await page.getByRole('link', { name: 'Open profile' }).click()
  await expect(page).toHaveURL(/#\/profile/)
  const account = page.getByRole('region', { name: 'Account' })
  await expect(account.getByText(user.email)).toBeVisible()
  await expect(page.getByText('Free plan')).toBeVisible()

  const preferences = page.getByRole('region', { name: 'Preferences' })
  await preferences.getByRole('radio', { name: 'Light' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.app-sidebar').getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')

  await preferences.getByRole('button', { name: 'Zoom in' }).click()
  await expect(preferences.getByText('125%')).toBeVisible()
  await page.locator('.app-sidebar').getByRole('link', { name: 'Today' }).click()
  await expect(page.locator('.ob-board-zoom-label')).toHaveText('125%')

  await page.getByRole('link', { name: 'Open profile' }).click()
  await account.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/#\/auth/)
})
