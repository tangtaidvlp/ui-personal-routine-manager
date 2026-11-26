import { useState } from 'react'
import { ApiError } from '../../../lib/api.ts'
import { completeOnboarding, submitOnboardingChat } from '../api/completeOnboarding.ts'
import DefaultRoutineEditor from '../../default-routine/components/DefaultRoutineEditor.tsx'
import { SCHEDULE_TABS } from '../../default-routine/hooks/useDefaultRoutines.ts'
import { fetchDefaultRoutineChatHistory } from '../../default-routine/api/defaultRoutineChat.ts'
import BuddyChat, { SendIcon } from '../../buddy-chat/components/BuddyChat.tsx'
import { goalProposalRenderer } from '../../personal-target/components/renderGoalProposal.tsx'
import { useWalkthrough } from '../../walkthrough/hooks/useWalkthrough.ts'
import IntroSlides from '../../walkthrough/components/IntroSlides.tsx'
import GuidedTour from '../../walkthrough/components/GuidedTour.tsx'
import HowItWorksButton from '../../walkthrough/components/HowItWorksButton.tsx'
import ThemeControl from '../../../components/ThemeControl.tsx'

const renderProposal = goalProposalRenderer()

const BUDDY_GREETING =
  'Hi! I\'m your Routine Buddy. Tell me about your day, like "I wake up at 7:00 and work 9 to 5", and I\'ll build the routine. Or tap + to add tasks yourself.'

function BrandMark() {
  return (
    <div className="ob-brand">
      <span className="app-brand-mark" aria-hidden="true">M</span>
      <span className="app-brand-name">Milos</span>
    </div>
  )
}

/**
 * @param {{
 *   user: { id?: string; email?: string } | null,
 *   onComplete: () => void,
 * }} props
 */
function OnboardingPage({ user, onComplete }) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [completeError, setCompleteError] = useState(null)
  const [mobileView, setMobileView] = useState('board')

  const handleComplete = async () => {
    if (!user?.id) {
      setCompleteError('Unable to complete onboarding because user information is missing.')
      return
    }

    setIsCompleting(true)
    setCompleteError(null)

    try {
      await completeOnboarding(user.id)
      onComplete()
    } catch (error) {
      if (error instanceof ApiError && error.status === 500) {
        setCompleteError('Could not complete onboarding for this user (server returned 500).')
      } else if (error instanceof ApiError) {
        setCompleteError(error.message)
      } else {
        setCompleteError('Failed to complete onboarding. Please try again.')
      }
    } finally {
      setIsCompleting(false)
    }
  }

  // Opens on every visit while onboarding is unfinished: App.tsx routes those users here (spec FR-001).
  const walkthrough = useWalkthrough({ autoOpen: 'onboarding' })

  return (
    <DefaultRoutineEditor
      userId={user?.id}
      className="ob-page"
      mobileView={mobileView}
      renderHeader={(switcher) => (
        <header className="ob-topbar">
          <BrandMark />
          <div className="ob-top-actions">
            <HowItWorksButton onClick={() => walkthrough.open('onboarding')} />
            <ThemeControl variant="compact" />
            {switcher}
            <button type="button" className="ui-btn ui-btn-primary ob-ready-btn" onClick={handleComplete} data-tour="finish">
              {isCompleting ? 'Saving...' : 'Ready to roll'}
            </button>
          </div>
        </header>
      )}
      banner={
        completeError ? (
          <div className="ob-banner-wrap">
            <div className="alert alert-error" role="alert">
              <span>{completeError}</span>
            </div>
          </div>
        ) : null
      }
      renderAside={({ scheduleMode, routines, refreshRoutine }) =>
        // One chat per routine: the server keeps a separate conversation per routine (research R5).
        // Keyed by routine id so the stored history (F004) loads once the routine is known.
        SCHEDULE_TABS.map((tab) => {
          const routineId = routines[tab]?.id
          return (
          <BuddyChat
            key={`${tab}-${routineId ?? 'none'}`}
            loadHistory={routineId && user?.id ? (before) => fetchDefaultRoutineChatHistory(user.id, routineId, before) : undefined}
            title="Routine Buddy"
            tourId={tab === scheduleMode ? 'routine-buddy' : undefined}
            isHidden={tab !== scheduleMode}
            subtitle="Here to help you plan"
            initialMessage={BUDDY_GREETING}
            placeholder='Try: "I work from 9 to 5"'
            onSend={(message) => submitOnboardingChat(user.id, routines[tab], message)}
            renderProposal={renderProposal}
            onAfterSend={({ hasGoalProposal }) => {
              refreshRoutine(tab)
              // A goal proposal (F013) waits for the user in the chat.
              if (!hasGoalProposal) setMobileView('board')
            }}
          />
          )
        })
      }
      extraFabs={
        <button
          type="button"
          className="ob-fab-btn-chat"
          aria-label="Chat with Routine Buddy"
          onClick={() => setMobileView('chat')}
        >
          <SendIcon />
        </button>
      }
    >
      <footer className="ob-user-chip">Planning for {user?.email || 'your account'}</footer>

      <button type="button" className="ob-fab-btn-view-schedule" onClick={() => setMobileView('board')}>
        View schedule
      </button>

      <IntroSlides state={walkthrough.state} dispatch={walkthrough.dispatch} />
      <GuidedTour
        state={walkthrough.state}
        dispatch={walkthrough.dispatch}
        mobileView={mobileView}
        onMobileViewChange={setMobileView}
      />
    </DefaultRoutineEditor>
  )
}

export default OnboardingPage
