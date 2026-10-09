/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */
import { describe, expect, it } from 'vitest'

import { deserializeFn, FNPool } from './deserialize'
import { GLOBALS } from './globals'

describe('deserializeFn', () => {
  it('must deserialize fn', () => {
    const fn = deserializeFn('return ((v) => v + 1)(value)')
    expect(fn.length).toBe(1)
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

/**
 * The pre-0.0.6 implementation: every call copied all hidden globals plus
 * the ctx into a fresh object and froze it. The current sandbox inherits the
 * hidden globals instead; every observable below must stay identical.
 */
function legacyDeserializeFn<R>(code: string): (ctx?: unknown) => R {
  const fn = new Function('__ctx__', `with(__ctx__){\n${code}\n}`) as (ctx: object) => R
  // eslint-disable-next-line prefer-object-spread
  return (ctx?: unknown) => fn(Object.freeze(Object.assign({}, GLOBALS, ctx)))
}

/** Outcome of a call: value, or the thrown error's constructor + message. */
function outcome(run: () => unknown): unknown {
  try {
    return { ok: run() }
  } catch (error) {
    return { threw: (error as Error).constructor.name, message: (error as Error).message }
  }
}

function expectParity(code: string, makeCtx: () => unknown) {
  expect(outcome(() => deserializeFn(code)(makeCtx()))).toEqual(
    outcome(() => legacyDeserializeFn(code)(makeCtx())),
  )
}

/** Every enumerable name (own + inherited) of `this` — the sandbox when called bare inside `with`. */
function sandboxNames(this: object): string[] {
  const out: string[] = []
  // eslint-disable-next-line guard-for-in
  for (const k in this) {
    out.push(k)
  }
  return out.sort()
}

const scope = () => ({
  v: 'abc',
  data: { name: 'Ada', n: 2 },
  context: { role: 'admin' },
  entry: undefined,
})

const CASES = [
  "(v, data, ctx) => data.name + ' ' + ctx.role + ' ' + v",
  // hidden globals resolve to null
  '() => [typeof window, typeof process, typeof globalThis, typeof console, typeof fetch, typeof eval, typeof __ctx__, typeof keys, typeof top]',
  '() => window === null && document === null && setTimeout === null && require === null',
  // non-hidden globals stay reachable
  '() => [typeof Math, typeof JSON, typeof Object, typeof Array.isArray, typeof Intl, typeof Date]',
  // Object.prototype members resolve through the sandbox object
  '() => [typeof toString, typeof hasOwnProperty, typeof valueOf, constructor === Object, typeof __proto__]',
  // assignments to sandbox names fail silently (frozen) — ctx and hidden alike
  "() => { v = 'changed'; window = 1; data = null; return [v, window, data && data.name] }",
  '() => { delete window; delete v; return [window, v] }',
  // an undeclared name assignment leaks to the real global in sloppy mode — same either way
  '() => { __fnParityProbe = 1; const r = typeof __fnParityProbe; delete globalThis.__fnParityProbe; return r }',
  // strict-mode code throws on the frozen names instead
  "() => { 'use strict'; v = 1 }",
  "() => { 'use strict'; window = 1 }",
  // `this` in a plain function call and in an arrow (sloppy mode → the global object)
  "() => (function () { return this === undefined ? 'undefined' : typeof this })()",
  '() => typeof this',
  // errors
  '() => notDefinedAnywhere',
  "() => { throw new TypeError('boom') }",
  '() => data.missing.deep',
  // params shadow the sandbox
  '(window, data) => [window, data.n]',
]

describe('sandbox parity with the legacy implementation', () => {
  for (const fnStr of CASES) {
    it(fnStr, () => {
      expectParity(`return (${fnStr})(v, data, context, entry)`, scope)
    })
  }

  it('hides exactly the same global names', () => {
    const code = 'return probe()'
    const ctx = { probe: sandboxNames }
    const ours = deserializeFn<string[], typeof ctx>(code)(ctx)
    expect(ours).toEqual(legacyDeserializeFn(code)(ctx))
    expect(ours.length).toBeGreaterThan(80)
    expect(ours).toContain('localStorage')
    expect(ours).toContain('probe')
  })

  it('ctx keys shadow hidden globals', () => {
    const ctx = () => ({ top: 5, console: 'c', eval: 'e', __ctx__: 'x', window: undefined })
    expectParity('return [top, console, eval, __ctx__, window]', ctx)
    expect(deserializeFn('return [top, console, eval, __ctx__, window]')(ctx())).toEqual([
      5,
      'c',
      'e',
      'x',
      undefined,
    ])
  })

  it('ctx keys shadow Object.prototype members', () => {
    const ctx = () => ({ toString: 't', constructor: 'c', hasOwnProperty: 'h', valueOf: 1 })
    expectParity('return [toString, constructor, hasOwnProperty, valueOf]', ctx)
  })

  it('shadowing ctx keys are still frozen', () => {
    expectParity("top = 1; toString = 2; return [top, typeof toString]", () => ({ top: 5, toString: 's' }))
    expectParity("'use strict'; top = 1", () => ({ top: 5 }))
  })

  it('copies only own enumerable keys, symbols included', () => {
    const make = () => {
      const ctx = Object.create({ inherited: 1 }) as Record<PropertyKey, unknown>
      ctx.own = 2
      Object.defineProperty(ctx, 'hidden', { value: 3, enumerable: false })
      ctx[Symbol.unscopables] = { own: true }
      return ctx
    }
    expectParity('return typeof inherited', make)
    expectParity('return typeof hidden', make)
    // Symbol.unscopables is copied, so `own` is skipped by `with` and is not found
    expectParity('return typeof own', make)
    expect(deserializeFn('return typeof own')(make())).toBe('undefined')
  })

  it('reads getters once per call, like Object.assign', () => {
    const make = () => {
      let reads = 0
      return {
        get value() {
          reads++
          return reads
        },
        reads: () => reads,
      }
    }
    expectParity('return [value, value, reads()]', make)
    expect(deserializeFn('return [value, value, reads()]')(make())).toEqual([1, 1, 1])
  })

  it('accepts missing and primitive ctx', () => {
    expectParity('return typeof window', () => undefined)
    expectParity('return typeof window', () => null)
    expectParity('return [typeof window, typeof length]', () => 'ab')
    expectParity('return typeof window', () => 42)
  })
})

describe('sandbox isolation', () => {
  /** Captures the sandbox object itself (the `with` base is `this` on a bare call). */
  function capture(this: object) {
    return this
  }

  it('is frozen at both levels and leaves the ctx untouched', () => {
    const ctx = { capture, a: 1 }
    const box = deserializeFn<object, typeof ctx>('return capture()')(ctx)
    expect(Object.isFrozen(box)).toBe(true)
    expect(Object.isFrozen(Object.getPrototypeOf(box))).toBe(true)
    expect(Object.keys(box).sort()).toEqual(['a', 'capture'])
    expect(Object.isFrozen(ctx)).toBe(false)
    expect(box).not.toBe(ctx)
  })

  it('does not leak writes or keys across calls', () => {
    const fn = deserializeFn<unknown, Record<string, unknown>>(`
      try { Object.getPrototypeOf(capture()).window = 'poisoned' } catch (e) {}
      try { Object.defineProperty(Object.getPrototypeOf(capture()), 'fetch', { value: 1 }) } catch (e) {}
      try { Object.getPrototypeOf(capture()).injected = 1 } catch (e) {}
      window = 'poisoned'; v = 'poisoned'
      return [window, fetch, v, typeof injected, typeof onlyFirst]
    `)
    expect(fn({ capture, v: 1, onlyFirst: true })).toEqual([null, null, 1, 'undefined', 'boolean'])
    expect(fn({ capture, v: 2 })).toEqual([null, null, 2, 'undefined', 'undefined'])
    // a different fn sees pristine hidden globals too
    expect(deserializeFn('return [window, fetch, typeof injected]')({})).toEqual([
      null,
      null,
      'undefined',
    ])
  })

  it('treats an own `__proto__` ctx key as a plain name, never re-parenting the sandbox', () => {
    const ctx = JSON.parse('{"__proto__": {"window": "leak", "x": 1}, "a": 2}') as object
    const fn = deserializeFn('return [window, typeof x, __proto__.x, a]')
    expect(fn(ctx)).toEqual([null, 'undefined', 1, 2])
  })
})

describe('FNPool', () => {
  it('caches one fn per code string', () => {
    const pool = new FNPool<number, { value: number }>()
    const fn = pool.getFn('return value * 2')
    expect(pool.getFn('return value * 2')).toBe(fn)
    expect(pool.getFn('return value * 3')).not.toBe(fn)
    expect(pool.call('return value * 2', { value: 5 })).toBe(10)
    expect(fn({ value: 4 })).toBe(8)
  })

  it('uses the same sandbox as deserializeFn', () => {
    const pool = new FNPool<unknown, Record<string, unknown>>()
    expect(pool.call('return [window, top, Math.max(a, 1)]', { top: 't', a: 3 })).toEqual([
      null,
      't',
      3,
    ])
  })
})
