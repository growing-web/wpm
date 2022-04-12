import * as dancf from '@growing-web/dancf-provider';
import { stat } from 'fs/promises';
import merge from 'lodash.merge';
import jsonSchemaRefParser from 'json-schema-ref-parser';
// import { createRequire } from 'module';
import { read, write } from './utils.js';
import { Generator, clearCache } from '@jspm/generator';
import { resolve } from 'path';
import { cwd } from 'process';
import { stdout as singleLineLog } from 'single-line-log';

// const require = createRequire(import.meta.url);
const parseDependencies = async input => {
  const install = [];
  const dependencies = Array.isArray(input) ? Object.assign(...input) : input;
  const exactPkgRegEx = /^(?:([a-z]+):)?(?:(@?[^@]+)@)?(.*)?$/;

  for (const [name, value] of Object.entries(dependencies)) {
    let [, registry, alias, range] = value.match(exactPkgRegEx) || [];
    // @see: https://pnpm.io/workspaces
    if (registry === 'workspace') {
      registry = 'npm';
      if (range === '*') {
        // dependencies[name] = `file://${cwd()}/node_modules/${name}`;
        const packageJson = `./node_modules/${name}/package.json`;
        range = await read(packageJson).then(({ version }) => {
          if (typeof version !== 'string') {
            throw new Error(`Resolve workspace error: ${packageJson}: The 'version' attribute was not found`);
          }
          return version;
        }, error => {
          error.message = `Resolve workspace error: Description Failed to parse the workspace protocol: ${error.message}`;
          throw error;
        });
      }
    }

    if (!registry || registry === 'npm') {
      const sRange = range ? `@${range}` : range;
      const sName = alias ? alias : name;
      const sAlias = alias ? name : undefined;
      install.push({
        target: `${sName}${sRange}`,
        alias: sAlias
      });
    } else {
      install.push({
        target: value,
        alias: name
      });
    }
  }

  return install;
};

export default async (options) => {
  const { force } = options;
  const config = 'web-module.json';
  const devConfig = 'web-module.dev.json';
  const exists = await stat(config).then(stats => stats.isFile()).catch(() => false);
  const json = exists ? await jsonSchemaRefParser.dereference(resolve(cwd(), config)) : read('package.json');
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'development') {
    try {
      const devJson = await jsonSchemaRefParser.dereference(resolve(cwd(), devConfig));
      merge(json, devJson);
    } catch (error) { }
  }

  if (force) {
    clearCache();
  }

  const { defaultProvider, providers, env, dependencies, resolutions } = json; 
  const install = await parseDependencies(dependencies);
  const generator = new Generator({
    latest: true,
    defaultProvider,
    providers,
    customProviders: { dancf },
    env: env || [nodeEnv, 'browser', 'module'],
    resolutions,
    inputMap: {
      imports: {}
    }
  });

  (async () => {
    for await (const { type, message } of generator.logStream()) {
      if (type === 'install') {
        singleLineLog(`[WPM] ${type}: ${message}`);
      }
    }
  })();

  await generator.install(install);
  await write('importmap.json', generator.getMap());
  
  singleLineLog('');
  singleLineLog.clear();
  console.log('[WPM] importmap.json created!');
}