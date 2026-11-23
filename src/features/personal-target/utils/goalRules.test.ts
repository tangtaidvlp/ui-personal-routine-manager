import { describe, expect, it } from 'vitest'
import { GOAL_MAX, GOAL_REQUIRED, GOAL_TOO_LONG, HELP_MAX, HELP_TOO_LONG, validateGoal } from './goalRules.ts'

describe('validateGoal', () => {
  it('requires a goal', () => {
    expect(validateGoal(null, null)).toEqual({ ok: false, message: GOAL_REQUIRED })
    expect(validateGoal(undefined, 'help')).toEqual({ ok: false, message: GOAL_REQUIRED })
    expect(validateGoal('', null)).toEqual({ ok: false, message: GOAL_REQUIRED })
    expect(validateGoal('   \n\t ', 'help')).toEqual({ ok: false, message: GOAL_REQUIRED })
  })

  it('allows up to 150 characters after trimming', () => {
    const max = 'g'.repeat(GOAL_MAX)
    expect(validateGoal(`  ${max}  `, null)).toEqual({ ok: true, value: { goal: max, howToHelp: null } })
    expect(validateGoal('g'.repeat(GOAL_MAX + 1), null)).toEqual({ ok: false, message: GOAL_TOO_LONG })
  })

  it('treats a blank help text as none', () => {
    expect(validateGoal('Run', '')).toEqual({ ok: true, value: { goal: 'Run', howToHelp: null } })
    expect(validateGoal('Run', '   ')).toEqual({ ok: true, value: { goal: 'Run', howToHelp: null } })
    expect(validateGoal('Run', undefined)).toEqual({ ok: true, value: { goal: 'Run', howToHelp: null } })
  })

  it('allows up to 500 characters of help after trimming', () => {
    const max = 'h'.repeat(HELP_MAX)
    expect(validateGoal('Run', ` ${max} `)).toEqual({ ok: true, value: { goal: 'Run', howToHelp: max } })
    expect(validateGoal('Run', 'h'.repeat(HELP_MAX + 1))).toEqual({ ok: false, message: HELP_TOO_LONG })
  })

  it('trims both texts', () => {
    expect(validateGoal('  Run a 10k by March ', '\n Keep me training  ')).toEqual({
      ok: true,
      value: { goal: 'Run a 10k by March', howToHelp: 'Keep me training' },
    })
  })
})
