// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ReflectionSummaryStrip from './ReflectionSummaryStrip.tsx'
import { testView } from './testView.ts'

describe('ReflectionSummaryStrip', () => {
  it('shows totals, the difference and the four groups', () => {
    render(<ReflectionSummaryStrip view={testView()} />)
    const strip = screen.getByRole('region', { name: 'Plan vs reality' })
    expect(strip).toHaveTextContent('5h')
    expect(strip).toHaveTextContent('5h 30m')
    expect(strip).toHaveTextContent('(+30m)')
    expect(screen.getByText('1 as planned')).toBeInTheDocument()
    expect(screen.getByText('1 changed')).toBeInTheDocument()
    expect(screen.getByText('1 skipped')).toBeInTheDocument()
    expect(screen.getByText('1 unplanned')).toBeInTheDocument()
  })

  it('keeps the task-by-task breakdown collapsed, with every task inside', () => {
    const { container } = render(<ReflectionSummaryStrip view={testView()} />)
    const details = container.querySelector('details')!
    expect(details).not.toHaveAttribute('open')
    expect(details).toHaveTextContent('Deep work')
    expect(details).toHaveTextContent('planned as Work')
    expect(details).toHaveTextContent('Coffee')
    expect(details).toHaveTextContent('Read')
  })

  it('has no breakdown when there are no tasks', () => {
    const empty = testView()
    empty.comparison = { plannedMinutes: 0, actualMinutes: 0, counts: { asPlanned: 0, changed: 0, skipped: 0, unplanned: 0 }, items: [] }
    const { container } = render(<ReflectionSummaryStrip view={empty} />)
    expect(container.querySelector('details')).toBeNull()
  })
})
