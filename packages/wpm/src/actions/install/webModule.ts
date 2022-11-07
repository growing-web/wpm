import type { Importmap, InstanceDep } from '../../types'
import fs from 'fs-extra'
import path from 'path'
import { WEB_MODULES, NODE_MODULES_RE, NODE_MODULES } from '../../constants'
import { doBuild } from '@growing-web/esmpack-builder'
import { readPackageJSON } from 'pkg-types'
import fg from 'fast-glob'
import { findUpSync } from 'find-up'
import { findUpRoot } from '../../utils/find-up'

/**
 * 根据importmap创建web_modules
 */
export async function createWebModules(importmap: Importmap) {
  const webModules = path.join(process.cwd(), WEB_MODULES)

  fs.ensureDirSync(webModules)

  // 生成importmap
  const resultImportMap = await createImportmap(importmap)

  // 清理web_modules
  await cleanWebModules()

  // cjs->esm
  await transformToEsm(resultImportMap, [])

  return resultImportMap
}

/**
 * @param importmap
 */
export async function createImportmap(importmap: Importmap) {
  const [imports, scopes] = await Promise.all([
    createImports(importmap.imports),
    createScopes(importmap.scopes),
  ])
  return { imports, scopes }
}

/**
 * 生成scopes
 * @param scopes
 * @returns
 */
async function createScopes(scopes: Importmap['scopes'] = {}) {
  let resultScopes: Importmap['scopes'] = {}

  for (const [key, value] of Object.entries(scopes)) {
    const newKey = await normalizeScopeKey(key)

    const newValue = (await createImports(value as any, true)) as any

    resultScopes[newKey || '/'] = newValue
  }

  return resultScopes
}

/**
 * 生成imports
 * @param imports
 * @param needCopy
 * @returns
 */
async function createImports(imports: Importmap['imports'], needCopy = true) {
  let resultImports: Importmap['imports'] = {}

  const cwd = process.cwd()

  for (let [key, value] of Object.entries(imports)) {
    value = path.join(value)
    let realPath = await normalizePath(value)

    realPath = cleanPnpmGlobalPath(realPath)

    resultImports[key] = path
      .join('/', WEB_MODULES, realPath)
      .replaceAll(NODE_MODULES, WEB_MODULES)
    resultImports[key] = resultImports[key].replaceAll('\\', '/')

    if (needCopy) {
      const pathname = path.join(cwd, value)
      const pkgRoot = findUpRoot(pathname)

      const index = pkgRoot.indexOf(NODE_MODULES)
      const relativePath = pkgRoot.substring(index, pkgRoot.length)

      const targetPathname = relativePath.replaceAll(NODE_MODULES, WEB_MODULES)
      const targetPath = path.join(cwd, targetPathname)

      if (!fs.existsSync(targetPath)) {
        await fs.copy(pkgRoot, targetPath, {
          dereference: true,
          overwrite: true,
        })
      }
    }
  }

  return resultImports
}

/**
 *
 * @param pathname 格式化scoped key
 * ../node_modules/xxx => /web_modules/xxx
 * @returns
 */
async function normalizeScopeKey(key: string) {
  let _key = key.replace(/\.\.\//g, '')
  return _key.replace(NODE_MODULES_RE, `/${WEB_MODULES}`)
}

/**
 *
 * @param pathname 格式化路径
 * ../node_modules/xxx => xxx
 * @returns
 */
async function normalizePath(pathname: string) {
  let _pathname = pathname.replace(/\.\.\//g, '')

  if (NODE_MODULES_RE.test(_pathname)) {
    return _pathname.replace(NODE_MODULES_RE, '')
  }

  return pathname
}

/**
 * 遍历importmap,获取所有值
 * @param importmap
 * @param handler
 * @returns
 */
export const recursionImportmapValues = (
  importmap: Record<string, any>,
  handler?: (...arg: any) => any,
): any[] => {
  if (!importmap) {
    return []
  }

  let ret = []

  for (const value of Object.values(importmap)) {
    if (typeof value === 'string') {
      if (handler) {
        ret.push(handler(value))
      } else {
        ret.push(value)
      }
    } else {
      ret.push(...recursionImportmapValues(value, handler))
    }
  }
  return Array.from(new Set(ret)).filter(Boolean)
}

/**
 * 对 web_modules 多余文件进行删除
 */
export async function cleanWebModules() {
  const cwd = process.cwd()
  const webModuleCwd = path.join(cwd, WEB_MODULES)

  const findDirs = fg.sync('**/**/node_modules', {
    cwd: webModuleCwd,
    onlyDirectories: true,
    absolute: true,
  })
  // 从最深层次改起
  findDirs.reverse()

  for (const findDir of findDirs) {
    const dir = path.basename(findDir)
    if (dir === NODE_MODULES) {
      await fs.remove(findDir)
    }
  }
}

async function transformToEsm(
  importmap: Record<string, any>,
  install: InstanceDep[] = [],
) {
  let files = recursionImportmapValues(importmap)

  const cwd = process.cwd()

  // const targets = install.map((item: any) => {
  //   const target = item.target
  //   const match = target.match(PACKAGE_RE)
  //   if (!match) {
  //     return target
  //   }
  //   return match?.[1] ?? target
  // })
  await Promise.all(
    files.map(async (file) => {
      const input = path.join(cwd, file)

      const sourcePath = findUpRoot(input)

      const pkg = await readPackageJSON(sourcePath)
      if (pkg.esmd) {
        // console.info(`${pkg.name} is esmd.`)
        return
      }

      try {
        await doBuild({
          input,
          outputPath: sourcePath,
          sourcePath: sourcePath,
          sourcemap: false,
          // 默认为本地开发环境
          env: process.env.NODE_ENV || 'production',
          devPrefix: '',
          name: pkg.name,
        })
        pkg.esmd = true
        fs.writeJSONSync(path.join(sourcePath, 'package.json'), pkg, {
          spaces: 2,
        })
        // console.info(`${pkg.name} esmd success.`)
      } catch (error) {
        console.error(error)
      }
    }),
  )
}

/**
 * pnpm 会使用全局的依赖地址，对这个地址进行格式化
 * @param pathname
 */

function cleanPnpmGlobalPath(pathname: string) {
  if (!pathname.includes('.pnpm')) {
    return pathname
  }

  const paths = pathname.split('/')

  let ret = []
  let allowJoin = false
  for (let index = 0; index < paths.length; index++) {
    const item = paths[index]

    if (allowJoin) {
      ret.push(item)
    }
    if (item === '.pnpm') {
      allowJoin = true
    }
  }
  return ret.join('/')
}
