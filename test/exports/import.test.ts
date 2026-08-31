import assert from 'assert';
import format from 'tsds-biome';

describe('exports .ts', () => {
  it('defaults', () => {
    assert.equal(typeof format, 'function');
  });
});
