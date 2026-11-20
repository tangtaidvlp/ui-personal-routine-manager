type HowItWorksButtonProps = {
  onClick: () => void
}

/** Top-bar link that replays the instructions on demand (spec US4, FR-012). */
function HowItWorksButton({ onClick }: HowItWorksButtonProps) {
  return (
    <button type="button" className="wt-how-btn" onClick={onClick}>
      How it works
    </button>
  )
}

export default HowItWorksButton
