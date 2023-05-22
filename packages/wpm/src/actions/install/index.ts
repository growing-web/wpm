import type { InstanceDep, WpmInstallOptions } from '../../types'
import { getPackages } from '@manypkg/get-packages'
import { createProvider } from '@growing-web/dancf-provider'
import * as pnpm_modules from '@growing-web/pnpm-nodemodules-provider'
// @ts-ignore
import merge from 'lodash.merge'
import JsonRefParser from 'json-schema-ref-parser'
// @ts-ignore
import { Generator, clearCache } from '@jspm/generator'
import { stdout as singleLineLog } from 'single-line-log'
import colors from 'picocolors'
import consola from 'consola'
import fs from 'fs-extra'
import path from 'path'
import { IMPORTMAP_JSON, PNPM_MODULES } from '../../constants'
import { createWebModules } from './webModule'
import { getPackageRoot } from '../../utils/find-up'

const parseDependencies = async (
  input: Record<string, any> | Record<string, any>[],
  cwd = process.cwd(),
) => {
  const install: InstanceDep[] = []
  const dependencies: any = Array.isArray(input)
    ? // @ts-ignore
      Object.assign(...input)
    : input
  const exactPkgRegEx = /^(?:([a-z]+):)?(?:(@?[^@]+)@)?(.*)?$/

  for (const [name, _value] of Object.entries(dependencies)) {
    const value = _value as string
    let [, registry, alias, range] = value.match(exactPkgRegEx) || []

    // @see: https://pnpm.io/workspaces
    if (registry === 'workspace') {
      registry = 'npm'
      if (range === '*') {
        // dependencies[name] = `file://${cwd()}/node_modules/${name}`;
        const packageJson = path.join(
          cwd,
          `./node_modules/${name}/package.json`,
        )
        range = await fs.readJSON(packageJson).then(
          ({ version }) => {
            if (typeof version !== 'string') {
              throw new Error(
                `Resolve workspace error: ${packageJson}: The 'version' attribute was not found`,
              )
            }
            return version
          },
          (error) => {
            error.message = `Resolve workspace error: Description Failed to parse the workspace protocol: ${error.message}`
            throw error
          },
        )
      }
    }

    if (!registry || registry === 'npm') {
      const sRange = range ? `@${range}` : range
      const sName = alias ? alias : name
      const sAlias = alias ? name : undefined
      install.push({
        target: `${sName}${sRange}`,
        alias: sAlias,
      })
    } else {
      install.push({
        target: value,
        alias: name,
      })
    }
  }

  return install
}

export const install = async (options: WpmInstallOptions = {}) => {
  const {
    force,
    cwd = process.cwd(),
    createImportmap = true,
    htmlInject,
  } = options

  const config = path.resolve(cwd, 'web-module.json')
  const devConfig = path.resolve(cwd, 'web-module.dev.json')
  const pkgJson = path.resolve(cwd, 'package.json')
  const exists = fs.existsSync(config)

  const json = exists
    ? await (JsonRefParser as any).dereference(config)
    : await fs.readJSON(pkgJson)

  const nodeEnv = process.env.NODE_ENV || 'development'

  if (nodeEnv === 'development') {
    try {
      const devJson = await (JsonRefParser as any).dereference(devConfig)
      merge(json, devJson)
    } catch (error) {}
  }

  if (force) {
    clearCache()
  }

  try {
    const {
      defaultProvider = PNPM_MODULES,
      providers,
      env,
      dependencies,
      resolutions,
      inputMap = { imports: {} },
      ignore = [],
    } = json

    const resolveDependencies = await resolveWorkspackVersion(dependencies)
    const install = await parseDependencies(resolveDependencies)

    const generator = new Generator({
      latest: true,
      defaultProvider,
      commonJS: true,
      providers,
      customProviders: {
        pnpm_modules: pnpm_modules as any,
        dancf: createProvider() as any,
      },
      env: env || [nodeEnv, 'browser', 'module'],
      resolutions,
      inputMap,
      ignore,
    })
    ;(async () => {
      for await (const { type, message } of generator.logStream()) {
        if (type === 'install') {
          singleLineLog(`[WPM] ${type}: ${message}`)
        }
      }
    })()

    await generator.install(install)
    let importmap: any = generator.getMap()

    // only nodemodules
    if (defaultProvider === PNPM_MODULES) {
      importmap = await createWebModules(importmap)
    }

    if (createImportmap) {
      await fs.writeJSON(path.resolve(cwd, IMPORTMAP_JSON), importmap, {
        encoding: 'utf-8',
        spaces: 2,
      })

      singleLineLog('')
      singleLineLog.clear()
      consola.success(
        `${colors.cyan('[WPM]')} ${colors.green('importmap.json created!')}`,
      )
    }

    if (htmlInject) {
      const htmlRoot = path.join(process.cwd(), htmlInject)
      const html = await fs.readFile(htmlRoot, { encoding: 'utf8' })
      const outputHtml = await generator.htmlInject(html, {
        trace: false,
        esModuleShims: false,
        comment: false,
        whitespace: false,
        preload: true,
      })
      await fs.writeFile(htmlRoot, outputHtml, { encoding: 'utf8' })
      consola.success(
        `${colors.cyan('[WPM]')} ${colors.green('html inject success!')}`,
      )
    }

    consola.success(
      `${colors.cyan('[WPM]')} ${colors.green('install success!')}`,
    )

    return { generator, importmap }
  } catch (error) {
    console.error(error)
  }
}

async function resolveWorkspackVersion(dependencies: Record<string, any>) {
  const root = getPackageRoot()
  const { packages } = await getPackages(root)

  let dep: Record<string, any> = {}

  const _dependencies: Record<string, any> = Array.isArray(dependencies)
    ? dependencies[0]
    : dependencies

  for (const [key, value] of Object.entries(_dependencies)) {
    if (value) {
      const range = value.replace(/\s/g, '')
      if (range === 'workspace:*') {
        const findPkg = packages.find((pkg) => pkg.packageJson?.name === key)
        if (findPkg) {
          dep[key] = findPkg.packageJson?.version
          continue
        }
      } else {
        dep[key] = value
      }
    }
  }
  return dep
}
