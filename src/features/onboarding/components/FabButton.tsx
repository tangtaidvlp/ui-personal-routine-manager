export type FabButtonProps = {
  onClick: () => void
  disabled?: boolean
}

function FabButton({ onClick, disabled = false }: FabButtonProps) {
  return (
    <button type="button" className="ob-fab-btn" onClick={onClick} disabled={disabled} aria-label="Add task">
      +
    </button>
  )
}

export default FabButton
