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
  await expect(toolbar.getByRole('button', { name: 'Push mode' })).toBeVisible()
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
  await panel.getByRole('button', { name: 'Push mode' }).click()
  await expect(panel).toBeHidden()

  await more.click()
  await expect(panel.getByRole('button', { name: /Push mode/ })).toHaveAttribute('aria-pressed', 'true')
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

// F011 (specs/.done.F011-sleep-task): one task crossing midnight is drawn as two linked parts and stays one task.
test('today board: an overnight task is one task in two parts', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await registerAndOnboard(page)
  const board = page.locator('.dr-canvas-card')

  await board.getByRole('button', { name: '+ Add task' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Sleep')
  await dialog.locator('input[type="time"]').fill('22:00')
  await dialog.getByLabel('hour', { exact: true }).fill('8')
  await dialog.getByLabel('mins', { exact: true }).fill('0')
  await expect(dialog.getByText('Ends 06:00 (next day)')).toBeVisible()
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()

  const sleepParts = board.getByText('22:00 – 06:00 · 8h')
  await expect(sleepParts).toHaveCount(2)
  await expect(board.getByRole('button', { name: 'Delete Sleep' })).toHaveCount(1)

  await page.reload()
  await expect(sleepParts).toHaveCount(2)
  await expect(board.getByRole('button', { name: 'Delete Sleep' })).toHaveCount(1)

  // Clicking the after-midnight part edits the same task, and doesn't also open "Add task".
  await sleepParts.nth(1).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.getByRole('dialog').getByPlaceholder('e.g. Morning walk')).toHaveValue('Sleep')
})

// F012 (specs/.done.F012-make-reset-day-reset-to-default-routine): Reset day replaces the plan with the default routine.
test('today board: Reset day replaces the day with the default routine after confirming', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await registerAndOnboard(page)

  // Give the Weekday routine one task and copy it to the Weekend, so Today resets to it on any day
  // of the week. Today was already created from the empty routine.
  await page.goto('#/default-routine')
  const routineCard = page.locator('.ob-canvas-card')
  await routineCard.locator('.ob-card-header').getByRole('button', { name: '+ Add task' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Template walk')
  await dialog.locator('input[type="time"]').fill('07:00')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
  // No Reset day on setup boards (FR-009).
  await expect(page.getByRole('button', { name: 'Reset day' })).toHaveCount(0)

  // Copy Weekday to Weekend (US2): confirm, then the Weekend tab shows the Weekday task.
  await routineCard.locator('.ob-board-tools-inline').getByRole('button', { name: 'Copy Weekday to Weekend' }).click()
  const copyConfirm = page.getByRole('alertdialog')
  await copyConfirm.getByRole('button', { name: 'Copy' }).click()
  await expect(copyConfirm).toBeHidden()
  await page.getByRole('tab', { name: 'Weekend' }).click()
  await expect(routineCard.getByText('Template walk').first()).toBeVisible()

  await page.goto('#/today')
  const board = page.locator('.dr-canvas-card')
  const toolbar = board.locator('.ob-board-toolbar')
  await board.getByRole('button', { name: '+ Add task' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Day only')
  await dialog.locator('input[type="time"]').fill('12:00')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
  await expect(board.getByText('Day only', { exact: true })).toBeVisible()

  // Cancel (Escape) changes nothing and gives focus back to the button.
  const resetButton = toolbar.locator('.ob-board-tools-inline').getByRole('button', { name: 'Reset day' })
  await resetButton.click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('fresh copy of your default routine')
  await page.keyboard.press('Escape')
  await expect(confirm).toBeHidden()
  await expect(resetButton).toBeFocused()
  await expect(board.getByText('Day only', { exact: true })).toBeVisible()

  // Confirm: the day becomes the Weekday routine, also after a reload.
  await resetButton.click()
  await confirm.getByRole('button', { name: 'Reset day' }).click()
  await expect(confirm).toBeHidden()
  await expect(board.getByText('Day only', { exact: true })).toHaveCount(0)
  await expect(board.getByText('Template walk', { exact: true }).first()).toBeVisible()
  await page.reload()
  await expect(board.getByText('Template walk', { exact: true }).first()).toBeVisible()
  await expect(board.getByText('Day only', { exact: true })).toHaveCount(0)

  // Past days can't be reset.
  await page.getByRole('button', { name: 'Previous day' }).click()
  await expect(resetButton).toBeDisabled()
})

// T002 (specs/T002-improvement-for-ux-at-timeline-change): mouse drag (the hold is touch only, checked by hand), Push mode notice, a failed save reverts.
test('today board: mouse drag, push mode notice, failed save reverts', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await registerAndOnboard(page)
  const board = page.locator('.dr-canvas-card')

  await board.getByRole('button', { name: '+ Add task' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Morning walk').fill('Hold me')
  await dialog.locator('input[type="time"]').fill('09:00')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()

  const task = board.locator('.ob-board-task').filter({ hasText: 'Hold me' })
  const timeLabel = task.locator('.ob-board-task-time')
  await expect(timeLabel).toContainText('09:00')

  // The board is 2400px tall at zoom 1.0: 100px per hour.
  const centre = async () => {
    await task.scrollIntoViewIfNeeded()
    const box = (await task.boundingBox())!
    return { x: box.x + box.width / 2, y: box.y + 20 }
  }
  // With a mouse there is no hold: pressing and moving drags at once (the hold is touch only).
  const mouseDrag = async (hours: number) => {
    const { x, y } = await centre()
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + hours * 100, { steps: 10 })
    await page.mouse.up()
  }

  // Move down one hour: the new time shows and survives a reload.
  await mouseDrag(1)
  await expect(timeLabel).toContainText('10:00')
  await page.reload()
  await expect(timeLabel).toContainText('10:00')

  // Push mode on: the status notice appears.
  await board.locator('.ob-board-toolbar').getByRole('button', { name: 'Push mode' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Push mode is on' })).toBeVisible()

  // A failed save puts the task back and shows an alert.
  await page.route('**/daily-routine/tasks', (route) => route.abort())
  await mouseDrag(1)
  await expect(timeLabel).toContainText('10:00')
  await expect(page.getByRole('alert').filter({ hasText: "Your change wasn't saved" })).toBeVisible()
})

// F017 (specs/F017-task-overlay): the Overlay switch is saved, and an Overlay-off task swaps instead of overlapping.
test('today board: Overlay switch is saved, Overlay-off tasks swap on drag', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await registerAndOnboard(page)
  const board = page.locator('.dr-canvas-card')
  const dialog = page.getByRole('dialog')

  const addTask = async (name: string, start: string, hours: string, mins: string, overlay = false) => {
    await board.getByRole('button', { name: '+ Add task' }).click()
    await dialog.getByPlaceholder('e.g. Morning walk').fill(name)
    await dialog.locator('input[type="time"]').fill(start)
    await dialog.getByLabel('hour', { exact: true }).fill(hours)
    await dialog.getByLabel('mins', { exact: true }).fill(mins)
    const overlaySwitch = dialog.getByRole('switch', { name: /Overlay/ })
    await expect(overlaySwitch).not.toBeChecked() // off for a new task
    if (overlay) await overlaySwitch.check()
    await dialog.locator('button[type="submit"]').click()
    await expect(dialog).toBeHidden()
  }

  await addTask('Swap A', '09:00', '1', '0')
  await addTask('Swap B', '10:30', '0', '30')
  await addTask('Overlay on', '14:00', '1', '0', true)

  // The switch is saved: reload, reopen.
  await page.reload()
  const taskA = board.locator('.ob-board-task').filter({ hasText: 'Swap A' })
  const taskB = board.locator('.ob-board-task').filter({ hasText: 'Swap B' })
  const onTask = board.locator('.ob-board-task').filter({ hasText: 'Overlay on' })
  await onTask.scrollIntoViewIfNeeded()
  await onTask.click({ position: { x: 20, y: 20 } })
  await expect(dialog.getByRole('switch', { name: /Overlay/ })).toBeChecked()
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  // Drag A down 1h (its end passes B's midpoint): A and B swap, B keeps its place relative to the gap.
  await taskA.scrollIntoViewIfNeeded()
  const box = (await taskA.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + 20
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 100, { steps: 10 })
  await page.mouse.up()
  await expect(taskA.locator('.ob-board-task-time')).toContainText('10:00')
  await expect(taskB.locator('.ob-board-task-time')).toContainText('09:00')

  await page.reload()
  await expect(taskA.locator('.ob-board-task-time')).toContainText('10:00')
  await expect(taskB.locator('.ob-board-task-time')).toContainText('09:00')
})
