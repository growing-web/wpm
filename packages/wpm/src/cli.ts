import { cac } from 'cac'
import logger from 'consola'
import colors from 'picocolors'
import pkg from '../package.json'
import { checkNodeEngines } from './utils/check'
import init from './actions/init'
import install from './actions/install'
import consola from 'consola'

consola.wrapConsole()

async function bootstrap() {
  logger.info(colors.green(`v${pkg.version}`))
  const wpm = cac('wpm')

  // Node.js 版本检查
  checkNodeEngines(pkg.engines)

  // 初始化
  wpm.command('init').usage('init wpm.').action(init)

  wpm
    .command('install')
    .usage('wpm install.')
    .option('--force', 'force install.', { default: false })
    .action(async (options: { force: boolean }) => install(options))

  // Invalid command
  wpm.on('command:*', function () {
    logger.error(colors.red('Invalid command!'))
    process.exit(1)
  })
  wpm.version(pkg.version)
  wpm.usage('wpm')
  wpm.help()
  wpm.parse()
}

bootstrap().catch((err: unknown) => {
  logger.error(err)
  process.exit(1)
})
