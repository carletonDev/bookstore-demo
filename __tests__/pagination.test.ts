import { describe, it, expect } from 'vitest'
import {
  encodeCursor,
  decodeCursor,
  buildCursorFilter,
} from '@/lib/utils/pagination'

describe('encodeCursor', () => {
  it('returns a base64url string', () => {
    const cursor = encodeCursor('A Tale of Two Cities', '5dc6c71c-cf29-43fe-9581-12f390ff26b0')
    expect(typeof cursor).toBe('string')
    // base64url has no +, /, or = padding
    expect(cursor).not.toMatch(/[+/=]/)
  })

  it('encodes title and id into the cursor', () => {
    const cursor = encodeCursor('Dune', 'abc-123')
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'))
    expect(decoded).toEqual({ title: 'Dune', id: 'abc-123' })
  })
})

describe('decodeCursor', () => {
  it('round-trips with encodeCursor', () => {
    const title = 'The Great Gatsby'
    const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const cursor = encodeCursor(title, id)
    const decoded = decodeCursor(cursor)
    expect(decoded).toEqual({ title, id })
  })

  it('throws on malformed base64', () => {
    expect(() => decodeCursor('not-valid-base64!!!')).toThrow('Invalid pagination cursor')
  })

  it('throws on valid base64 but wrong JSON shape', () => {
    const badCursor = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url')
    expect(() => decodeCursor(badCursor)).toThrow('Invalid pagination cursor')
  })

  it('throws on valid base64 with missing id field', () => {
    const badCursor = Buffer.from(JSON.stringify({ title: 'ok' })).toString('base64url')
    expect(() => decodeCursor(badCursor)).toThrow('Invalid pagination cursor')
  })

  it('throws on valid base64 with non-string fields', () => {
    const badCursor = Buffer.from(JSON.stringify({ title: 123, id: 'ok' })).toString('base64url')
    expect(() => decodeCursor(badCursor)).toThrow('Invalid pagination cursor')
  })

  it('handles empty strings in title and id', () => {
    const cursor = encodeCursor('', '')
    const decoded = decodeCursor(cursor)
    expect(decoded).toEqual({ title: '', id: '' })
  })

  it('handles special characters in title', () => {
    const title = 'Book "with" quotes & <angles>'
    const id = 'test-id'
    const cursor = encodeCursor(title, id)
    const decoded = decodeCursor(cursor)
    expect(decoded).toEqual({ title, id })
  })
})

describe('buildCursorFilter', () => {
  it('builds a PostgREST .or() filter string', () => {
    const filter = buildCursorFilter({ title: 'Dune', id: 'abc-123' })
    expect(filter).toBe('title.gt."Dune",and(title.eq."Dune",id.gt.abc-123)')
  })

  it('escapes double quotes in title', () => {
    const filter = buildCursorFilter({ title: 'Book "Quoted"', id: 'x' })
    expect(filter).toBe('title.gt."Book \\"Quoted\\"",and(title.eq."Book \\"Quoted\\"",id.gt.x)')
  })

  it('escapes backslashes in title', () => {
    const filter = buildCursorFilter({ title: 'Back\\slash', id: 'y' })
    expect(filter).toBe('title.gt."Back\\\\slash",and(title.eq."Back\\\\slash",id.gt.y)')
  })
})
