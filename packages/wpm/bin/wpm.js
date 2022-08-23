#!/usr/bin/env node

import { Command } from 'commander'
import './check.js'
import init from '../src/init.js'
import install from '../src/install.js'

const program = new Command('wpm')
  .enablePositionalOptions()
  .usage('command [options]')

program.command('init').action(init)

program
  .command('install')
  .alias('i')
  .option('-f, --force', 'Force install')
  .option('-i, --include-target', 'Include Target')
  .passThroughOptions()
  .allowUnknownOption()
  .action(install)

program.parse(process.argv)
