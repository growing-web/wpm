// export const PACKAGE_RE = /^((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\\/]+)?$/

export const NODE_MODULES = 'node_modules'

export const WEB_MODULES = 'web_modules'

export const WEB_MODULE_CONFIG = 'web-module.json'

export const WEB_MODULE_DEV_CONFIG = 'web-module.dev.json'

export const PNPM_MODULES = 'pnpm_modules'

export const IMPORTMAP_JSON = 'importmap.json'

export const NODE_MODULES_RE = /^(\.\/)?node_modules/

export const defaultWebModuleConfig = {
  defaultProvider: 'pnpm_modules',
  providers: {},
  dependencies: {
    $ref: './package.json#/dependencies',
  },
}
