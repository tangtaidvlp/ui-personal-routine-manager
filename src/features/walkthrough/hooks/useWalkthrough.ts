import { useCallback, useEffect, useReducer } from 'react'
import { walkthroughReducer } from '../utils/walkthroughReducer.ts'
import type { WalkthroughContext, WalkthroughEvent, WalkthroughState } from '../types/walkthrough.ts'

type UseWalkthroughOptions = {
  /** Open the slides automatically once per mount in this context. */
  autoOpen?: WalkthroughContext
}

export type Walkthrough = {
  state: WalkthroughState
  open: (context: WalkthroughContext) => void
  dispatch: (event: WalkthroughEvent) => void
}

/**
 * Holds the walkthrough state for a page. Nothing is persisted: the setup screen
 * opens it on every visit until onboarding is finished (spec FR-001, Assumptions).
 */
export function useWalkthrough({ autoOpen }: UseWalkthroughOptions = {}): Walkthrough {
  const [state, dispatch] = useReducer(walkthroughReducer, { phase: 'hidden' })

  useEffect(() => {
    if (autoOpen) {
      dispatch({ type: 'OPEN', context: autoOpen })
    }
    // Once per mount by design; autoOpen is a constant per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = useCallback((context: WalkthroughContext) => dispatch({ type: 'OPEN', context }), [])

  return { state, open, dispatch }
}
