import { useEffect, useId, useRef } from 'react'

export type ConfirmDialogProps = {
  isOpen: boolean
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  /** Confirm button text while `isLoading`. */
  loadingLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  isOpen,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  loadingLabel = 'Deleting...',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const cancelHandlerRef = useRef({ onCancel, isLoading })
  cancelHandlerRef.current = { onCancel, isLoading }

  // Keyboard (WCAG 2.2, F012 FR-010): focus Cancel on open, Escape cancels, focus returns on close.
  useEffect(() => {
    if (!isOpen) {
      return
    }
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cancelHandlerRef.current.isLoading) {
        event.stopPropagation()
        cancelHandlerRef.current.onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="ob-modal-backdrop" onClick={onCancel}>
      <div
        className="ob-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ob-modal-header">
          <h2 id={titleId}>Confirm</h2>
          <button type="button" className="ob-modal-close" onClick={onCancel} aria-label="Close" disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="ob-modal-body">
          <p id={messageId} style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '15px', lineHeight: 1.5 }}>{message}</p>

          <div className="ob-modal-actions">
            <button
              type="button"
              ref={cancelRef}
              className="ob-modal-btn ob-modal-btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="ob-modal-btn ob-modal-btn-danger"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? loadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
