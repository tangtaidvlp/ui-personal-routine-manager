/** Account-level UI settings (specs/.done.F006-user-profile-configuration-store, data-model §2–3). */

/** 'system' = follow the operating system's light/dark setting. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** Buddy's tone (specs/.done.F014-buddy-tone). Ids are stored on the server: never rename one. */
export type BuddyToneId = 'BALANCED' | 'CHIEF_OF_STAFF' | 'STOIC' | 'SOCRATIC_PEER' | 'WARM_ANCHOR' | 'ACCOUNTABILITY_COACH'

export type UserSettings = {
  theme: ThemePreference
  /** Shared by every task board: 0.5–3.0 in 0.25 steps. */
  boardZoom: number
  /** How Buddy talks (F014). Saved from the Personal Target page, not through the settings store. */
  buddyTone: BuddyToneId
}

export type SettingKey = keyof UserSettings

export type UserSettingsView = {
  settings: UserSettings
  /** Keys the user has saved on their account (the rest are defaults). */
  customized: string[]
}

/** Theme values on the wire (contracts/settings-api.md). */
export type ApiTheme = 'LIGHT' | 'DARK' | 'SYSTEM'
