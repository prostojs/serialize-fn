/* eslint-disable unicorn/prefer-export-from */
/* eslint-disable import/no-default-export */
import { createConfig } from '../../rollup.mjs'

const dir = import.meta.url.slice(7, 'rollup.config.js'.length * -1)

export default createConfig(dir)
