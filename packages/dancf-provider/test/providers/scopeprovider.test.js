import { Generator } from '@jspm/generator';
import * as dancf from '../../lib/index.js';
import assert from 'assert';

const generator = new Generator({
  mapUrl: new URL('../../', import.meta.url),
  defaultProvider: 'nodemodules',
  providers: {
    'lit-html': 'dancf'
  },
  customProviders: {
    dancf
  }
});

await generator.install('lit-element');
await generator.install('lit-html');

const json = generator.getMap();

assert.strictEqual(json.imports['lit-element'], './node_modules/lit-element/lit-element.js');
assert.ok(json.scopes['./']['lit-html/lib/shady-render.js'].startsWith('https://es.dancf.com'));
assert.ok(json.scopes['./']['lit-html/lit-html.js'].startsWith('https://es.dancf.com'));
