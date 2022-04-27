import * as dancf from '@growing-web/dancf-provider'
import * as nodemodules from '@growing-web/nodemodules-provider'
import { stat } from 'fs/promises'
import merge from 'lodash.merge'
import jsonSchemaRefParser from 'json-schema-ref-parser'
import { read, write } from './utils/index.js'
import {
  recursionImportmapValues,
  normalizeImportmap,
} from './utils/importmap.js'
import { createSymlink } from './utils/createSymlink.js'
import { Generator, clearCache } from '@jspm/generator'
import { resolve, join } from 'path'
import { cwd } from 'process'
import { stdout as singleLineLog } from 'single-line-log'
import { doBuildSingleEntry } from '@growing-web/esm-pack-core'
import { readPackageJSON, writePackageJSON } from 'pkg-types'
import colors from 'picocolors'
import consola from 'consola'

consola.wrapConsole()

const PACKAGE_RE = /^((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\\/]+)?$/

const parseDependencies = async (input) => {
  const install = []
  const dependencies = Array.isArray(input) ? Object.assign(...input) : input
  const exactPkgRegEx = /^(?:([a-z]+):)?(?:(@?[^@]+)@)?(.*)?$/

  for (const [name, value] of Object.entries(dependencies)) {
    let [, registry, alias, range] = value.match(exactPkgRegEx) || []
    // @see: https://pnpm.io/workspaces
    if (registry === 'workspace') {
      registry = 'npm'
      if (range === '*') {
        // dependencies[name] = `file://${cwd()}/node_modules/${name}`;
        const packageJson = `./node_modules/${name}/package.json`
        range = await read(packageJson).then(
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

export default async (options) => {
  const { force } = options
  const config = 'web-module.json'
  const devConfig = 'web-module.dev.json'
  const exists = await stat(config)
    .then((stats) => stats.isFile())
    .catch(() => false)
  const json = exists
    ? await jsonSchemaRefParser.dereference(resolve(cwd(), config))
    : read('package.json')
  const nodeEnv = process.env.NODE_ENV || 'development'

  if (nodeEnv === 'development') {
    try {
      const devJson = await jsonSchemaRefParser.dereference(
        resolve(cwd(), devConfig),
      )
      merge(json, devJson)
    } catch (error) {}
  }

  if (force) {
    clearCache()
  }

  const { defaultProvider, providers, env, dependencies, resolutions } = json
  const install = await parseDependencies(dependencies)
  const generator = new Generator({
    latest: true,
    defaultProvider,
    providers,
    customProviders: { nodemodules, dancf },
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
  let importmap = generator.getMap()

  // only nodemodules
  if (defaultProvider === 'nodemodules') {
    symlinkDirs(importmap)

    // esm fix
    await polyfillEsm(importmap, install)

    // normalize importmap
    normalizeImportmap(importmap)
  }

  await write('importmap.json', importmap)

  singleLineLog('')
  singleLineLog.clear()
  consola.success(
    `${colors.cyan('[WPM]')} ${colors.green('importmap.json created!')}`,
  )
}

function symlinkDirs(importmap) {
  const symlinkDirs = findSymlinkDirs(importmap)
  const cwd = process.cwd()
  symlinkDirs.forEach((dir) => {
    createSymlink(
      resolve(cwd, dir),
      resolve(cwd, dir.replace(/^[\.\.\/]+/, '')),
      'exec',
    )
  })
}

async function polyfillEsm(importmap, install = []) {
  let files = recursionImportmapValues(importmap)
  const cwd = process.cwd()

  const targets = install.map((item) => {
    const target = item.target
    const match = target.match(PACKAGE_RE)
    if (!match) {
      return target
    }
    return match?.[1] ?? target
  })
  await Promise.all(
    files.map(async (file) => {
      const sourcePath = getSourcePath(file)
      const pkg = await readPackageJSON(sourcePath)
      if (targets.includes(pkg.name) || pkg.__ESMD__ === true) {
        return () => {}
      }
      await writePackageJSON(join(sourcePath, 'package.json'), {
        ...pkg,
        __ESMD__: true,
      })
      return doBuildSingleEntry({
        input: resolve(cwd, file),
        outputPath: sourcePath,
        sourcePath: sourcePath,
        sourcemap: false,
        env: 'development',
        devPrefix: '',
        name: pkg.name,
      })
    }),
  )
}

function getSourcePath(filepath) {
  const NODE_MODULES = 'node_modules'
  const index = filepath.lastIndexOf(NODE_MODULES)
  const endIndex = index + NODE_MODULES.length + 1
  const prefix = filepath.substring(0, endIndex)
  const subpath = filepath.substring(endIndex)
  let packageName = ''

  let count = 0
  for (const path of subpath.split('/')) {
    packageName += path + '/'
    if (!subpath.startsWith('@') || count === 1) {
      break
    }
    count++
  }
  packageName = packageName.replace(/\/$/, '')
  return resolve(process.cwd(), prefix + packageName)
}

function findSymlinkDirs(importmap) {
  return recursionImportmapValues(importmap, (value) => {
    if (value.startsWith('../')) {
      const splitValues = value.split('/')
      let flag = false
      let ret = ''
      for (const val of splitValues) {
        ret += val + (flag ? '' : '/')
        if (flag) {
          break
        }
        if (val === 'node_modules') {
          flag = true
        }
      }
      return ret
    }
  })
}
