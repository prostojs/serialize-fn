import { describe, expect, it } from 'vitest'

import { deserializeFn } from './deserialize'

describe('deserializeFn', () => {
  it('must deserialize fn', () => {
    const fn = deserializeFn('return ((v) => v + 1)(value)')
    expect(fn.toString()).toMatchInlineSnapshot(`
      "(ctx) => {
          const newCtx = Object.freeze(Object.assign({}, __vite_ssr_import_0__.GLOBALS, ctx));
          return fn(newCtx);
        }"
    `)
    expect(fn({ value: 2 })).toEqual(3)
  })
})

describe('hacking deserializeFn', () => {
  it("mustn't allow mess up with ctx by deleting props", () => {
    const fn = deserializeFn(`return (() => {
            delete __ctx__.console;
            __ctx__.setTimeout = '123'
            if (console) {
                console.log('hacked')
            }
            return __ctx__.setTimeout
        })()`)
    expect(() => fn({})).toThrow()
  })
  it("mustn't allow mess up with __ctx__ var", () => {
    const fn = deserializeFn(`return (() => {
            const __ctx__ = {}
            return setTimeout
        })()`)
    expect(fn({})).toBe(null)
  })
})
