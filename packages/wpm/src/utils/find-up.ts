import path from 'node:path'
import { findUpSync } from 'find-up'

export function findUpRoot(pathname: string) {
  const packageFile = findUpSync('package.json', {
    type: 'file',
    cwd: path.dirname(pathname),
  })
  return path.dirname(packageFile!)
}
