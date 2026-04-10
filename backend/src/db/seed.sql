-- Seed: 10 tables
INSERT INTO tables (table_number) VALUES
  (1),(2),(3),(4),(5),(6),(7),(8),(9),(10)
ON CONFLICT DO NOTHING;

-- Seed: 4 categories
INSERT INTO menu_categories (id, name, display_order) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000000', 'Starters',  1),
  ('aaaaaaaa-0002-0000-0000-000000000000', 'Mains',     2),
  ('aaaaaaaa-0003-0000-0000-000000000000', 'Desserts',  3),
  ('aaaaaaaa-0004-0000-0000-000000000000', 'Drinks',    4)
ON CONFLICT DO NOTHING;

-- Seed: 12 menu items
INSERT INTO menu_items (category_id, name, description, ingredients, prep_time_minutes, price_cents, display_order, image_url) VALUES
  -- Starters (3)
  ('aaaaaaaa-0001-0000-0000-000000000000', 'Bruschetta',
   'Toasted sourdough topped with fresh tomato and basil',
   ARRAY['sourdough bread','tomato','fresh basil','olive oil','garlic'], 8, 650, 1,
   'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0001-0000-0000-000000000000', 'Soup of the Day',
   'Ask your waiter for today''s freshly made soup',
   ARRAY['seasonal vegetables','stock','herbs','cream'], 10, 550, 2,
   'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0001-0000-0000-000000000000', 'Crispy Calamari',
   'Lightly battered squid rings with lemon aioli',
   ARRAY['squid','flour','egg','lemon','aioli','parsley'], 12, 895, 3,
   'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&h=400&fit=crop&auto=format'),

  -- Mains (4)
  ('aaaaaaaa-0002-0000-0000-000000000000', 'Grilled Salmon',
   'Atlantic salmon fillet with roasted potatoes and seasonal greens',
   ARRAY['salmon','potatoes','green beans','lemon butter','dill'], 20, 1850, 1,
   'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0002-0000-0000-000000000000', 'Beef Burger',
   '180g beef patty, cheddar, lettuce, tomato, pickles on a brioche bun',
   ARRAY['beef','cheddar','brioche bun','lettuce','tomato','pickle','mustard','ketchup'], 15, 1490, 2,
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0002-0000-0000-000000000000', 'Mushroom Risotto',
   'Creamy arborio rice with mixed wild mushrooms and parmesan',
   ARRAY['arborio rice','wild mushrooms','parmesan','shallots','white wine','stock','butter'], 25, 1290, 3,
   'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0002-0000-0000-000000000000', 'Chicken Caesar Wrap',
   'Grilled chicken, romaine, parmesan, Caesar dressing in a flour tortilla',
   ARRAY['chicken breast','romaine','parmesan','caesar dressing','flour tortilla','croutons'], 12, 1090, 4,
   'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&h=400&fit=crop&auto=format'),

  -- Desserts (3)
  ('aaaaaaaa-0003-0000-0000-000000000000', 'Tiramisu',
   'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream',
   ARRAY['mascarpone','ladyfingers','espresso','eggs','sugar','cocoa powder'], 5, 750, 1,
   'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0003-0000-0000-000000000000', 'Chocolate Lava Cake',
   'Warm dark chocolate cake with a molten centre, served with vanilla ice cream',
   ARRAY['dark chocolate','butter','eggs','sugar','flour','vanilla ice cream'], 14, 850, 2,
   'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0003-0000-0000-000000000000', 'Fresh Fruit Sorbet',
   'Two scoops of seasonal fruit sorbet',
   ARRAY['seasonal fruit','sugar','lemon juice'], 3, 550, 3,
   'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=800&h=400&fit=crop&auto=format'),

  -- Drinks (2)
  ('aaaaaaaa-0004-0000-0000-000000000000', 'Still Water (500ml)',
   'Chilled still mineral water',
   ARRAY['water'], 1, 250, 1,
   'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=400&fit=crop&auto=format'),

  ('aaaaaaaa-0004-0000-0000-000000000000', 'Sparkling Lemonade',
   'House-made lemonade with a sparkling twist',
   ARRAY['lemon juice','sugar','sparkling water','mint'], 3, 395, 2,
   'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&h=400&fit=crop&auto=format')

ON CONFLICT DO NOTHING;
