import commonJS from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import { readFileSync, rmSync } from 'fs'
import path from 'path'
import { dts } from 'rollup-plugin-dts'
import typescript from 'rollup-plugin-typescript2'

export function createConfig(dir) {
  console.log({ dir })
  const pkg = JSON.parse(readFileSync(path.join(dir, './package.json')).toString())

  const external = ['url', 'crypto', 'stream', 'packages/*/src', 'http', 'path']
  const deps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]
  deps.length > 0 && external.push(...deps)

  rmSync(path.join(dir, `./dist`), { recursive: true, force: true })

  const replacePlugin = replace({
    values: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      '__VERSION__': JSON.stringify(pkg.version),
    },
    preventAssignment: true,
  })

  function createConfig(type) {
    const formats = {
      cjs: 'cjs',
      mjs: 'es',
    }
    const target = path.join(dir, './src/index')
    return {
      external,
      input: `${target}.ts`,
      output: {
        file: `./dist/index.${type}`,
        format: formats[type],
        sourcemap: false,
      },
      plugins: [
        commonJS({ sourceMap: false }),
        nodeResolve(),
        typescript({
          check: true,
          tsconfig: path.join(dir, './tsconfig.json'),
          tsconfigOverride: {
            target: 'es2020',
            declaration: false,
            declarationMap: false,
            removeComments: true,
            include: ['src'],
            exclude: ['**/__tests__', '*.spec.ts'],
          },
        }),
        replacePlugin,
      ],
    }
  }

  function createDtsConfig() {
    return {
      external,
      input: path.join(dir, `./src/index.ts`),
      output: {
        file: path.join(dir, `./dist/index.d.ts`),
        format: 'es',
        sourcemap: false,
      },
      plugins: [
        dts({
          tsconfig: path.join(dir, './tsconfig.json'),
          compilerOptions: {
            removeComments: false,
          },
        }),
      ],
    }
  }

  return [createConfig('mjs'), createConfig('cjs'), createDtsConfig()]
}
