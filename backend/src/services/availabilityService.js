import { getCart } from '../db/queries/cart.js';

export async function findUnavailableItems(sessionId) {
  const items = await getCart(sessionId);
  return items.filter(i => !i.is_available).map(i => i.menu_item_id);
}
