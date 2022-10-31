import path from 'path'
import fs from 'fs-extra'
import { WEB_MODULE_CONFIG, defaultWebModuleConfig } from '../../constants'

export default async function init(cwd = process.cwd()) {
  const dest = path.join(cwd, WEB_MODULE_CONFIG)

  if (!fs.existsSync(dest)) {
    await fs.writeJSON(dest, defaultWebModuleConfig, { spaces: 2 })
    console.log(`${WEB_MODULE_CONFIG} created!`)
  } else {
    console.warn(`${WEB_MODULE_CONFIG} is exists!`)
  }
}
