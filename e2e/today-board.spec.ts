import { expect, test } from '@playwright/test'
import { registerAndOnboard } from './helpers.ts'

/**
 * F010 UX optimise (specs/.done.F010-ux-optimise/quickstart.md): the Today board is always live (no time
 * slider or Pause), page headers have no Sign out, the task dialog takes hours + minutes and a
 * color, and a narrow toolbar folds its secondary tools into "More".
 */

test('today board: always live, hours + minutes with color, and the "More" menu', async ({ page }) => {
  // 1600px: with the sidebar and chat open, the board toolbar is wide enough for every tool.
  await page.setViewportSize({ width: 1600, height: 900 })
  await registerAndOnboard(page)
  const board = page.locator('.dr-canvas-card')
  const toolbar = board.locator('.ob-board-toolbar')

  // Always live: no slider, no Pause/Resume, no Sign out in the header.
  await expect(page.getByRole('slider')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Pause clock|Resume live/ })).toHaveCount(0)
  await expect(toolbar.getByText('Live', { exact: true })).toBeVisible()
  await expect(page.locator('.page-header').getByRole('button', { name: 'Sign out' })).toHaveCount(0)

  // Wide toolbar: every tool inline, no "More".
  await expect(toolbar.getByRole('button', { name: 'Gap clear' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'More' })).toBeHidden()

  // Task dialog: hours + minutes and a color.
  await board.getByRole('button', { name: '+ Add task' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Deep work')
  await dialog.locator('input[type="time"]').fill('09:00')
  await dialog.getByLabel('hour', { exact: true }).fill('1')
  await dialog.getByLabel('mins', { exact: true }).fill('30')
  const firstSwatch = dialog.getByRole('radiogroup', { name: 'Task color' }).getByRole('radio').first()
  await firstSwatch.click()
  await expect(firstSwatch).toHaveAttribute('aria-checked', 'true')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
  await expect(board.locator('.ob-board-task').filter({ hasText: 'Deep work' }).filter({ hasText: '1h 30m' })).toBeVisible()

  // Narrow toolbar: "+ Add task", "Reflection" and "More" stay; the rest folds into "More".
  await page.setViewportSize({ width: 800, height: 900 })
  const more = toolbar.getByRole('button', { name: 'More' })
  await expect(more).toBeVisible()
  await expect(toolbar.getByRole('button', { name: '+ Add task' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Reflection', exact: true })).toBeVisible()
  await expect(toolbar.locator('.ob-board-tools-inline')).toBeHidden()

  await more.click()
  await expect(more).toHaveAttribute('aria-expanded', 'true')
  const panel = toolbar.locator('.ob-board-more-panel')
  await panel.getByRole('button', { name: 'Gap clear' }).click()
  await expect(panel).toBeHidden()

  await more.click()
  await expect(panel.getByRole('button', { name: /Gap clear/ })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(more).toBeFocused()

  // Default routine: "More" is the last item in its toolbar, so the panel must open towards the
  // left and stay fully inside the board (it was cut off at the board's right edge).
  await page.goto('#/default-routine')
  const routineBoard = page.locator('.ob-timeline-board').first()
  const routineMore = routineBoard.getByRole('button', { name: 'More' })
  await routineMore.click()
  const routinePanel = routineBoard.locator('.ob-board-more-panel')
  await expect(routinePanel).toBeVisible()
  const boardBox = await routineBoard.boundingBox()
  const panelBox = await routinePanel.boundingBox()
  expect(panelBox!.x).toBeGreaterThanOrEqual(boardBox!.x)
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(boardBox!.x + boardBox!.width)
})
