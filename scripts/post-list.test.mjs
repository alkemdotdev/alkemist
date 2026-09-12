import assert from 'node:assert/strict';
import test from 'node:test';
import { preparePostListItems } from '../packages/components/src/post-list-helpers.ts';

test('an explicit lead appears once without mutating the supplied order', () => {
  const items = [
    { href: '/new/', title: 'New', description: '' },
    { href: '/middle/', title: 'Middle', description: '' },
    { href: '/lead/', title: 'Lead', description: '' },
  ];
  const result = preparePostListItems(items, '/lead/');
  assert.deepEqual(
    result.map((item) => item.href),
    ['/lead/', '/new/', '/middle/'],
  );
  assert.deepEqual(
    items.map((item) => item.href),
    ['/new/', '/middle/', '/lead/'],
  );
  assert.equal(result.length, items.length);
});

test('empty collections and absent featured items preserve supplied order', () => {
  assert.deepEqual(preparePostListItems([], '/missing/'), []);
  const items = [{ href: '/one/', title: 'One', description: '' }];
  assert.deepEqual(preparePostListItems(items), items);
  assert.deepEqual(preparePostListItems(items, '/missing/'), items);
});
