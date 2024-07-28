/* eslint-disable @typescript-eslint/consistent-generic-constructors */
/* eslint-disable prefer-object-spread */
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
  const fn = new Function('__ctx__', fnCode) as (ctx?: Record<string, unknown>) => R
  return ((ctx?: Record<string, unknown>) => {
    const newCtx = Object.freeze(Object.assign({}, GLOBALS, ctx))
    return fn(newCtx)
  }) as (__ctx__: CTX) => R
}
