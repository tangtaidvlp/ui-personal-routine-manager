import { useEffect, useState } from 'react'
import PageHeader from '../../../components/layout/PageHeader.tsx'
import { useShellContext } from '../../../components/layout/shellContext.ts'
import ThemeControl from '../../../components/ThemeControl.tsx'
import { MinusIcon, PlusIcon } from '../../../components/icons/index.ts'
import { useBoardZoom } from '../../settings/hooks/useUserSettings.ts'
import { fetchUserProfile } from '../api/profile.ts'
import { FREE_PLAN, type UserProfile } from '../types/profile.ts'

type LoadState = { status: 'loading' } | { status: 'ready'; profile: UserProfile } | { status: 'error' }

/**
 * Profile: account details, plan, preferences and sign-out (specs/F006 US2,
 * contracts/ui-profile-settings.md "ProfilePage layout").
 */
function ProfilePage() {
  const { user, onLogout } = useShellContext()
  const userId = user?.id
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const zoom = useBoardZoom()

  useEffect(() => {
    if (!userId) {
      setLoad({ status: 'error' })
      return
    }
    let active = true
    setLoad({ status: 'loading' })
    fetchUserProfile(userId)
      .then((profile) => active && setLoad({ status: 'ready', profile }))
      .catch(() => active && setLoad({ status: 'error' }))
    return () => {
      active = false
    }
  }, [userId])

  const profile = load.status === 'ready' ? load.profile : null
  // Display name = username, else email (FR-003); fall back to what sign-in already told us.
  const displayName = profile?.username || profile?.email || user?.name || user?.email || 'You'
  const email = profile?.email || user?.email || ''
  const plan = profile?.plan ?? FREE_PLAN
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'
  const isLoading = load.status === 'loading' && !user

  return (
    <>
      <PageHeader>
        <h1>Profile</h1>
      </PageHeader>
      <div className="pf-page">
        <section className="ui-card pf-card" aria-labelledby="pf-account-title">
          <h2 id="pf-account-title" className="pf-card-title">Account</h2>
          <div className="pf-account">
            <span className="pf-avatar" aria-hidden="true">{initial}</span>
            <dl className="pf-fields" aria-busy={isLoading || undefined}>
              <div className="pf-field">
                <dt>Name</dt>
                <dd>{displayName}</dd>
              </div>
              <div className="pf-field">
                <dt>Email</dt>
                <dd>{email}</dd>
              </div>
            </dl>
          </div>
          {load.status === 'error' ? <p className="pf-note">Couldn&apos;t load all profile details.</p> : null}
          <div className="pf-actions">
            <button type="button" className="ui-btn ui-btn-ghost" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </section>

        <section className="ui-card pf-card" aria-labelledby="pf-plan-title">
          <h2 id="pf-plan-title" className="pf-card-title">Plan</h2>
          <p className="pf-plan">{plan.name}</p>
        </section>

        <section className="ui-card pf-card" aria-labelledby="pf-prefs-title">
          <h2 id="pf-prefs-title" className="pf-card-title">Preferences</h2>
          <div className="pf-pref-row">
            <span className="pf-pref-label">Theme</span>
            <ThemeControl variant="full" />
          </div>
          <div className="pf-pref-row">
            <span className="pf-pref-label" id="pf-zoom-label">Board zoom</span>
            <div className="ob-board-zoom" role="group" aria-labelledby="pf-zoom-label">
              <button type="button" className="ui-icon-btn" onClick={zoom.zoomOut} disabled={!zoom.canZoomOut} aria-label="Zoom out" title="Zoom out">
                <MinusIcon size={16} />
              </button>
              <span className="ob-board-zoom-label pf-zoom-value">{Math.round(zoom.zoom * 100)}%</span>
              <button type="button" className="ui-icon-btn" onClick={zoom.zoomIn} disabled={!zoom.canZoomIn} aria-label="Zoom in" title="Zoom in">
                <PlusIcon size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default ProfilePage
