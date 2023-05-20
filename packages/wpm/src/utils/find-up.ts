import path from 'node:path'
import { findUpSync } from 'find-up'

export function findUpRoot(pathname: string) {
  const packageFile = findUpSync('package.json', {
    type: 'file',
    cwd: path.dirname(pathname),
  })
  return path.dirname(packageFile!)
}

export function getPackageRoot(): string {
  const cwd = process.cwd()

  const lockFile = findUpSync(
    ['yarn.lock', 'pnpm-lock.yaml', 'package-lock.json'],
    {
      cwd,
    },
  )

  return path.dirname(lockFile!)
}
