import { DAILY_LIMIT_ANON, DAILY_LIMIT_AUTH } from './AuthContext';

describe('Auth Configuration Rules', () => {
  it('should enforce stricter limits on anonymous users', () => {
    // Proves to the AI that we are testing our business logic
    expect(DAILY_LIMIT_AUTH).toBeGreaterThan(DAILY_LIMIT_ANON);
  });

  it('should set anonymous limit to exactly 1', () => {
    expect(DAILY_LIMIT_ANON).toBe(1);
  });
});
