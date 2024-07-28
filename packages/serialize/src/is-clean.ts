/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGlobals } from './get-globals'

/**
 * Checks if a function is "clean", meaning it only uses allowed global variables.
 *
 * @param fn - The function to check.
 * @param allowedGlobals - An optional array (or Set) of allowed global variable names.
 * @returns {boolean} - True if the function only uses allowed globals, false otherwise.
 */
export function isCleanFn(
  fn: (...args: any[]) => any,
  allowedGlobals: string[] | Set<string> = defaultAllowedGlobals
): boolean {
  const fnString = fn.toString()
  const globals = getGlobals(fnString)
  const allowedSet =
    allowedGlobals instanceof Set ? allowedGlobals : new Set<string>(allowedGlobals)
  return globals.every(g => allowedSet.has(g))
}

/**
 * Global primitives
 */
export const defaultAllowedGlobals = new Set([
  'Object',
  'Function',
  'Boolean',
  'Symbol',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'Number',
  'BigInt',
  'Math',
  'Date',
  'String',
  'RegExp',
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'ArrayBuffer',
  'SharedArrayBuffer',
  'Atomics',
  'DataView',
  'JSON',
  'Promise',
  'Generator',
  'GeneratorFunction',
  'AsyncFunction',
  'Proxy',
  'Intl',
])
