import assert from 'assert';
import format from 'tsds-biome';

describe('exports .mjs', () => {
  it('defaults', () => {
    assert.equal(typeof format, 'function');
  });
});
