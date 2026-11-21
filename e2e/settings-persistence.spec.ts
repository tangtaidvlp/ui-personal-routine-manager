import { expect, test } from '@playwright/test'
import { dismissWalkthrough, registerAndOnboard, signIn } from './helpers.ts'

/** F006 US1: settings stay as the user left them (quickstart scenarios 1–3). */
test('theme and shared board zoom survive a reload and follow the user to another device', async ({ page, browser }) => {
  const user = await registerAndOnboard(page)
  const sidebar = page.locator('.app-sidebar')
  const zoomLabel = page.locator('.ob-board-zoom-label')

  // 1. Theme kept on reload
  await sidebar.getByRole('radio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(sidebar.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')

  // 2. Shared zoom kept on reload, and used by every board
  await expect(zoomLabel).toHaveText('100%')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(zoomLabel).toHaveText('150%')
  await page.waitForTimeout(800) // let the debounced save go out
  await page.reload()
  await expect(zoomLabel).toHaveText('150%')
  await page.goto('#/default-routine')
  await dismissWalkthrough(page)
  await expect(zoomLabel.first()).toHaveText('150%')

  // 3. A second device (fresh browser context, empty storage) gets the same settings
  const device = await browser.newContext()
  const other = await device.newPage()
  await signIn(other, user)
  await expect(other).toHaveURL(/#\/today/)
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(other.locator('.ob-board-zoom-label')).toHaveText('150%')
  await device.close()
})
