import { useState, useTransition } from 'react'
import type { BuddyToneId } from '../../settings/types/settings.ts'
import { BUDDY_TONES } from '../utils/buddyTones.ts'

type BuddyTonePickerProps = {
  /** The saved tone. */
  value: BuddyToneId
  /** Saves the tone; rejects when it couldn't be saved. */
  onChange: (tone: BuddyToneId) => Promise<void>
}

type SaveState = 'idle' | 'saved' | 'error'

/**
 * Buddy's tone as six radio cards (specs/F014 US1, contracts/ui.md). Picking one saves it at once.
 * A failed save puts the previous tone back: Buddy reads the tone from the server, so an unsaved
 * choice would have no effect (research R3).
 */
function BuddyTonePicker({ value, onChange }: BuddyTonePickerProps) {
  const [selected, setSelected] = useState<BuddyToneId>(value)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [isSaving, startSaving] = useTransition()

  const handleChange = (tone: BuddyToneId) => {
    if (tone === selected) return
    const previous = selected
    setSelected(tone)
    setSaveState('idle')
    startSaving(async () => {
      try {
        await onChange(tone)
        setSaveState('saved')
      } catch {
        setSelected(previous)
        setSaveState('error')
      }
    })
  }

  return (
    <div className="pt-tone">
      <fieldset className="pt-tone-group" disabled={isSaving}>
        <legend className="visually-hidden">Buddy tone</legend>
        {BUDDY_TONES.map((tone) => (
          <label key={tone.id} className={`pt-tone-option${selected === tone.id ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="buddy-tone"
              value={tone.id}
              checked={selected === tone.id}
              onChange={() => handleChange(tone.id)}
              aria-labelledby={`pt-tone-${tone.id}-name`}
              aria-describedby={`pt-tone-${tone.id}-desc`}
            />
            <span className="pt-tone-body">
              <span id={`pt-tone-${tone.id}-name`} className="pt-tone-name">
                {tone.name}
                {tone.isDefault ? <span className="ui-pill pt-tone-default">Default</span> : null}
              </span>
              <span id={`pt-tone-${tone.id}-desc`} className="pt-tone-desc">
                <span className="pt-tone-vibe">{tone.vibe}</span>
                <span className="pt-tone-best">Best for: {tone.bestFor}</span>
                <span className="pt-tone-example">“{tone.example}”</span>
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="pt-note" role="status">
        {saveState === 'saved' ? 'Saved.' : null}
      </p>
      {saveState === 'error' ? (
        <p className="pt-error" role="alert">
          Couldn&apos;t save your tone. Please try again.
        </p>
      ) : null}
    </div>
  )
}

export default BuddyTonePicker
