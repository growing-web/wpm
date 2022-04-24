# DANCF Provider

这是一个 Import Map 生成器的配置，CDN 的提供者将会设置为 dancf.com，它能够在全球加速访问 NPM 的包，包括中国。

## Getting Started

### 安装

Node.js:
```
npm install @jspm/generator
npm install @growing-web/dancf-provider
```

`@jspm/generator` only ships as an ES module, so to use it in Node.js add `"type": "module"` to your package.json file or write an `.mjs` to load it.

### 生成 Import Maps

By default the generator generates import maps against the JSPM CDN by treating the `defaultProvider: 'dancf'` option. This can be configured to other CDNs or sources including local `nodemodules`, see the next section on how to achieve this.

generate.mjs
```js
import { Generator } from '@jspm/generator';
import * as dancf from '@growing-web/dancf-provider';

const generator = new Generator({
  mapUrl: import.meta.url,
  env: ['production', 'browser', 'module'],
  defaultProvider: 'dancf',
  customProviders: {
    dancf
  }
});

// Install a new package into the import map
await generator.install('react-dom');

// Install a package version and subpath into the import map (installs lit/decorators.js)
await generator.install('lit@2/decorators.js');

// Install a package version to a custom alias
await generator.install({ alias: 'react16', target: 'react@16' });

// Install a specific subpath of a package
await generator.install({ target: 'lit@2', subpath: './html.js' });

// Install an export from a locally located package folder into the map
// The package.json is used to determine the exports and dependencies.
await generator.install({ alias: 'mypkg', target: './packages/local-pkg', subpath: './feature' });

console.log(JSON.stringify(generator.getMap(), null, 2));
/*
 * Outputs the import map:
 *
 * {
 *   "imports": {
 *     "lit/decorators.js": "https://es.dancf.com/npm:lit@2.0.0-rc.1/decorators.js",
 *     "lit/html.js": "https://es.dancf.com/npm:lit@2.0.0-rc.1/html.js",
 *     "mypkg/feature": "./packages/local-pkg/feature.js",
 *     "react": "./local/react.js",
 *     "react16": "https://es.dancf.com/npm:react@16.14.0/index.js",
 *     "react-dom": "https://es.dancf.com/npm:react-dom@17.0.2/index.js"
 *   },
 *   "scopes": { ... }
 * }
 */
```

更多使用说明：[jspm/generator](https://github.com/jspm/generator)

### License

MIT
