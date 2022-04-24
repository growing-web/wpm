import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { copy } from './utils/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export default async () => {
  const src = resolve(__dirname, 'web-module.default.json')
  const dest = 'web-module.json'
  await copy(src, dest)
  console.log(`${dest} created!`)
}
