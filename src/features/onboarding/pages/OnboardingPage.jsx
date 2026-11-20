import { useState } from 'react'
import { submitOnboardingChat } from '../api/completeOnboarding.ts'
import DefaultRoutineEditor from '../components/DefaultRoutineEditor.tsx'
import { SCHEDULE_TABS } from '../hooks/useDefaultRoutines.ts'
import BuddyChat, { SendIcon } from '../components/BuddyChat.jsx'
import { useWalkthrough } from '../../walkthrough/hooks/useWalkthrough.ts'
import IntroSlides from '../../walkthrough/components/IntroSlides.tsx'
import GuidedTour from '../../walkthrough/components/GuidedTour.tsx'
import HowItWorksButton from '../../walkthrough/components/HowItWorksButton.tsx'

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
 *   onComplete: () => void | Promise<void>,
 *   isCompleting?: boolean,
 *   completeError?: string | null,
 * }} props
 */
function OnboardingPage({ user, onComplete, isCompleting = false, completeError = null }) {
  const [mobileView, setMobileView] = useState('board')
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
            {switcher}
            <button type="button" className="ui-btn ui-btn-primary ob-ready-btn" onClick={onComplete} data-tour="finish">
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
        SCHEDULE_TABS.map((tab) => (
          <BuddyChat
            key={tab}
            title="Routine Buddy"
            tourId={tab === scheduleMode ? 'routine-buddy' : undefined}
            isHidden={tab !== scheduleMode}
            subtitle="Here to help you plan"
            initialMessage={BUDDY_GREETING}
            placeholder='Try: "I work from 9 to 5"'
            onSend={(message) => submitOnboardingChat(user.id, routines[tab], message)}
            onAfterSend={() => {
              refreshRoutine(tab)
              setMobileView('board')
            }}
          />
        ))
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
