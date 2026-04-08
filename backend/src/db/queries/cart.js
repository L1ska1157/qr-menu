import { pool } from '../../config/db.js';

export async function getCart(sessionId) {
  const { rows } = await pool.query(`
    SELECT ci.menu_item_id,
           ci.quantity,
           mi.name,
           mi.price_cents,
           mi.is_available
      FROM cart_items ci
      JOIN menu_items mi ON mi.id = ci.menu_item_id
     WHERE ci.session_id = $1
     ORDER BY ci.added_at
  `, [sessionId]);
  return rows;
}

export async function upsertCartItem(sessionId, menuItemId, quantity) {
  await pool.query(`
    INSERT INTO cart_items (session_id, menu_item_id, quantity)
    VALUES ($1, $2, $3)
    ON CONFLICT (session_id, menu_item_id)
    DO UPDATE SET quantity = EXCLUDED.quantity
  `, [sessionId, menuItemId, quantity]);
}

export async function removeCartItem(sessionId, menuItemId) {
  await pool.query(
    'DELETE FROM cart_items WHERE session_id = $1 AND menu_item_id = $2',
    [sessionId, menuItemId]
  );
}

export async function clearCart(sessionId) {
  await pool.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
}
