import { expect, type Page } from '@playwright/test'

/** Shared steps for the F006 headless checks (quickstart.md). */

export type TestUser = { name: string; email: string; password: string }

export function newTestUser(): TestUser {
  const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return { name: `E2E ${tag}`, email: `e2e-${tag}@example.com`, password: 'Passw0rd!e2e' }
}

/** Closes the intro slides / guided tour if they are showing. */
export async function dismissWalkthrough(page: Page) {
  for (const name of ['Skip', 'Got it']) {
    const button = page.getByRole('button', { name, exact: true })
    if (await button.isVisible().catch(() => false)) {
      await button.click()
    }
  }
}

export async function signIn(page: Page, user: TestUser) {
  await page.goto('#/auth')
  const form = page.locator('.signin-section')
  await form.getByPlaceholder('Email Address').fill(user.email)
  await form.getByPlaceholder('Password').fill(user.password)
  await form.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page).not.toHaveURL(/#\/auth/)
}

/** Registers a fresh user, signs in and finishes onboarding; ends on #/today. */
export async function registerAndOnboard(page: Page): Promise<TestUser> {
  const user = newTestUser()
  await page.goto('#/auth')
  await page.locator('.auth-toggle').getByRole('button', { name: 'SIGN UP' }).click()
  const form = page.locator('.signup-section')
  await form.getByPlaceholder('Full Name').fill(user.name)
  await form.getByPlaceholder('Email Address').fill(user.email)
  await form.getByPlaceholder('Create Password').fill(user.password)
  await form.getByRole('button', { name: 'Create Account' }).click()
  await expect(page.getByText(/registered successfully/i)).toBeVisible()

  await signIn(page, user)
  await expect(page).toHaveURL(/#\/onboarding/)
  await dismissWalkthrough(page)
  await page.getByRole('button', { name: 'Ready to roll' }).click()
  await expect(page).toHaveURL(/#\/today/)
  return user
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).first().click()
  await expect(page).toHaveURL(/#\/auth/)
}
