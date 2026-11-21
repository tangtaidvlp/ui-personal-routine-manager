// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SettingsSaveNotice from './SettingsSaveNotice.tsx'
import { notifySettingsSaveFailed } from '../utils/saveNotice.ts'

const TEXT = /Couldn.t save your setting/

describe('SettingsSaveNotice (F006 FR-013)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is hidden until a save fails', () => {
    render(<SettingsSaveNotice />)
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument()
    act(() => notifySettingsSaveFailed())
    expect(screen.getByRole('status')).toHaveTextContent(TEXT)
  })

  it('hides itself after 5 seconds', () => {
    vi.useFakeTimers()
    render(<SettingsSaveNotice />)
    act(() => notifySettingsSaveFailed())
    act(() => vi.advanceTimersByTime(4900))
    expect(screen.getByText(TEXT)).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument()
  })

  it('can be dismissed', () => {
    render(<SettingsSaveNotice />)
    act(() => notifySettingsSaveFailed())
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument()
  })
})
