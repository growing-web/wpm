export const registryProviders: Record<string, string> = {
  'denoland:': 'deno',
  'deno:': 'deno',
}

export const mappableSchemes = new Set<String>(['npm', 'deno', 'node'])

export const builtinSchemes = new Set<String>(['node', 'deno'])

export function getProvider(name: string, providers: Record<string, any> = {}) {
  const provider = providers[name]
  if (provider) return provider
  throw new Error('No ' + name + ' provider is defined.')
}
