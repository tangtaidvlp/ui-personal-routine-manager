// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { decodeJwt, toAuthUser } from './auth.ts'

function makeToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${payload}.signature`
}

describe('decodeJwt', () => {
  it('returns the claims of a well-formed token', () => {
    expect(decodeJwt(makeToken({ sub: 'u1', email: 'a@b.c' }))).toEqual({ sub: 'u1', email: 'a@b.c' })
  })

  it('decodes non-ASCII claims', () => {
    const utf8 = btoa(unescape(encodeURIComponent(JSON.stringify({ name: 'Nguyễn' })))).replace(/=+$/, '')
    expect(decodeJwt(`h.${utf8}.s`)).toEqual({ name: 'Nguyễn' })
  })

  it('returns null for a malformed token', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull()
    expect(decodeJwt('a.%%%.c')).toBeNull()
    expect(decodeJwt('')).toBeNull()
  })
})

describe('toAuthUser', () => {
  it('maps sub, email and name', () => {
    expect(toAuthUser(makeToken({ sub: 'u1', email: 'a@b.c', name: 'Ann' }))).toEqual({ id: 'u1', email: 'a@b.c', name: 'Ann' })
  })

  it('falls back to the email for a missing name', () => {
    expect(toAuthUser(makeToken({ sub: 'u1', email: 'a@b.c' }))?.name).toBe('a@b.c')
  })

  it('falls back to userId / id for the id and to sub for the email', () => {
    expect(toAuthUser(makeToken({ userId: 'u2' }))?.id).toBe('u2')
    expect(toAuthUser(makeToken({ id: 'u3' }))?.id).toBe('u3')
    expect(toAuthUser(makeToken({ sub: 'u4' }))).toEqual({ id: 'u4', email: 'u4', name: '' })
  })

  it('gives empty strings when no claims are present', () => {
    expect(toAuthUser(makeToken({}))).toEqual({ id: '', email: '', name: '' })
  })

  it('returns null for a malformed token', () => {
    expect(toAuthUser('garbage')).toBeNull()
  })
})
