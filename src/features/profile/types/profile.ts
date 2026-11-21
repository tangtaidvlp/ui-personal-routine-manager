/** Profile view (specs/F006 contracts/settings-api.md "GET /profile"). */
export type UserPlan = { code: string; name: string }

export type UserProfile = {
  id: string
  username: string
  email: string
  plan: UserPlan
}

/** Everyone is on the Free plan in F006 (FR-004). */
export const FREE_PLAN: UserPlan = { code: 'FREE', name: 'Free plan' }
