import { Generator } from '@jspm/generator';
import * as dancf from '../../lib/index.js';
import assert from 'assert';

const generator = new Generator({
  mapUrl: import.meta.url,
  defaultProvider: 'dancf.system',
  env: ['production', 'browser'],
  customProviders: {
    dancf
  }
});

await generator.install('lit@2.0.0-rc.1');
const json = generator.getMap();

assert.strictEqual(json.imports.lit, 'https://system.dancf.com/npm:lit@2.0.0-rc.1/index.js');
const scope = json.scopes['https://system.dancf.com/'];
assert.ok(scope['@lit/reactive-element']);
assert.ok(scope['lit-element/lit-element.js']);
assert.ok(scope['lit-html']);
