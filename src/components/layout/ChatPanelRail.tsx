import { useEffect, useRef } from 'react'
import { PanelRightIcon } from '../icons/index.ts'

type ChatPanelRailProps = { panelId: string; onShow: () => void; autoFocus?: boolean }

/** The narrow strip that stands in for a hidden Buddy chat (wide screens, F016). */
function ChatPanelRail({ panelId, onShow, autoFocus = false }: ChatPanelRailProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (autoFocus) buttonRef.current?.focus()
  }, [autoFocus])

  return (
    <div className="chat-rail">
      <button
        ref={buttonRef}
        type="button"
        className="ui-icon-btn is-plain"
        aria-label="Show Buddy chat"
        aria-expanded="false"
        aria-controls={panelId}
        title="Show Buddy chat"
        onClick={onShow}
      >
        <PanelRightIcon size={18} />
      </button>
    </div>
  )
}

export default ChatPanelRail
