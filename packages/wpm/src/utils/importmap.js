const SPE_RE = /^[\.\.\/]+/

export const recursionImportmapValues = (importmap, handler) => {
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

export function normalizeImportmap(importmap) {
  for (const [key, value] of Object.entries(importmap)) {
    const newKey = key.replace(SPE_RE, '')
    const diff = newKey !== key
    if (diff) {
      importmap[`/${newKey}`] = importmap[key]
      Reflect.deleteProperty(importmap, key)
    }
    if (typeof value === 'string') {
      importmap[`${diff ? '/' : ''}${newKey}`] = `/${value.replace(SPE_RE, '')}`
    } else {
      normalizeImportmap(value)
    }
  }
}
