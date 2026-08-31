const assert = require('assert');
const format = require('tsds-biome');

describe('exports .cjs', () => {
  it('defaults', () => {
    assert.equal(typeof format, 'function');
  });
});
