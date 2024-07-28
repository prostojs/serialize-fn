# @prostojs/serialize-fn

## Overview

`@prostojs/serialize-fn` is a utility library for JavaScript and TypeScript that provides functions to analyze and serialize JavaScript functions. It includes tools to check if a function uses only allowed global variables and to serialize a function with its arguments into a string.

## Installation

You can install `@prostojs/serialize-fn` using npm:

```bash
npm install @prostojs/serialize-fn
```

Or using pnpm:

```bash
pnpm install @prostojs/serialize-fn
```

## Usage

### `isCleanFn`

This function checks if a given function uses only allowed global variables.

#### Parameters

- `fn` (`(...args: any[]) => any`): The function to check.
- `allowedGlobals` (`string[]`, optional): An array of allowed global variable names. Default is an empty array.

#### Returns

- `boolean`: Returns `true` if the function only uses allowed globals, `false` otherwise.

#### Example

```typescript
import { isCleanFn } from '@prostojs/serialize-fn'

const myFunction = () => {
  console.log('Hello, world!')
}

const allowedGlobals = ['console']

const isClean = isCleanFn(myFunction, allowedGlobals)
console.log(isClean) // Output: true
```

### `serializeFn`

This function serializes a given function and its arguments into a string.

#### Parameters

- `fn` (`(...args: any[]) => any`): The function to serialize.
- `args` (`...string`): The arguments to pass to the function.

#### Returns

- `string`: Returns a string representing the serialized function call.

#### Example

```typescript
import { serializeFn } from '@prostojs/serialize-fn'

const myFunction = (name: string) => {
  return `Hello, ${name}!`
}

const serializedFunction = serializeFn(myFunction, "'World'")
console.log(serializedFunction) // Output: return (function (name) { return `Hello, ${name}!`; })('World')
```

## License

This project is licensed under the MIT License. See the [LICENSE](../../LICENSE) file for details.
