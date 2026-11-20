export type FabButtonProps = {
  onClick: () => void
  disabled?: boolean
  /** `data-tour` anchor for the guided tour (contracts/walkthrough-ui.md). */
  tourId?: string
}

function FabButton({ onClick, disabled = false, tourId }: FabButtonProps) {
  return (
    <button type="button" className="ob-fab-btn" onClick={onClick} disabled={disabled} aria-label="Add task" data-tour={tourId}>
      +
    </button>
  )
}

export default FabButton
