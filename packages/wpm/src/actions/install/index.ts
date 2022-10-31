import type { InstanceDep, WpmInstallOptions, Importmap } from '../../types'
// @ts-ignore
import * as dancf from '@growing-web/dancf-provider'
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

export default async (options: WpmInstallOptions = {}) => {
  const {
    force,
    cwd = process.cwd(),
    cdnUrl,
    systemCdnUrl,
    buildApiUrl,
  } = options

  if (cdnUrl) {
    process.env.WPM_DANCF_CDN_URL = cdnUrl
  }
  if (systemCdnUrl) {
    process.env.WPM_DANCF_SYSTEM_CDN_URL = systemCdnUrl
  }
  if (buildApiUrl) {
    process.env.WPM_DANCF_API_URL = buildApiUrl
  }

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
    } = json
    const install = await parseDependencies(dependencies)

    const generator = new Generator({
      latest: true,
      defaultProvider,
      providers,
      // @ts-ignore
      customProviders: { pnpm_modules: pnpm_modules, dancf },
      env: env || [nodeEnv, 'browser', 'module'],
      resolutions,
      inputMap: {
        imports: {},
      },
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

    await fs.writeJSON(path.resolve(cwd, IMPORTMAP_JSON), importmap, {
      encoding: 'utf-8',
      spaces: 2,
    })

    // singleLineLog('')
    // singleLineLog.clear()
    consola.success(
      `${colors.cyan('[WPM]')} ${colors.green('importmap.json created!')}`,
    )
  } catch (error) {
    console.error(error)
  }
}
