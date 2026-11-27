import { OVERNIGHT_TASKS_ENABLED } from '../../../config/featureFlags.ts'

const MINUTES_PER_DAY = 1440

/**
 * Whether a task may end after 24:00: overnight tasks are on (`OVERNIGHT_TASKS_ENABLED`), or this one
 * already crosses midnight (F011; existing overnight tasks are left as they are). Minutes from 00:00.
 */
export const mayCrossMidnight = (start: number, duration: number, overnight = OVERNIGHT_TASKS_ENABLED) =>
  overnight || start + duration > MINUTES_PER_DAY
