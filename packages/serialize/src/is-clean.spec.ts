/* eslint-disable unicorn/consistent-function-scoping */
import { describe, expect, it } from 'vitest'

import { isCleanFn } from './is-clean'

const globalFn = () => 1

describe('isClean', () => {
  it('must determine clean fn', () => {
    expect(
      isCleanFn((v: number) => {
        const { a } = { a: 1 }
        const [b] = [2]
        const add = (a1: number, a2: number) => a1 + a2
        return add(a + b, v)
      })
    ).toEqual(true)
  })
  it('must determine NOT clean fn', () => {
    expect(isCleanFn((v: number) => v + globalFn())).toEqual(false)
  })
  it('must respect allowed globals', () => {
    expect(isCleanFn((v: string) => Number(v) + globalFn(), ['Number', 'globalFn'])).toEqual(true)
  })
})
