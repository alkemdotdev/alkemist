import assert from 'node:assert/strict';
import test from 'node:test';
import { INKS, inkContrast } from '../packages/theme/src/palette.ts';

test('each invariant ink clears 3:1 on both boards and 4.5:1 in code panels', () => {
  for (const ink of INKS) {
    assert.ok(
      inkContrast(ink.hex, '#eeeeee') >= 3,
      `${ink.name}: whiteboard marks`,
    );
    assert.ok(
      inkContrast(ink.hex, '#111111') >= 4.5,
      `${ink.name}: blackboard/code text`,
    );
  }
  assert.ok(inkContrast('#111111', '#eeeeee') > 16);
});
