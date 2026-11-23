import { expect, test, type Locator, type Page } from '@playwright/test'
import { registerAndOnboard } from './helpers.ts'

/**
 * F007 daily reflection (specs/.done.F007-reflection/quickstart.md scenarios 1, 2, 4, 6 and 9–13):
 * the "Reflection" toggle, the single board below 1280px (with the task pop-up) and the
 * Plan | Reality boards side by side from 1280px.
 */

const NARROW = { width: 900, height: 800 }
const WIDE = { width: 1400, height: 900 }

async function addTask(page: Page, addButton: Locator, name: string, start: string, minutes: number) {
  await addButton.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('e.g. Morning walk').fill(name)
  await dialog.locator('input[type="time"]').fill(start)
  await dialog.getByLabel('hour', { exact: true }).fill(String(Math.floor(minutes / 60)))
  await dialog.getByLabel('mins', { exact: true }).fill(String(minutes % 60))
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).toBeHidden()
}

const reflectionToggle = (page: Page) => page.getByRole('button', { name: 'Reflection', exact: true })
const singleAdd = (page: Page) => page.locator('.dr-canvas-card').getByRole('button', { name: '+ Add task' })
/** Task cards inside a board area (the Now/Next footer can repeat a task's name). */
const cards = (scope: Locator) => scope.locator('.ob-board-task')
const strip = (page: Page) => page.getByRole('region', { name: 'Plan vs reality' })

test('narrow: the toggle swaps the board, copies the plan once and shows a status pop-up', async ({ page }) => {
  await page.setViewportSize(NARROW)
  await registerAndOnboard(page)
  const board = page.locator('.dr-canvas-card')
  const toggle = reflectionToggle(page)

  // No tabs any more; the toggle lives in the board toolbar.
  await expect(page.getByRole('tab', { name: 'Reality' })).toHaveCount(0)
  await expect(page.locator('.ob-board-toolbar').getByRole('button', { name: 'Reflection' })).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await addTask(page, singleAdd(page), 'Morning walk', '07:00', 30)
  await expect(cards(board).filter({ hasText: 'Morning walk' })).toBeVisible()

  // Reflection on: a single Reality board, copied once.
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.dr-page')).toHaveAttribute('data-reflection', 'on')
  await expect(page.locator('.dr-page')).toHaveAttribute('data-layout', 'single')
  await expect(page.locator('.rf-badge')).toHaveText('Reality')
  await expect(strip(page).getByText('1 as planned')).toBeVisible()

  await addTask(page, singleAdd(page), 'Coffee with Sam', '16:00', 45)
  await expect(strip(page).getByText('1 unplanned')).toBeVisible()

  // Tapping a reality task shows how it compares; Edit opens the editor.
  await cards(board).filter({ hasText: 'Coffee with Sam' }).click()
  const popup = page.getByRole('dialog', { name: 'Coffee with Sam' })
  await expect(popup).toBeVisible()
  await expect(popup.getByText('Unplanned')).toBeVisible()
  await expect(popup).toContainText('16:00 · 45m')
  await popup.getByRole('button', { name: 'Edit' }).click()
  const editor = page.getByRole('dialog')
  await expect(editor.getByPlaceholder('e.g. Morning walk')).toHaveValue('Coffee with Sam')
  await editor.getByRole('button', { name: 'Cancel' }).click()
  await expect(editor).toBeHidden()
  // Reality tasks have no "done" checks; that belongs to the plan.
  await expect(board.getByRole('button', { name: 'Mark as done' })).toHaveCount(0)

  // Buddy's note sits at the top of the Buddy chat (mock AI is kind and deterministic).
  const note = page.getByRole('region', { name: "Buddy's note" })
  await note.getByRole('button', { name: "Get Buddy's note" }).click()
  await expect(note.getByText(/Nice work today/)).toBeVisible()

  // Reflection off: the plan is untouched.
  await toggle.click()
  await expect(page.locator('.dr-page')).toHaveAttribute('data-reflection', 'off')
  await expect(cards(board).filter({ hasText: 'Morning walk' })).toBeVisible()
  await expect(cards(board).filter({ hasText: 'Coffee with Sam' })).toHaveCount(0)

  // After a reload: still there, not copied again.
  await page.reload()
  await reflectionToggle(page).click()
  await expect(cards(board).filter({ hasText: 'Coffee with Sam' })).toBeVisible()
  await expect(strip(page).getByText('1 as planned')).toBeVisible()
})

test('wide: plan and reality side by side, both editable, scrolling together', async ({ page }) => {
  await page.setViewportSize(WIDE)
  await registerAndOnboard(page)
  await addTask(page, singleAdd(page), 'Morning walk', '07:00', 30)

  await reflectionToggle(page).click()
  await expect(page.locator('.dr-page')).toHaveAttribute('data-layout', 'compare')
  const plan = page.getByRole('region', { name: 'Plan', exact: true })
  const reality = page.getByRole('region', { name: 'Reality', exact: true })
  await expect(cards(plan).filter({ hasText: 'Morning walk' })).toBeVisible()
  await expect(cards(reality).filter({ hasText: 'Morning walk' })).toBeVisible()
  await expect(reality.getByRole('button', { name: 'Mark as done' })).toHaveCount(0)
  await expect(plan.getByRole('button', { name: 'Mark as done' })).toHaveCount(1)
  // One shared toolbar with the toggle.
  await expect(page.locator('.ob-board-toolbar')).toHaveCount(1)
  await expect(reflectionToggle(page)).toHaveAttribute('aria-pressed', 'true')

  // Reality edits stay in reality.
  await addTask(page, reality.getByRole('button', { name: 'Add to reality' }), 'Coffee with Sam', '16:00', 45)
  await expect(cards(reality).filter({ hasText: 'Coffee with Sam' })).toBeVisible()
  await expect(cards(plan).filter({ hasText: 'Coffee with Sam' })).toHaveCount(0)
  await expect(strip(page).getByText('1 unplanned')).toBeVisible()

  // Plan edits stay in the plan, and the summary updates.
  await addTask(page, plan.getByRole('button', { name: 'Add to plan' }), 'Read', '21:00', 30)
  await expect(cards(plan).filter({ hasText: 'Read' })).toBeVisible()
  await expect(cards(reality).filter({ hasText: 'Read' })).toHaveCount(0)
  await expect(strip(page).getByText('1 skipped')).toBeVisible()

  // Scrolling one board scrolls the other.
  const planScroll = plan.locator('.ob-board-scroll')
  const realityScroll = reality.locator('.ob-board-scroll')
  await planScroll.evaluate((element) => {
    element.scrollTop = 500
    element.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => realityScroll.evaluate((element) => element.scrollTop)).toBe(500)

  // Narrowing the window keeps reflection on and swaps to the single board.
  await page.setViewportSize(NARROW)
  await expect(page.locator('.dr-page')).toHaveAttribute('data-layout', 'single')
  await expect(page.locator('.dr-page')).toHaveAttribute('data-reflection', 'on')
  await expect(cards(page.locator('.dr-canvas-card')).filter({ hasText: 'Coffee with Sam' })).toBeVisible()
})

test('future days cannot be reflected on', async ({ page }) => {
  await page.setViewportSize(NARROW)
  await registerAndOnboard(page)
  await reflectionToggle(page).click()
  await expect(page.locator('.dr-page')).toHaveAttribute('data-reflection', 'on')

  await page.getByRole('button', { name: 'Next day' }).click()
  await expect(reflectionToggle(page)).toBeDisabled()
  await expect(page.locator('.dr-page')).toHaveAttribute('data-reflection', 'off')
  await expect(page.getByText('You can reflect once the day has happened.')).toBeVisible()
})
