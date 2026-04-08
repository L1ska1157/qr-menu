import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/db/queries/waiter.js', () => ({
  getLastWaiterRequest: jest.fn(),
}));

const { getLastWaiterRequest } = await import('../../src/db/queries/waiter.js');
const { getCooldownStatus } = await import('../../src/services/waiterService.js');

describe('getCooldownStatus', () => {
  it('returns inactive when no request exists', async () => {
    getLastWaiterRequest.mockResolvedValue(null);
    const result = await getCooldownStatus('session-1');
    expect(result.cooldown_active).toBe(false);
    expect(result.cooldown_remaining_seconds).toBe(0);
    expect(result.last_request_at).toBeNull();
  });

  it('returns active cooldown when request was recent', async () => {
    const requestedAt = new Date(Date.now() - 30_000); // 30s ago
    getLastWaiterRequest.mockResolvedValue({ requested_at: requestedAt });
    const result = await getCooldownStatus('session-1');
    expect(result.cooldown_active).toBe(true);
    expect(result.cooldown_remaining_seconds).toBeGreaterThan(85);
    expect(result.cooldown_remaining_seconds).toBeLessThanOrEqual(90);
  });

  it('returns inactive when cooldown has expired', async () => {
    const requestedAt = new Date(Date.now() - 130_000); // 130s ago
    getLastWaiterRequest.mockResolvedValue({ requested_at: requestedAt });
    const result = await getCooldownStatus('session-1');
    expect(result.cooldown_active).toBe(false);
    expect(result.cooldown_remaining_seconds).toBe(0);
  });
});
