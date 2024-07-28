# @prostojs/deserialize-fn

## Overview

`@prostojs/deserialize-fn` is a utility library for JavaScript and TypeScript that provides functions to deserialize and execute JavaScript code strings in a given context. It includes a pool to cache functions for efficiency and a function to create new functions from code strings.

## Installation

You can install `@prostojs/deserialize-fn` using npm:

```bash
npm install @prostojs/deserialize-fn
```

Or using pnpm:

```bash
pnpm install @prostojs/deserialize-fn
```

## Usage

### `FNPool`

A class that caches functions so that equal code-strings share the same function. This can improve performance by avoiding redundant function creation.

#### Methods

- `call(code: string, ctx: C): R`

  - Calls the function corresponding to the code string with the given context.

- `getFn(code: string): (__ctx__: C) => R`
  - Retrieves the function corresponding to the code string, creating and caching it if necessary.

#### Example

```typescript
import { FNPool } from '@prostojs/deserialize-fn'

const pool = new FNPool<any, { value: number }>()

const code = 'return value * 2'
const context = { value: 5 }

const result = pool.call(code, context)
console.log(result) // Output: 10
```

### `deserializeFn`

Generates a new function from a code string and returns it. The function is executed within the provided context, which can include global variables.

#### Parameters

- `code` (`string`): The code string to convert into a function.

#### Returns

- `(__ctx__: CTX) => R`: A new function that takes a context and returns the result of executing the code string.

#### Example

```typescript
import { deserializeFn } from '@prostojs/deserialize-fn'

const code = 'return value * 2'
const context = { value: 5 }

const fn = deserializeFn<number, { value: number }>(code)
const result = fn(context)
console.log(result) // Output: 10
```

## Globals

The `deserializeFn` function uses a `GLOBALS` object to provide a set of predefined global variables to the deserialized function. For security considerations, all potentially dangerous or sensitive globals are hidden from the function runtime. This prevents the deserialized code from accessing or modifying important global objects.

## License

This project is licensed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
