import { useEffect, useState } from 'react'
import { XIcon } from '../../../components/icons/index.ts'
import { onSettingsSaveFailed } from '../utils/saveNotice.ts'

const HIDE_AFTER_MS = 5000

/**
 * Non-blocking notice shown when a setting couldn't be saved (specs/F006 FR-013, research R6).
 * Rendered once in App.tsx so it covers the shell pages and Onboarding.
 */
function SettingsSaveNotice() {
  const [shownAt, setShownAt] = useState<number | null>(null)

  useEffect(() => onSettingsSaveFailed(() => setShownAt(Date.now())), [])

  useEffect(() => {
    if (shownAt === null) return
    const timer = setTimeout(() => setShownAt(null), HIDE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [shownAt])

  return (
    <div role="status" aria-live="polite" className="ui-notice-region">
      {shownAt !== null ? (
        <div className="ui-notice">
          <span>Couldn&apos;t save your setting — it&apos;s applied for now.</span>
          <button type="button" className="ui-icon-btn is-plain" aria-label="Dismiss" onClick={() => setShownAt(null)}>
            <XIcon size={16} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default SettingsSaveNotice
