# serialize-fn deserialize-fn

## Overview

`@prostojs/serialize-fn` is a utility library for JavaScript and TypeScript that provides functions to analyze and serialize JavaScript functions. It includes tools to check if a function uses only allowed global variables and to serialize a function with its arguments into a string. [README](packages/serialize/README.md)

`@prostojs/deserialize-fn` is a utility library for JavaScript and TypeScript that provides functions to deserialize and execute JavaScript code strings in a given context. It includes a pool to cache functions for efficiency and a function to create new functions from code strings. [README](packages/deserialize/README.md)

## Installation

You can install `@prostojs/serialize-fn`, `@prostojs/deserialize-fn` using npm:

```bash
npm install @prostojs/serialize-fn @prostojs/deserialize-fn
```

Or using pnpm:

```bash
pnpm install @prostojs/serialize-fn @prostojs/deserialize-fn
```

## Examples

```typescript
import { isCleanFn } from '@prostojs/serialize-fn'

const myFunction = () => {
  console.log('Hello, world!')
}

const allowedGlobals = ['console']

const isClean = isCleanFn(myFunction, allowedGlobals)
console.log(isClean) // Output: true
```

```typescript
import { serializeFn } from '@prostojs/serialize-fn'

const myFunction = (name: string) => {
  return `Hello, ${name}!`
}

const serializedFunction = serializeFn(myFunction, "'World'")
console.log(serializedFunction) // Output: return (function (name) { return `Hello, ${name}!`; })('World')
```

```typescript
import { FNPool } from '@prostojs/deserialize-fn'

const pool = new FNPool<any, { value: number }>()

const code = 'return value * 2'
const context = { value: 5 }

const result = pool.call(code, context)
console.log(result) // Output: 10
```
