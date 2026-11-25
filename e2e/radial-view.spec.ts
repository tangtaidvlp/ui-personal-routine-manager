import { expect, test } from '@playwright/test'
import { registerAndOnboard } from './helpers.ts'

/** F016 Radial 24H View (specs/F016-radial-24h-view/quickstart.md rows 1-6). */

test('Today circle view', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await registerAndOnboard(page)
  const board = page.locator('.dr-canvas-card')

  await board.getByRole('button', { name: '+ Add task' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Circle task')
  await dialog.locator('input[type="time"]').fill('09:00')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()

  const circle = page.getByRole('button', { name: 'Circle', exact: true })
  await circle.click()
  await expect(circle).toHaveAttribute('aria-pressed', 'true')
  const label = page.getByRole('button', { name: /^Circle task, 09:00 to/ })
  await expect(label).toBeVisible()

  // Clicking a label opens the task dialog.
  await label.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /cancel|close/i }).first().click()
  await expect(dialog).toBeHidden()

  // The choice survives a reload.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Circle', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^Circle task, 09:00 to/ })).toBeVisible()

  // A second task at 09:45: dragging past it must still save (the arc order in the DOM must not move the dragged arc).
  await board.getByRole('button', { name: '+ Add task' }).click()
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Blocker')
  await dialog.locator('input[type="time"]').fill('09:45')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: /^Blocker, 09:45 to/ })).toBeVisible()

  // Dragging the arc one hour clockwise moves the task to 10:00 (the svg is decorative, so locate the arc by class).
  const centre = await page.locator('.rv-centre').boundingBox()
  if (!centre) throw new Error('circle not rendered')
  const cx = centre.x + centre.width / 2
  const cy = centre.y + centre.height / 2
  // Arcs have no name and their DOM order is by id: take the one earliest on the clock (09:00, not 09:45).
  const boxes = await page.locator('.rv-arc').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()))
  const clockAngle = (b: { x: number; y: number; width: number; height: number }) =>
    (Math.atan2(b.x + b.width / 2 - cx, cy - (b.y + b.height / 2)) + 2 * Math.PI) % (2 * Math.PI)
  const arc = boxes.sort((p, q) => clockAngle(p) - clockAngle(q))[0]
  const gx = arc.x + arc.width / 2
  const gy = arc.y + arc.height / 2
  const turn = Math.PI / 12 // 15° = 1 hour
  const tx = cx + (gx - cx) * Math.cos(turn) - (gy - cy) * Math.sin(turn)
  const ty = cy + (gx - cx) * Math.sin(turn) + (gy - cy) * Math.cos(turn)
  await page.mouse.move(gx, gy)
  await page.mouse.down()
  await page.mouse.move(tx, ty, { steps: 10 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: /^Circle task, 10:00 to/ })).toBeVisible()
  await expect(dialog).toBeHidden()

  // Back to the timeline.
  await page.getByRole('button', { name: 'Timeline', exact: true }).click()
  await expect(page.locator('.dr-page')).toHaveAttribute('data-board-view', 'vertical')
  await expect(page.locator('.ob-board-task').filter({ hasText: 'Circle task' })).toBeVisible()
})

test('Default routine circle view', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await registerAndOnboard(page)
  // Circle chosen on Today is also the view on Default routine.
  await page.getByRole('button', { name: 'Circle', exact: true }).click()
  await page.goto('#/default-routine')
  await expect(page.getByRole('button', { name: 'Circle', exact: true })).toHaveAttribute('aria-pressed', 'true')

  const dialog = page.getByRole('dialog')
  await page.locator('.ob-canvas-card').getByRole('button', { name: '+ Add task' }).click()
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Weekday only')
  await dialog.locator('input[type="time"]').fill('05:00')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
  const label = page.getByRole('button', { name: /^Weekday only, 05:00 to/ })
  await expect(label).toBeVisible()

  await page.getByRole('tab', { name: 'Weekend' }).click()
  await expect(label).toBeHidden()
  await page.getByRole('tab', { name: 'Weekday' }).click()

  await label.click()
  await expect(dialog).toBeVisible()
})

test('Hide Buddy chat', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await registerAndOnboard(page)
  const input = page.getByPlaceholder(/^Try:/)
  await expect(input).toBeVisible()
  await input.fill('unsent draft')

  await page.getByRole('button', { name: 'Hide Buddy chat' }).click()
  await expect(input).toBeHidden()
  const show = page.getByRole('button', { name: 'Show Buddy chat' })
  await expect(show).toBeFocused()

  // Still hidden after a reload, and focus is not stolen on load.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Show Buddy chat' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show Buddy chat' })).not.toBeFocused()

  await page.getByRole('button', { name: 'Show Buddy chat' }).click()
  await expect(input).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hide Buddy chat' })).toBeFocused()

  // The chat stays mounted while hidden, so unsent text survives a hide/show cycle.
  await input.fill('second draft')
  await page.getByRole('button', { name: 'Hide Buddy chat' }).click()
  await expect(input).toBeHidden()
  await page.getByRole('button', { name: 'Show Buddy chat' }).click()
  await expect(input).toHaveValue('second draft')
})
