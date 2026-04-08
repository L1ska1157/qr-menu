import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/db/queries/cart.js', () => ({
  getCart: jest.fn(),
}));

const { getCart } = await import('../../src/db/queries/cart.js');
const { findUnavailableItems } = await import('../../src/services/availabilityService.js');

describe('findUnavailableItems', () => {
  it('returns empty array when all items available', async () => {
    getCart.mockResolvedValue([
      { menu_item_id: 'a', is_available: true },
      { menu_item_id: 'b', is_available: true },
    ]);
    expect(await findUnavailableItems('session-1')).toEqual([]);
  });

  it('returns ids of unavailable items', async () => {
    getCart.mockResolvedValue([
      { menu_item_id: 'a', is_available: true },
      { menu_item_id: 'b', is_available: false },
      { menu_item_id: 'c', is_available: false },
    ]);
    expect(await findUnavailableItems('session-1')).toEqual(['b', 'c']);
  });

  it('returns empty array when cart is empty', async () => {
    getCart.mockResolvedValue([]);
    expect(await findUnavailableItems('session-1')).toEqual([]);
  });
});
