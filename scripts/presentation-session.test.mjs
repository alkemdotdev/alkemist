import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DisplayAwake,
  presentationMessage,
} from '../packages/components/src/presentation-session.ts';
const session = 'known-session';
const state = {
  type: 'state',
  version: 1,
  session,
  revision: 3,
  slide: 2,
  fragment: -1,
  blackout: false,
};
test('presentation protocol accepts only bounded same-session state and strips extra properties', () => {
  assert.deepEqual(
    presentationMessage(
      JSON.stringify({ ...state, notes: 'private notes' }),
      session,
    ),
    state,
  );
  for (const invalid of [
    null,
    'bad json',
    { ...state, session: 'other' },
    { ...state, version: 2 },
    { ...state, slide: -1 },
    { ...state, slide: 1.2 },
    { ...state, fragment: Infinity },
    { ...state, revision: NaN },
    { ...state, blackout: 'true' },
    { ...state, type: 'eval', code: 'alert(1)' },
    ' '.repeat(5000),
  ])
    assert.equal(presentationMessage(invalid, session), undefined);
});
function sentinel() {
  const events = new EventTarget();
  return {
    released: false,
    addEventListener: events.addEventListener.bind(events),
    async release() {
      this.released = true;
      events.dispatchEvent(new Event('release'));
    },
  };
}
test('wake lock releases on hide and reacquires only after becoming eligible', async () => {
  const locks = [],
    states = [];
  const awake = new DisplayAwake(
    async () => {
      const lock = sentinel();
      locks.push(lock);
      return lock;
    },
    (state) => states.push(state),
  );
  await awake.update(true);
  assert.equal(locks.length, 0);
  await awake.setDesired(true, true);
  assert.equal(states.at(-1), 'active');
  await awake.update(true);
  assert.equal(locks.length, 1);
  await locks[0].release();
  assert.equal(states.at(-1), 'released');
  await awake.update(true);
  assert.equal(locks.length, 1, 'system release must not loop');
  await awake.update(false);
  await awake.update(true);
  assert.equal(locks.length, 2);
  await awake.setDesired(false, true);
  assert.equal(locks[1].released, true);
  assert.equal(states.at(-1), 'off');
});
test('late wake grants are released after leaving presentation without overwriting state', async () => {
  let resolve;
  const states = [],
    lock = sentinel();
  const awake = new DisplayAwake(
    () => new Promise((r) => (resolve = r)),
    (state) => states.push(state),
  );
  const pending = awake.setDesired(true, true);
  await awake.setDesired(false, false);
  resolve(lock);
  await pending;
  assert.equal(lock.released, true);
  assert.equal(states.at(-1), 'off');
});
test('denied and unsupported wake locks leave controls usable without repeated prompts', async () => {
  let attempts = 0;
  const states = [];
  const awake = new DisplayAwake(
    async () => {
      attempts++;
      throw new Error('denied');
    },
    (state) => states.push(state),
  );
  await awake.setDesired(true, true);
  assert.equal(states.at(-1), 'denied');
  await awake.update(true);
  assert.equal(attempts, 1);
  await awake.update(false);
  await awake.update(true);
  assert.equal(attempts, 2);
  const unsupported = new DisplayAwake(undefined, (state) =>
    states.push(state),
  );
  await unsupported.setDesired(true, true);
  assert.equal(states.at(-1), 'unsupported');
});
