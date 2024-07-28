/**
 * This code is adapted from the `acorn-globals` npm package.
 *
 * Original source: https://github.com/ForbesLindesay/acorn-globals
 *
 * The `acorn-globals` package is distributed under the MIT License.
 */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable sonarjs/cognitive-complexity */
import * as acorn from 'acorn'
import * as walk from 'acorn-walk'

function isScope(node: acorn.AnyNode) {
  return (
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'Program'
  )
}
function isBlockScope(node: acorn.AnyNode) {
  // The body of switch statement is a block.
  return node.type === 'BlockStatement' || node.type === 'SwitchStatement' || isScope(node)
}

function declaresArguments(node: acorn.AnyNode) {
  return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration'
}

function getAst(source: string, options?: acorn.Options) {
  const parseOptions = {
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowHashBang: true,
    ecmaVersion: 'latest',
    ...options,
  } as acorn.Options
  return acorn.parse(source, parseOptions) as TAstWithLocals
}

interface TLocals {
  locals?: Map<string, number>
  parents?: Array<acorn.AnyNode & TLocals>
}

export type TAstWithLocals = acorn.Program & TLocals

/**
 * Analyzes the source code or AST to find global variables.
 * @param {string | TAstWithLocals} source - The source code or AST to analyze.
 * @param {acorn.Options} [_options] - Optional parsing options.
 * @returns {string[]} - An array of global variable names.
 */
export function getGlobals(source: string | TAstWithLocals, _options?: acorn.Options): string[] {
  const options = _options || ({} as acorn.Options)
  const globals = [] as acorn.AnyNode[]
  const ast = typeof source === 'string' ? getAst(source, options) : source

  const declareFunction = (node: acorn.FunctionDeclaration & TLocals) => {
    const fn = node
    fn.locals = fn.locals || new Map()
    node.params.forEach(node => {
      declarePattern(node, fn)
    })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (node.id) {
      fn.locals.set(node.id.name, node.start)
    }
  }
  const declareClass = (node: acorn.ClassDeclaration & TLocals) => {
    node.locals = node.locals || new Map()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (node.id) {
      node.locals.set(node.id.name, node.start)
    }
  }
  const declarePattern = (node: acorn.Pattern, parent: acorn.AnyNode & TLocals) => {
    switch (node.type) {
      case 'Identifier': {
        parent.locals = parent.locals || new Map()
        parent.locals.set(node.name, node.start)
        break
      }
      case 'ObjectPattern': {
        node.properties.forEach(
          (
            node: (acorn.AssignmentProperty | acorn.RestElement) & {
              value?: acorn.Pattern
              argument: acorn.Pattern
            }
          ) => {
            declarePattern(node.value || node.argument, parent)
          }
        )
        break
      }
      case 'ArrayPattern': {
        node.elements.forEach(node => {
          if (node) {
            declarePattern(node, parent)
          }
        })
        break
      }
      case 'RestElement': {
        declarePattern(node.argument, parent)
        break
      }
      case 'AssignmentPattern': {
        declarePattern(node.left, parent)
        break
      }
      default: {
        throw new Error(`Unrecognized pattern type: ${node.type}`)
      }
    }
  }
  const declareModuleSpecifier = (
    node: acorn.ImportDefaultSpecifier | acorn.ImportSpecifier | acorn.ImportNamespaceSpecifier,
    parents: Required<TLocals>['parents']
  ) => {
    ast.locals = ast.locals || new Map()
    ast.locals.set(node.local.name, node.start)
  }
  walk.ancestor(ast, {
    VariableDeclaration(
      node: acorn.VariableDeclaration & TLocals,
      parents: Required<TLocals>['parents']
    ) {
      let parent: Required<TLocals>['parents'][number] | null = null
      for (let i = parents.length - 1; i >= 0 && parent === null; i--) {
        if (node.kind === 'var' ? isScope(parents[i]) : isBlockScope(parents[i])) {
          parent = parents[i]
        }
      }
      if (parent) {
        parent.locals = parent.locals || new Map()
        node.declarations.forEach(declaration => {
          declarePattern(declaration.id, parent)
        })
      }
    },
    FunctionDeclaration(
      node: acorn.FunctionDeclaration & TLocals,
      parents: Required<TLocals>['parents']
    ) {
      let parent: Required<TLocals>['parents'][number] | null = null
      for (let i = parents.length - 2; i >= 0 && parent === null; i--) {
        if (isScope(parents[i])) {
          parent = parents[i]
        }
      }
      if (parent) {
        parent.locals = parent.locals || new Map()
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.id) {
          parent.locals.set(node.id.name, node.start)
        }
      }
      declareFunction(node)
    },
    Function: declareFunction,
    ClassDeclaration(
      node: acorn.ClassDeclaration & TLocals,
      parents: Array<acorn.AnyNode & TLocals>
    ) {
      let parent: Required<TLocals>['parents'][number] | null = null
      for (let i = parents.length - 2; i >= 0 && parent === null; i--) {
        if (isBlockScope(parents[i])) {
          parent = parents[i]
        }
      }
      if (parent) {
        parent.locals = parent.locals || new Map()
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (node.id) {
          parent.locals.set(node.id.name, node.start)
        }
      }
      declareClass(node)
    },
    Class: declareClass,
    TryStatement(node: acorn.TryStatement & { handler: TLocals }) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (node.handler === null || node.handler.param === null) {
        return
      }
      node.handler.locals = node.handler.locals || new Map()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      declarePattern(node.handler.param!, node.handler)
    },
    ImportDefaultSpecifier: declareModuleSpecifier,
    ImportSpecifier: declareModuleSpecifier,
    ImportNamespaceSpecifier: declareModuleSpecifier,
  })
  function identifier(node: acorn.Identifier & TLocals, parents: Array<acorn.AnyNode & TLocals>) {
    const name = node.name
    if (name === 'undefined') {
      return
    }
    for (const parent of parents) {
      if (name === 'arguments' && declaresArguments(parent)) {
        return
      }
      const hasLocal = parent.locals?.has(name)
      const start = parent.locals?.get(name) || 0
      if (hasLocal && start <= node.start) {
        return
      }
    }
    node.parents = parents.slice()
    globals.push(node)
  }
  walk.ancestor(ast, {
    VariablePattern: identifier,
    Identifier: identifier,
    ThisExpression(node: acorn.AnyNode & TLocals, parents: Array<acorn.AnyNode & TLocals>) {
      for (let i = 0; i < parents.length; i++) {
        const parent = parents[i]
        if (parent.type === 'FunctionExpression' || parent.type === 'FunctionDeclaration') {
          return
        }
        if (parent.type === 'PropertyDefinition' && parents[i + 1] === parent.value) {
          return
        }
      }
      node.parents = parents.slice()
      globals.push(node)
    },
  } as unknown as walk.AncestorVisitors<unknown>)
  const groupedGlobals = new Set<string>()
  globals.forEach((node: acorn.AnyNode & { name: string } & TLocals) => {
    const name = node.type === 'ThisExpression' ? 'this' : node.name
    groupedGlobals.add(name)
  })
  return Array.from(groupedGlobals)
}
