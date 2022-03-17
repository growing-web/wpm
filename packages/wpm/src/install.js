import * as dancf from '@growing-web/dancf-provider';
import jsonSchemaRefParser from 'json-schema-ref-parser';
// import { createRequire } from 'module';
import { read, write } from './utils.js';
import { Generator } from '@jspm/generator';
import { resolve } from 'path';
import { cwd } from 'process';
import { stdout as singleLineLog } from 'single-line-log';

// const require = createRequire(import.meta.url);
const parseDependencies = input => {
  const resolved = {};
  const unsolved = {};
  const dependencies = Array.isArray(input) ? Object.assign(...input) : input;
  
  const protocolRegEx = /^(.*:)(.*)$/;
  const exactPkgRegEx = /^((?:@[^/\\%@]+\/)?[^./\\%@][^/\\%@]*)@([^\/]+)(\/.*)?$/;

  for (const [key, value] of Object.entries(dependencies)) {
    const [, protocol, argv] = value.match(protocolRegEx) || [];

    switch (protocol) {
      // @see: https://pnpm.io/workspaces
      case 'workspace:':
        if (argv === '*') {
          // dependencies[key] = `file://${cwd()}/node_modules/${key}`;
          try {
            // const dir = require.resolve(key);
            // const pjson = read(`${dir}/package.json`);
            const pjson = read(`./node_modules/${key}/package.json`);
            const version = pjson.dependencies?.[key] || pjson.peerDependencies?.[key] || pjson.optionalDependencies?.[key];
            unsolved[key] = version;
          } catch (error) {
            error.message = `Description Failed to parse the workspace protocol: ${error.message}`;
            throw error;
          }
        } else {
          const [, name, version] = workspace.match(exactPkgRegEx) || [];
          if (name) {
            throw new Error(`Workspace aliases are not supported: ${value}`);
          }
          unsolved[key] = version;
        }
        break;
      case 'http:':
      case 'https:':
        resolved[key] = value;
        break;
      default:
        unsolved[key] = value;
    }
  }

  return { resolved, unsolved };
};

export default async () => {
  const config = 'web-module.json';
  const devConfig = 'web-module.dev.json';
  const json = await jsonSchemaRefParser.dereference(resolve(cwd(), config));
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    try {
      const devJson = await jsonSchemaRefParser.dereference(resolve(cwd(), devConfig));
      merge(json, devJson);
    } catch (error) { }
  }

  const { defaultProvider, providers, env, dependencies } = json; 
  const { resolved, unsolved } = parseDependencies(dependencies);
  const generator = new Generator({
    defaultProvider,
    providers,
    customProviders: { dancf },
    env,
    resolutions: unsolved,
    inputMap: {
      imports: resolved
    }
  });

  (async () => {
    for await (const { type, message } of generator.logStream()) {
      if (type === 'install') {
        singleLineLog(`[WPM] ${type}: ${message}`);
      }
    }
  })();

  await generator.install(Object.keys(unsolved));
  await write('importmap.json', generator.getMap());
  singleLineLog(`importmap.json created!`);
  singleLineLog.clear();
}