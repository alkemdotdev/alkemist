import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readDesignOptions,
  designParams,
  suggestedDesign,
  designDetails,
} from '../apps/site/src/lib/design-options.ts';

test('every unchecked design option survives a shared URL round trip', () => {
  const options = {
    ...suggestedDesign,
    font: 'plex',
    board: 'black',
    heading: 'serif',
    palette: 'mono',
    take: 'drafting',
    ...Object.fromEntries(designDetails.map((detail) => [detail.key, false])),
  };
  assert.deepEqual(readDesignOptions(designParams(options)), options);
  assert.deepEqual(
    readDesignOptions(JSON.parse(JSON.stringify(options))),
    options,
  );
});

test('invalid or inherited preferences cannot add attributes or erase defaults', () => {
  const inherited = Object.create({ font: 'plex', notes: false });
  Object.assign(inherited, {
    board: 'javascript:alert(1)',
    palette: {},
    rounded: 'nope',
    onload: 'bad',
    custom: false,
  });
  assert.deepEqual(readDesignOptions(inherited), suggestedDesign);
  assert.deepEqual(readDesignOptions(null), suggestedDesign);
  assert.deepEqual(readDesignOptions(['ubuntu']), suggestedDesign);
});
