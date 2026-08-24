import { describe, it, expect } from 'vitest'
import { cleanText, validAmount, isEmailVerified } from './workflows'

describe('cleanText', () => {
  it('trims whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello')
  })

  it('returns empty string for non-strings', () => {
    expect(cleanText(123)).toBe('')
    expect(cleanText(null)).toBe('')
    expect(cleanText(undefined)).toBe('')
  })

  it('truncates to max length', () => {
    expect(cleanText('a'.repeat(100), 10)).toBe('a'.repeat(10))
  })
})

describe('validAmount', () => {
  it('returns rounded amount for valid input', () => {
    expect(validAmount('100')).toBe(100)
    expect(validAmount('100.456')).toBe(100.46)
  })

  it('returns null for invalid amounts', () => {
    expect(validAmount('0')).toBeNull()
    expect(validAmount('-5')).toBeNull()
    expect(validAmount('abc')).toBeNull()
    expect(validAmount('200000000')).toBeNull() // over max
  })
})

describe('isEmailVerified', () => {
  it('returns true when email is confirmed', () => {
    expect(isEmailVerified({ email_confirmed_at: '2026-01-01T00:00:00Z' })).toBe(true)
    expect(isEmailVerified({ confirmed_at: '2026-01-01T00:00:00Z' })).toBe(true)
  })

  it('returns false when not confirmed or no user', () => {
    expect(isEmailVerified({})).toBe(false)
    expect(isEmailVerified(null)).toBe(false)
  })
})
