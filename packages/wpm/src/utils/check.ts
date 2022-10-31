import semver from 'semver'
import logger from 'consola'

async function checkNodeEngines(engines: { node: string }) {
  const currentNode = process.versions.node
  const nodeRange = engines?.node ?? ''

  if (!semver.satisfies(currentNode, nodeRange)) {
    logger.warn(
      `Current version of Node.js (\`${currentNode}\`) is unsupported and might cause issues.\n       Please upgrade to a compatible version (${nodeRange}).`,
    )
  }
}

export { checkNodeEngines }
