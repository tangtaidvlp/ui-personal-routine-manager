import PageHeader from '../../../components/layout/PageHeader.tsx'
import { BarChartIcon } from '../../../components/icons/index.ts'

/** Placeholder until analytics ships (FR-014). Makes no data requests. */
function AnalyticsPage() {
  return (
    <>
      <PageHeader>
        <h1>Analytics</h1>
      </PageHeader>
      <div className="analytics-page">
        <section className="ui-card analytics-placeholder">
          <span className="analytics-placeholder-icon" aria-hidden="true">
            <BarChartIcon size={28} />
          </span>
          <h2>Analytics is coming soon</h2>
          <p>Soon you&apos;ll see how your days compare to your routine.</p>
        </section>
      </div>
    </>
  )
}

export default AnalyticsPage
