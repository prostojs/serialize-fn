import { describe, expect, it } from 'vitest'

import { getGlobals } from './get-globals'

describe('getGlobals', () => {
  it('must extract globals identifiers from fn', () => {
    expect(getGlobals('(v) => { c(); v(); const c = () => {} }')).toEqual(['c'])
  })
})
