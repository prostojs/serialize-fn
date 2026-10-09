/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */
import { bench, describe } from 'vitest'

import { FNPool } from './deserialize'
import { GLOBALS } from './globals'

// Run with `pnpm bench`. Each iteration evaluates a cached fn 10k times with
// a fresh, typical-sized ctx (the hot path of a pooled expression).

const CODE = 'return ((v, data, ctx) => !!v && data.n > 1 && ctx.role === "admin")(v, data, context, entry)'
const EVALS = 10_000

/** The pre-0.0.6 sandbox: copy every hidden global + the ctx, then freeze. */
function legacyDeserializeFn<R>(code: string): (ctx?: unknown) => R {
  const fn = new Function('__ctx__', `with(__ctx__){\n${code}\n}`) as (ctx: object) => R
  // eslint-disable-next-line prefer-object-spread
  return (ctx?: unknown) => fn(Object.freeze(Object.assign({}, GLOBALS, ctx)))
}

const legacy = legacyDeserializeFn<boolean>(CODE)
const current = new FNPool<boolean, object>().getFn(CODE)
const data = { name: 'Ada', n: 2 }
const context = { role: 'admin' }

function run(fn: (ctx: object) => boolean) {
  for (let i = 0; i < EVALS; i++) {
    fn({ v: i, data, context, entry: undefined })
  }
}

describe(`${EVALS} evals of a pooled fn`, () => {
  bench('legacy sandbox (copy all hidden globals per call)', () => run(legacy))
  bench('current sandbox (inherit hidden globals)', () => run(current))
})
