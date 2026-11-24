import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../lib/api.ts'
import { parseGoalSaveResult, toGoal } from './goalPayload.ts'

const saved = { id: 'g-1', goal: 'Run a 10k', howToHelp: null, createdAt: '2026-11-24T09:00:00Z', updatedAt: '2026-11-24T09:00:00Z' }

describe('parseGoalSaveResult', () => {
  it('reads a saved goal', () => {
    expect(parseGoalSaveResult({ goal: saved, review: null })).toEqual({ goal: toGoal(saved), review: null })
  })

  it("reads Buddy's refusal with and without a suggestion", () => {
    expect(
      parseGoalSaveResult({ goal: null, review: { reason: 'Too little sleep.', suggestion: { goal: 'Sleep 7 hours', howToHelp: null } } }),
    ).toEqual({ goal: null, review: { reason: 'Too little sleep.', suggestion: { goal: 'Sleep 7 hours', howToHelp: null } } })
    expect(parseGoalSaveResult({ goal: null, review: { reason: 'No.', suggestion: null } })).toEqual({
      goal: null,
      review: { reason: 'No.', suggestion: null },
    })
    expect(parseGoalSaveResult({ review: { reason: 'No.', suggestion: { goal: '  ' } } }).review?.suggestion).toBeNull()
  })

  it('refuses anything else', () => {
    for (const raw of [null, {}, { goal: null, review: null }, { review: { reason: ' ' } }, 'text']) {
      expect(() => parseGoalSaveResult(raw)).toThrow(ApiError)
    }
  })
})

describe('toGoal', () => {
  it('fills safe defaults for missing fields', () => {
    expect(toGoal(null)).toEqual({ id: '', goal: '', howToHelp: null, createdAt: '', updatedAt: '' })
  })
})
