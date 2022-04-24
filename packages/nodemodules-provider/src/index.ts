import { LatestPackageTarget } from './install/package.js'
import { ExactPackage } from './install/package.js'
import { fetch } from './fetch'
import { JspmError } from './common/err.js'
import { importedFrom } from './common/url.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const NODE_MODULES = 'node_modules'

export function pkgToUrl(pkg: ExactPackage) {
  return new URL(pkg.version + pkg.name + '/').href
}

export function parseUrlPkg(url: string): ExactPackage | undefined {
  const nodeModulesIndex = url.lastIndexOf(`/${NODE_MODULES}/`)
  if (nodeModulesIndex === -1) return undefined
  const version = url.slice(0, nodeModulesIndex + 14)
  const pkgParts = url.slice(nodeModulesIndex + 14).split('/')
  const name =
    pkgParts[0][0] === '@' ? pkgParts[0] + '/' + pkgParts[1] : pkgParts[0]
  return { registry: NODE_MODULES, name, version }
}

async function dirExists(url: URL, parentUrl?: string) {
  const res = await fetch(url, {})
  switch (res.status) {
    case 304:
    case 200:
      return true
    case 404:
      return false
    default:
      throw new JspmError(
        `Invalid status code ${res.status} looking up "${url}" - ${
          'statusText' in res ? res.statusText : ''
        }${importedFrom(parentUrl)}`,
      )
  }
}

export async function resolveLatestTarget(
  target: LatestPackageTarget,
  _unstable: boolean,
  _layer: string,
  parentUrl: string,
): Promise<ExactPackage | null> {
  let curUrl = new URL(`${NODE_MODULES}/${target.name}`, parentUrl)

  const rootUrl = new URL(`/${NODE_MODULES}/${target.name}`, parentUrl).href

  while (!(await dirExists.call(null, curUrl))) {
    if (curUrl.href === rootUrl) {
      const paths = rootUrl.split('/').reverse()
      let libName = ''
      for (const item of paths) {
        if (item === NODE_MODULES) {
          break
        }
        libName = `${item}/${libName}`
      }
      const resolvePath = require.resolve(libName.replace(/\/$/, ''))
      if (resolvePath) {
        let index = resolvePath.lastIndexOf(NODE_MODULES)
        return {
          registry: NODE_MODULES,
          name: target.name,
          version:
            'file://' +
            resolvePath.substring(0, index + NODE_MODULES.length + 1),
        }
      }
      return null
    }

    curUrl = new URL(
      `../../${target.name.indexOf('/') === -1 ? '' : '../'}${NODE_MODULES}/${
        target.name
      }`,
      curUrl,
    )
  }
  return {
    registry: NODE_MODULES,
    name: target.name,
    version: curUrl.href.slice(0, -target.name.length),
  }
}
