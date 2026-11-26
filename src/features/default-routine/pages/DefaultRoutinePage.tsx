import { useState } from 'react'
import PageHeader from '../../../components/layout/PageHeader.tsx'
import { useShellContext } from '../../../components/layout/shellContext.ts'
import { SendIcon } from '../../../components/icons/index.ts'
import DefaultRoutineEditor from '../components/DefaultRoutineEditor.tsx'
import BuddyChat from '../../buddy-chat/components/BuddyChat.tsx'
import { goalProposalRenderer } from '../../personal-target/components/renderGoalProposal.tsx'
import { SCHEDULE_TABS } from '../hooks/useDefaultRoutines.ts'
import ChatPanelRail from '../../../components/layout/ChatPanelRail.tsx'
import BoardViewSwitch from '../../radial-view/components/BoardViewSwitch.tsx'
import { useDevicePreference } from '../../../hooks/useDevicePreference.ts'
import {
  BOARD_VIEW_KEY,
  BOARD_VIEWS,
  CHAT_PANEL_KEY,
  CHAT_PANEL_STATES,
} from '../../../lib/devicePreference.ts'
import { fetchDefaultRoutineChatHistory, submitDefaultRoutineChat } from '../api/defaultRoutineChat.ts'

const renderProposal = goalProposalRenderer()

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
  const [boardView, setBoardView] = useDevicePreference(BOARD_VIEW_KEY, BOARD_VIEWS, 'vertical')
  const [chatPanel, setChatPanel] = useDevicePreference(CHAT_PANEL_KEY, CHAT_PANEL_STATES, 'shown')
  // The user toggled the chat on this page, so focus follows the toggle (never on load).
  const [chatToggled, setChatToggled] = useState(false)
  const hideChat = () => {
    setChatToggled(true)
    setChatPanel('hidden')
  }
  const showChat = () => {
    setChatToggled(true)
    setChatPanel('shown')
  }

  if (!user?.id) return null
  const userId = user.id

  return (
    <DefaultRoutineEditor
      userId={userId}
      className="drt-page"
      mobileView={mobileView}
      view={boardView}
      chatPanel={chatPanel}
      renderHeader={(switcher) => (
        <PageHeader
          actions={
            <div className="drt-header-actions">
              <BoardViewSwitch value={boardView} onChange={setBoardView} />
              {switcher}
            </div>
          }
        >
          <h1>Default routine</h1>
        </PageHeader>
      )}
      renderAside={({ scheduleMode, routines, refreshRoutine }) => (
        <>
        {/* One chat per routine: the server keeps a separate conversation per routine.
            Keyed by routine id so the stored history (F004) loads once the routine is known. */}
        {SCHEDULE_TABS.map((tab) => {
          const routineId = routines[tab]?.id
          return (
          <BuddyChat
            key={`${tab}-${routineId ?? 'none'}`}
            loadHistory={routineId ? (before?: number | null) => fetchDefaultRoutineChatHistory(userId, routineId, before) : undefined}
            title="Routine Buddy"
            panelId={`buddy-chat-${tab}`}
            onHide={hideChat}
            focusHideButton={chatToggled && chatPanel === 'shown'}
            isHidden={tab !== scheduleMode}
            subtitle={tab === 'weekday' ? 'Here to help with your weekday routine' : 'Here to help with your weekend routine'}
            initialMessage={GREETING[tab]}
            placeholder='Try: "Move my run to 6:30"'
            onSend={(message: string) => submitDefaultRoutineChat(userId, routines[tab], message)}
            renderProposal={renderProposal}
            onAfterSend={({ hasGoalProposal }) => {
              void refreshRoutine(tab)
              // A goal proposal (F013) waits for the user in the chat.
              if (!hasGoalProposal) setMobileView('board')
            }}
          />
          )
        })}
        {chatPanel === 'hidden' ? (
          <ChatPanelRail panelId={`buddy-chat-${scheduleMode}`} autoFocus={chatToggled} onShow={showChat} />
        ) : null}
        </>
      )}
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
