import { describe, expect, it } from 'vitest'

import { serializeFn } from './serialize'

describe('serializeFn', () => {
  it('must serialize fn', () => {
    expect(serializeFn((v: number) => v + 1, 'value')).toEqual('return ((v) => v + 1)(value)')
  })
})
