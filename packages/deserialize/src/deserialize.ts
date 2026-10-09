/* eslint-disable @typescript-eslint/consistent-generic-constructors */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */
import { GLOBALS } from './globals'

/**
 * Pool of Fns
 * Caches functions so equal code-strings share the same function
 */
export class FNPool<R, CTX> {
  private readonly cache: Map<string, (__ctx__: CTX) => R> = new Map()

  call<C extends CTX>(code: string, ctx: C) {
    return this.getFn(code)(ctx)
  }

  getFn<C extends CTX>(code: string): (__ctx__: C) => R {
    let cached = this.cache.get(code)
    if (!cached) {
      cached = deserializeFn<R, C>(code) as (__ctx__: CTX) => R
      this.cache.set(code, cached)
    }
    return cached
  }
}

/**
 * Generates function
 * @param code text code
 * @returns new function
 */
export function deserializeFn<R, CTX>(code: string): (__ctx__: CTX) => R {
  const fnCode = `with(__ctx__){\n${code}\n}`
  const fn = new Function('__ctx__', fnCode) as (ctx: object) => R
  return ((ctx?: CTX) => fn(createSandbox(ctx))) as (__ctx__: CTX) => R
}

const isEnumerable = Object.prototype.propertyIsEnumerable

/**
 * Builds the frozen object a fn runs against (`with(sandbox)`).
 *
 * The sandbox inherits the hidden globals from the frozen `GLOBALS` object
 * instead of copying all of them on every call; only the ctx's own enumerable
 * keys (the keys `Object.assign` would copy) become own properties. Name
 * resolution is unchanged: ctx keys, then hidden globals (`null`), then
 * `Object.prototype`, then the real globals. Both levels are frozen, so
 * assigning any sandbox name still fails silently.
 */
function createSandbox(ctx: unknown): object {
  const box = Object.create(GLOBALS) as Record<PropertyKey, unknown>
  if (ctx !== null && ctx !== undefined) {
    const src = Object(ctx) as Record<PropertyKey, unknown>
    for (const key of Object.keys(src)) {
      put(box, key, src[key])
    }
    for (const sym of Object.getOwnPropertySymbols(src)) {
      if (isEnumerable.call(src, sym)) {
        put(box, sym, src[sym])
      }
    }
  }
  return Object.freeze(box)
}

/**
 * A key that shadows an inherited name (a hidden global or an
 * `Object.prototype` member) is defined rather than assigned: assignment would
 * hit the frozen inherited property (or the `__proto__` setter).
 */
function put(box: Record<PropertyKey, unknown>, key: PropertyKey, value: unknown) {
  if (key in box) {
    Object.defineProperty(box, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    })
  } else {
    box[key] = value
  }
}
