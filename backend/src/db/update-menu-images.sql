-- Backfill image_url for existing seeded menu items.
-- Run once after migration 004 on a database already populated via seed.sql.
-- Matches by item name — safe to re-run (idempotent).

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&h=400&fit=crop&auto=format' WHERE name = 'Bruschetta';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=400&fit=crop&auto=format' WHERE name = 'Soup of the Day';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&h=400&fit=crop&auto=format' WHERE name = 'Crispy Calamari';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=400&fit=crop&auto=format' WHERE name = 'Grilled Salmon';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop&auto=format' WHERE name = 'Beef Burger';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=400&fit=crop&auto=format' WHERE name = 'Mushroom Risotto';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&h=400&fit=crop&auto=format' WHERE name = 'Chicken Caesar Wrap';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=400&fit=crop&auto=format' WHERE name = 'Tiramisu';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&h=400&fit=crop&auto=format' WHERE name = 'Chocolate Lava Cake';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=800&h=400&fit=crop&auto=format' WHERE name = 'Fresh Fruit Sorbet';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=400&fit=crop&auto=format' WHERE name = 'Still Water (500ml)';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&h=400&fit=crop&auto=format' WHERE name = 'Sparkling Lemonade';
