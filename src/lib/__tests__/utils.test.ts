import { describe, it, expect } from 'vitest'
import { cn, formatBytes, safeJsonParse } from '../utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })

  it('handles undefined/null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })
})

describe('formatBytes', () => {
  it('returns 0 B for 0', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
  })

  it('formats fractional KB', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON object', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses valid JSON array', () => {
    expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('returns raw string for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBe('not json')
  })

  it('parses JSON string primitive', () => {
    expect(safeJsonParse('"hello"')).toBe('hello')
  })

  it('parses JSON number', () => {
    expect(safeJsonParse('42')).toBe(42)
  })
})
