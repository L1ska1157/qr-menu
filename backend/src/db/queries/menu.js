import { pool } from '../../config/db.js';

export async function getMenu() {
  const { rows } = await pool.query(`
    SELECT
      c.id          AS category_id,
      c.name        AS category_name,
      c.display_order AS category_order,
      i.id          AS item_id,
      i.name,
      i.description,
      i.ingredients,
      i.prep_time_minutes,
      i.price_cents,
      i.is_available,
      i.image_url,
      i.display_order AS item_order
    FROM menu_categories c
    JOIN menu_items i ON i.category_id = c.id
    ORDER BY c.display_order, i.display_order
  `);

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.category_id)) {
      map.set(row.category_id, {
        id: row.category_id,
        name: row.category_name,
        display_order: row.category_order,
        items: [],
      });
    }
    map.get(row.category_id).items.push({
      id: row.item_id,
      name: row.name,
      description: row.description,
      ingredients: row.ingredients,
      prep_time_minutes: row.prep_time_minutes,
      price_cents: row.price_cents,
      is_available: row.is_available,
      image_url: row.image_url ?? null,
    });
  }
  return Array.from(map.values());
}
