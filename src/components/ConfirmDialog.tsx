export type ConfirmDialogProps = {
  isOpen: boolean
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  isOpen,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="ob-modal-backdrop" onClick={onCancel}>
      <div className="ob-modal" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="ob-modal-header">
          <h2>Confirm</h2>
          <button type="button" className="ob-modal-close" onClick={onCancel} aria-label="Close" disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="ob-modal-body">
          <p style={{ margin: 0, color: '#445470', fontSize: '15px', lineHeight: 1.5 }}>{message}</p>

          <div className="ob-modal-actions">
            <button
              type="button"
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
              {isLoading ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
