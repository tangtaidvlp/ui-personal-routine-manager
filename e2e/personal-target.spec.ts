import { expect, test } from '@playwright/test'
import { registerAndOnboard } from './helpers.ts'

/** F013 US1: keep up to 3 goals on the Personal Target page (quickstart A1–A4). */
test('personal target: add, edit, limit and delete goals', async ({ page }) => {
  await registerAndOnboard(page)

  await page.locator('.app-sidebar').getByRole('link', { name: 'Personal Target' }).click()
  await expect(page).toHaveURL(/#\/personal-target/)
  const goals = page.getByRole('region', { name: 'Your goals' })
  await expect(goals.getByText("You haven't set any goals yet.")).toBeVisible()

  // Add a goal; it survives a reload.
  await goals.getByRole('button', { name: 'Add goal' }).click()
  await goals.getByLabel('Goal', { exact: true }).fill('  Run a 10k by March  ')
  await goals.getByLabel('How should Buddy help? (optional)').fill('Keep me training 3 times a week')
  await goals.getByRole('button', { name: 'Save' }).click()
  await expect(goals.getByText('Run a 10k by March')).toBeVisible()
  await page.reload()
  await expect(goals.getByText('Run a 10k by March')).toBeVisible()
  await expect(goals.getByText('Keep me training 3 times a week')).toBeVisible()

  // Edit it.
  await goals.getByRole('button', { name: 'Edit goal: Run a 10k by March' }).click()
  await goals.getByLabel('Goal', { exact: true }).fill('Run a half marathon')
  await goals.getByRole('button', { name: 'Save' }).click()
  await expect(goals.getByText('Run a half marathon')).toBeVisible()

  // A blank goal is refused on the spot.
  await goals.getByRole('button', { name: 'Add goal' }).click()
  await goals.getByRole('button', { name: 'Save' }).click()
  await expect(goals.getByText('Goal is required.')).toBeVisible()
  await goals.getByLabel('Goal', { exact: true }).fill('Sleep by 11 PM')
  await goals.getByRole('button', { name: 'Save' }).click()

  // The third goal reaches the limit.
  await goals.getByRole('button', { name: 'Add goal' }).click()
  await goals.getByLabel('Goal', { exact: true }).fill('Read 20 pages a day')
  await goals.getByRole('button', { name: 'Save' }).click()
  await expect(goals.getByText('Read 20 pages a day')).toBeVisible()
  await expect(goals.getByRole('button', { name: 'Add goal' })).toBeDisabled()
  await expect(goals.getByText('You can have up to 3 goals.')).toBeVisible()

  // Delete: Cancel keeps the goal, Delete removes it.
  await goals.getByRole('button', { name: 'Delete goal: Sleep by 11 PM' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(goals.getByText('Sleep by 11 PM')).toBeVisible()
  await goals.getByRole('button', { name: 'Delete goal: Sleep by 11 PM' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(goals.getByText('Sleep by 11 PM')).toHaveCount(0)
  await expect(goals.getByRole('button', { name: 'Add goal' })).toBeEnabled()
})

/** F014 US1: choose Buddy's tone; it is saved to the account (quickstart A1–A2). */
test('personal target: choose Buddy tone and keep it after a reload', async ({ page }) => {
  await registerAndOnboard(page)

  await page.locator('.app-sidebar').getByRole('link', { name: 'Personal Target' }).click()
  const tone = page.getByRole('region', { name: 'Buddy tone' })
  await expect(tone.getByRole('radio')).toHaveCount(6)
  await expect(tone.getByRole('radio', { name: /Balanced/ })).toBeChecked()

  await tone.getByRole('radio', { name: 'Warm Anchor' }).check()
  await expect(tone.getByText('Saved.')).toBeVisible()

  await page.reload()
  await expect(tone.getByRole('radio', { name: 'Warm Anchor' })).toBeChecked()
  await expect(tone.getByRole('radio', { name: /Balanced/ })).not.toBeChecked()
})

/** F013 US4: chat with Buddy about goals on the page; the conversation is kept (quickstart E1). */
test('personal target: chat with Buddy and keep the conversation', async ({ page }) => {
  await registerAndOnboard(page)

  await page.locator('.app-sidebar').getByRole('link', { name: 'Personal Target' }).click()
  const input = page.getByPlaceholder('Try: "Help me set a sleep goal"')
  await input.fill('help me set a sleep goal')
  await page.getByRole('button', { name: 'Send message' }).click()
  // The test backend uses the mock AI, which echoes the message.
  await expect(page.getByText(/Mock goals response .*help me set a sleep goal/)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/Mock goals response .*help me set a sleep goal/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your goals' })).toBeVisible()
})

/** F013 US5: Buddy checks a goal on save; a refused goal isn't saved (quickstart F1–F2). */
test('personal target: Buddy refuses an unrealistic goal and its suggestion can be saved', async ({ page }) => {
  await registerAndOnboard(page)

  await page.locator('.app-sidebar').getByRole('link', { name: 'Personal Target' }).click()
  const goals = page.getByRole('region', { name: 'Your goals' })
  await goals.getByRole('button', { name: 'Add goal' }).click()
  // The test backend's mock reviewer refuses text containing "impossible".
  await goals.getByLabel('Goal', { exact: true }).fill('Do the impossible every day')
  await goals.getByRole('button', { name: 'Save' }).click()

  const review = goals.getByRole('alert')
  await expect(review).toContainText("Buddy can't save this goal yet")
  await expect(goals.getByLabel('Goal', { exact: true })).toHaveValue('Do the impossible every day')

  await review.getByRole('button', { name: 'Use suggestion' }).click()
  await expect(goals.getByLabel('Goal', { exact: true })).toHaveValue('Take one small step toward it each day')
  await goals.getByRole('button', { name: 'Save' }).click()
  await expect(goals.getByText('Take one small step toward it each day')).toBeVisible()
  await expect(goals.getByText('1/3')).toBeVisible()
})
