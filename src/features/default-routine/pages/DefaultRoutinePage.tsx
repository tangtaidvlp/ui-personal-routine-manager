import { useState } from 'react'
import PageHeader from '../../../components/layout/PageHeader.tsx'
import { useShellContext } from '../../../components/layout/shellContext.ts'
import { SendIcon } from '../../../components/icons/index.ts'
import DefaultRoutineEditor from '../../onboarding/components/DefaultRoutineEditor.tsx'
import BuddyChat from '../../onboarding/components/BuddyChat.jsx'
import { SCHEDULE_TABS } from '../../onboarding/hooks/useDefaultRoutines.ts'
import { submitDefaultRoutineChat } from '../api/defaultRoutineChat.ts'

const GREETING = {
  weekday: 'Hi! Ask me to add, move or remove tasks in your weekday routine.',
  weekend: 'Hi! Ask me to add, move or remove tasks in your weekend routine.',
} as const

/**
 * Edit the Weekday/Weekend default routines after onboarding (US2, FR-012), with Routine Buddy
 * beside the board (one chat per routine, like onboarding). No "complete onboarding" step (FR-013).
 */
function DefaultRoutinePage() {
  const { user } = useShellContext()
  const [mobileView, setMobileView] = useState<'board' | 'chat'>('board')

  if (!user?.id) return null
  const userId = user.id

  return (
    <DefaultRoutineEditor
      userId={userId}
      className="drt-page"
      mobileView={mobileView}
      renderHeader={(switcher) => (
        <PageHeader actions={switcher}>
          <h1>Default routine</h1>
        </PageHeader>
      )}
      renderAside={({ scheduleMode, routines, refreshRoutine }) =>
        // One chat per routine: the server keeps a separate conversation per routine.
        SCHEDULE_TABS.map((tab) => (
          <BuddyChat
            key={tab}
            title="Routine Buddy"
            isHidden={tab !== scheduleMode}
            subtitle={tab === 'weekday' ? 'Here to help with your weekday routine' : 'Here to help with your weekend routine'}
            initialMessage={GREETING[tab]}
            placeholder='Try: "Move my run to 6:30"'
            onSend={(message: string) => submitDefaultRoutineChat(userId, routines[tab], message)}
            onAfterSend={() => {
              void refreshRoutine(tab)
              setMobileView('board')
            }}
          />
        ))
      }
      extraFabs={
        <button type="button" className="ob-fab-btn-chat" aria-label="Chat with Routine Buddy" onClick={() => setMobileView('chat')}>
          <SendIcon />
        </button>
      }
    >
      <button type="button" className="ob-fab-btn-view-schedule" onClick={() => setMobileView('board')}>
        View schedule
      </button>
    </DefaultRoutineEditor>
  )
}

export default DefaultRoutinePage
