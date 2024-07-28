/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Serializes a function and its arguments into a string.
 *
 * @param {(...args: any[]) => any} fn - The function to serialize.
 * @param {...string} args - The arguments to pass to the function.
 * @returns {string} - A string representing the serialized function call.
 */
export function serializeFn(fn: (...args: any[]) => any, ...args: string[]): string {
  return `return (${fn.toString()})(${args.join(',')})`
}
