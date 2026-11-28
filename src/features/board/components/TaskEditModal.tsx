import { useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../../lib/api.ts'
import styles from './TaskEditModal.module.css'
import ConfirmDialog from '../../../components/ConfirmDialog.tsx'
import PaletteSwatches from '../../palette/components/PaletteSwatches.tsx'
import { usePalette } from '../../palette/hooks/usePalette.ts'
import { endsLabel, joinDuration, splitDuration } from '../utils/duration.ts'
import { mayCrossMidnight } from '../utils/overnight.ts'

export type TaskFormValue = {
  id?: string
  name: string
  startTime: string
  durationMinutes: number
  description?: string
  /** Palette id or #RRGGBB (specs/F005). */
  color?: string | null
  /** F017: may overlap other tasks. */
  overlay?: boolean
}

/** "HH:mm" → minutes from 00:00. */
const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export type TaskEditModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  draftTask: TaskFormValue | null
  onClose: () => void
  onSubmitTask: (mode: 'create' | 'edit', task: TaskFormValue) => Promise<unknown>
  onSaved: () => void | Promise<void>
  onDeleteTask?: (task: TaskFormValue) => void
  showColor?: boolean
  /** Default true. False hides the Overlay switch (Reality tasks). */
  showOverlay?: boolean
}

function TaskEditModal({ isOpen, mode, draftTask, onClose, onSubmitTask, onSaved, onDeleteTask, showColor = true, showOverlay = true }: TaskEditModalProps) {
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  // Duration is entered as hours + minutes and saved as total minutes (F010 US4).
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(30)
  const hoursId = useId()
  const minutesId = useId()
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [overlay, setOverlay] = useState(false)
  const overlayId = useId()
  const { palette } = usePalette()
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setName(draftTask?.name ?? '')
    setStartTime(draftTask?.startTime ?? '09:00')
    const duration = splitDuration(draftTask?.durationMinutes ?? 30)
    setHours(duration.hours)
    setMinutes(duration.minutes)
    setDescription(draftTask?.description ?? '')
    // Create drafts arrive with the routine's next round-robin colour pre-selected (FR-004).
    setColor(draftTask?.color ?? null)
    setOverlay(draftTask?.overlay ?? false)
    setError(null)
  }, [isOpen, draftTask])

  if (!isOpen) {
    return null
  }

  // Read-only end time; an overnight task ends the next day (F011).
  const ends = endsLabel(startTime, joinDuration(hours, minutes))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Give this task a name.')
      return
    }
    const durationMinutes = joinDuration(hours, minutes)
    if (durationMinutes < 1 || durationMinutes > 1440) {
      setError('Duration must be between 1 minute and 24 hours.')
      return
    }
    // With overnight tasks off, a new task, or one that ended by 24:00, must end by 24:00 (featureFlags).
    const original = draftTask?.id !== undefined ? draftTask : { startTime: '00:00', durationMinutes: 0 }
    if (!mayCrossMidnight(toMinutes(original.startTime), original.durationMinutes) && toMinutes(startTime) + durationMinutes > 1440) {
      setError('The task must end by 24:00.')
      return
    }

    const task: TaskFormValue = {
      id: draftTask?.id,
      name: trimmedName,
      startTime,
      durationMinutes,
      description: description.trim() || undefined,
      color: color ?? undefined,
      ...(showOverlay ? { overlay } : {}),
    }

    setIsSaving(true)
    setError(null)
    try {
      await onSubmitTask(mode, task)
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save task.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="ob-modal-backdrop" onClick={onClose}>
        <div className="ob-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="ob-modal-header">
            <h2>{mode === 'create' ? 'Add a task' : 'Edit task'}</h2>
            <button type="button" className="ob-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {/* noValidate: handleSubmit checks every field; the browser would also refuse minutes off the 5-minute step (e.g. 7). */}
          <form className="ob-modal-body" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="ob-modal-error" role="alert">
                {error}
              </div>
            )}

            <label className="ob-modal-field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Morning walk"
                autoFocus
              />
            </label>

            <div className="ob-modal-field-row">
              <label className="ob-modal-field">
                <span>Start time</span>
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </label>

              <fieldset className={`ob-modal-field ${styles.duration}`}>
                <legend>Duration</legend>
                <div className={styles.durationInputs}>
                  <input
                    id={hoursId}
                    type="number"
                    min={0}
                    max={24}
                    step={1}
                    value={Number.isNaN(hours) ? '' : hours}
                    onChange={(event) => setHours(event.target.valueAsNumber)}
                  />
                  <label htmlFor={hoursId}>hour</label>
                  <input
                    id={minutesId}
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={Number.isNaN(minutes) ? '' : minutes}
                    onChange={(event) => setMinutes(event.target.valueAsNumber)}
                  />
                  <label htmlFor={minutesId}>mins</label>
                </div>
                {ends && <p className={styles.durationEnds}>{ends}</p>}
              </fieldset>
            </div>

            {showOverlay && (
              <div className={styles.overlayRow}>
                <label htmlFor={overlayId} className={styles.overlayText}>
                  <span className={styles.overlayLabel}>Overlay</span>
                  <span className={styles.overlayHint}>Allow this task to overlap other tasks</span>
                </label>
                <input
                  id={overlayId}
                  type="checkbox"
                  role="switch"
                  className={styles.switch}
                  checked={overlay}
                  onChange={(event) => setOverlay(event.target.checked)}
                />
              </div>
            )}

            <label className="ob-modal-field">
              <span>Notes</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional details"
                rows={2}
              />
            </label>

            {showColor && (
              <div className="ob-modal-field">
                <span>Color</span>
                <PaletteSwatches value={color} onChange={setColor} palette={palette} />
              </div>
            )}

            <div className="ob-modal-actions">
              {mode === 'edit' && onDeleteTask && draftTask && (
                <button
                  type="button"
                  className="ob-modal-btn ob-modal-btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                >
                  Delete Task
                </button>
              )}
              <button type="button" className="ob-modal-btn ob-modal-btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className="ob-modal-btn ob-modal-btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save task'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        message={`Remove "${draftTask?.name ?? 'this task'}" from your schedule?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          onDeleteTask?.(draftTask!)
          setShowDeleteConfirm(false)
          onClose()
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}

export default TaskEditModal
