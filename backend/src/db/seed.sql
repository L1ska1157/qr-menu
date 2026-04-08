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
INSERT INTO menu_items (category_id, name, description, ingredients, prep_time_minutes, price_cents, display_order) VALUES
  -- Starters (3)
  ('aaaaaaaa-0001-0000-0000-000000000000', 'Bruschetta',
   'Toasted sourdough topped with fresh tomato and basil',
   ARRAY['sourdough bread','tomato','fresh basil','olive oil','garlic'], 8, 650, 1),

  ('aaaaaaaa-0001-0000-0000-000000000000', 'Soup of the Day',
   'Ask your waiter for today''s freshly made soup',
   ARRAY['seasonal vegetables','stock','herbs','cream'], 10, 550, 2),

  ('aaaaaaaa-0001-0000-0000-000000000000', 'Crispy Calamari',
   'Lightly battered squid rings with lemon aioli',
   ARRAY['squid','flour','egg','lemon','aioli','parsley'], 12, 895, 3),

  -- Mains (4)
  ('aaaaaaaa-0002-0000-0000-000000000000', 'Grilled Salmon',
   'Atlantic salmon fillet with roasted potatoes and seasonal greens',
   ARRAY['salmon','potatoes','green beans','lemon butter','dill'], 20, 1850, 1),

  ('aaaaaaaa-0002-0000-0000-000000000000', 'Beef Burger',
   '180g beef patty, cheddar, lettuce, tomato, pickles on a brioche bun',
   ARRAY['beef','cheddar','brioche bun','lettuce','tomato','pickle','mustard','ketchup'], 15, 1490, 2),

  ('aaaaaaaa-0002-0000-0000-000000000000', 'Mushroom Risotto',
   'Creamy arborio rice with mixed wild mushrooms and parmesan',
   ARRAY['arborio rice','wild mushrooms','parmesan','shallots','white wine','stock','butter'], 25, 1290, 3),

  ('aaaaaaaa-0002-0000-0000-000000000000', 'Chicken Caesar Wrap',
   'Grilled chicken, romaine, parmesan, Caesar dressing in a flour tortilla',
   ARRAY['chicken breast','romaine','parmesan','caesar dressing','flour tortilla','croutons'], 12, 1090, 4),

  -- Desserts (3)
  ('aaaaaaaa-0003-0000-0000-000000000000', 'Tiramisu',
   'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream',
   ARRAY['mascarpone','ladyfingers','espresso','eggs','sugar','cocoa powder'], 5, 750, 1),

  ('aaaaaaaa-0003-0000-0000-000000000000', 'Chocolate Lava Cake',
   'Warm dark chocolate cake with a molten centre, served with vanilla ice cream',
   ARRAY['dark chocolate','butter','eggs','sugar','flour','vanilla ice cream'], 14, 850, 2),

  ('aaaaaaaa-0003-0000-0000-000000000000', 'Fresh Fruit Sorbet',
   'Two scoops of seasonal fruit sorbet',
   ARRAY['seasonal fruit','sugar','lemon juice'], 3, 550, 3),

  -- Drinks (2)
  ('aaaaaaaa-0004-0000-0000-000000000000', 'Still Water (500ml)',
   'Chilled still mineral water',
   ARRAY['water'], 1, 250, 1),

  ('aaaaaaaa-0004-0000-0000-000000000000', 'Sparkling Lemonade',
   'House-made lemonade with a sparkling twist',
   ARRAY['lemon juice','sugar','sparkling water','mint'], 3, 395, 2)

ON CONFLICT DO NOTHING;
