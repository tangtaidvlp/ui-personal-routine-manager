import type { BuddyToneId } from '../../settings/types/settings.ts'

/** What the tone picker shows for each tone (specs/.done.F014-buddy-tone, spec.md "Tone catalogue"). */
export type BuddyToneInfo = {
  id: BuddyToneId
  name: string
  vibe: string
  bestFor: string
  example: string
  isDefault: boolean
}

export const BUDDY_TONES: readonly BuddyToneInfo[] = [
  {
    id: 'BALANCED',
    name: 'Balanced',
    vibe: 'Friendly, pragmatic, concise. Offers one clear recommendation.',
    bestFor: 'Everyday use.',
    example: 'Morning! Your first focus block starts at 9:00. I’d do the report first and move the emails to after lunch. Sound good?',
    isDefault: true,
  },
  {
    id: 'CHIEF_OF_STAFF',
    name: 'Tactical Chief of Staff',
    vibe: 'Crisp, structured, proactive, zero-fluff.',
    bestFor: 'Morning briefings, time-blocking, reprioritising a derailed schedule.',
    example: 'You have 90 minutes before your next block. Knock out the API refactor now, and push the admin tasks to 4:00 PM.',
    isDefault: false,
  },
  {
    id: 'STOIC',
    name: 'Grounded Stoic',
    vibe: 'Calm, objective, non-judgmental, steady.',
    bestFor: 'Missed habits, high stress, recovery days.',
    example: 'You missed yesterday’s workout. That’s data, not failure. Let’s scale today’s session to 20 minutes to rebuild momentum.',
    isDefault: false,
  },
  {
    id: 'SOCRATIC_PEER',
    name: 'Socratic Peer',
    vibe: 'Curious, analytical, collaborative.',
    bestFor: 'Weekly retrospectives, habit troubleshooting, goal alignment.',
    example: 'You’ve pushed deep work past 8:00 PM three days in a row. Is your afternoon energy dipping, or is the task scope too vague?',
    isDefault: false,
  },
  {
    id: 'WARM_ANCHOR',
    name: 'Warm Anchor',
    vibe: 'Encouraging, gentle, low-friction, empathetic.',
    bestFor: 'Burnout recovery, wind-down routines, low-energy mornings.',
    example: 'Rough sleep last night. Keep today’s bar low: hydrate, clear your top one priority, and close the laptop by 6:00 PM.',
    isDefault: false,
  },
  {
    id: 'ACCOUNTABILITY_COACH',
    name: 'High-Accountability Coach',
    vibe: 'Direct, challenging, energetic, firm.',
    bestFor: 'Procrastination loops, physical training, strict deadline sprints.',
    example: 'You’ve snoozed this block twice. Put the phone in another room, set a 25-minute timer, and start.',
    isDefault: false,
  },
]

export function toneById(id: BuddyToneId): BuddyToneInfo {
  return BUDDY_TONES.find((tone) => tone.id === id) ?? BUDDY_TONES[0]
}
