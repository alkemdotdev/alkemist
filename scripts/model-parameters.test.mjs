import assert from 'node:assert/strict';
import test from 'node:test';
import { renderModel } from '../packages/components/src/visualization-renderers.ts';
import {
  modelParameters,
  modelViews,
} from '../packages/components/src/model-parameters.ts';
import {
  exposedParameters,
  validateParameters,
} from '../packages/components/src/parameters.ts';

const base = {
  src: '/fixture.glb',
  title: 'Fixture',
};

test('Model renders authored parameters and only requested controls', () => {
  const html = renderModel({
    ...base,
    view: 'top',
    wireframe: true,
    parameters: ['view'],
  });
  assert.match(html, /data-parameter-values="[^" ]*top/);
  assert.match(html, /data-parameter="view"/);
  assert.doesNotMatch(html, /data-parameter="wireframe"/);
  assert.match(html, /data-wireframe checked/);
  assert.equal(modelViews.includes('perspective'), true);
});

test('Model parameter patches validate as an atomic declared set', () => {
  assert.deepEqual(
    validateParameters(modelParameters, { view: 'front', wireframe: true }),
    { view: 'front', wireframe: true },
  );
  assert.throws(() =>
    validateParameters(modelParameters, { view: 'side', wireframe: true }),
  );
  assert.throws(() => validateParameters(modelParameters, { spin: true }));
  assert.throws(() =>
    exposedParameters(modelParameters, ['view', 'spin'], false),
  );
});
