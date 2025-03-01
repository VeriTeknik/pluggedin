import PluggedInClient, { Types } from '../src/index';

describe('Index exports', () => {
  it('should export PluggedInClient as default', () => {
    expect(PluggedInClient).toBeDefined();
    expect(typeof PluggedInClient).toBe('function');
  });

  it('should export Types', () => {
    expect(Types).toBeDefined();
    expect(typeof Types).toBe('object');
  });
});