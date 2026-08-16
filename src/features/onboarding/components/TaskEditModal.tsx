import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../../../lib/api.ts'

export type TaskFormValue = {
  id?: string
  name: string
  startTime: string
  durationMinutes: number
  description?: string
  color?: string
}

export type TaskEditModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  draftTask: TaskFormValue | null
  onClose: () => void
  onSubmitTask: (mode: 'create' | 'edit', task: TaskFormValue) => Promise<unknown>
  onSaved: () => void | Promise<void>
  showColor?: boolean
}

function TaskEditModal({ isOpen, mode, draftTask, onClose, onSubmitTask, onSaved, showColor = true }: TaskEditModalProps) {
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setName(draftTask?.name ?? '')
    setStartTime(draftTask?.startTime ?? '09:00')
    setDurationMinutes(draftTask?.durationMinutes ?? 30)
    setDescription(draftTask?.description ?? '')
    setColor(draftTask?.color ?? '')
    setError(null)
  }, [isOpen, draftTask])

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Give this task a name.')
      return
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) {
      setError('Duration must be between 1 and 1440 minutes.')
      return
    }

    const task: TaskFormValue = {
      id: draftTask?.id,
      name: trimmedName,
      startTime,
      durationMinutes,
      description: description.trim() || undefined,
      color: color || undefined,
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
    <div className="ob-modal-backdrop" onClick={onClose}>
      <div className="ob-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="ob-modal-header">
          <h2>{mode === 'create' ? 'Add a task' : 'Edit task'}</h2>
          <button type="button" className="ob-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ob-modal-body" onSubmit={handleSubmit}>
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

            <label className="ob-modal-field">
              <span>Duration (min)</span>
              <input
                type="number"
                min={15}
                step={15}
                max={1440}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
              />
            </label>
          </div>

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
            <label className="ob-modal-field">
              <span>Color</span>
              <input type="color" value={color || '#2563eb'} onChange={(event) => setColor(event.target.value)} />
            </label>
          )}

          <div className="ob-modal-actions">
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
  )
}

export default TaskEditModal
