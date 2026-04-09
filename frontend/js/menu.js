function menuApp() {
  return {
    categories: [],
    cartItems: [],
    loading: true,
    sessionId: sessionStorage.getItem('session_id'),

    get cartItemCount() {
      return this.cartItems
        .filter(i => i.is_available !== false)
        .reduce((sum, i) => sum + i.quantity, 0);
    },

    cartQty(itemId) {
      const entry = this.cartItems.find(i => i.menu_item_id === itemId);
      return entry ? entry.quantity : 0;
    },

    async init() {
      if (!this.sessionId) { location.href = '/'; return; }
      await Promise.all([this.fetchMenu(), this.fetchCart()]);
      this.loading = false;
      this.initSSE();

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.fetchMenu();
          this.fetchCart();
        }
      });
    },

    initSSE() {
      const es = new EventSource(`/api/cart/events?session_id=${this.sessionId}`);
      es.addEventListener('cart_updated', (e) => {
        this.cartItems = JSON.parse(e.data).items;
      });
      es.addEventListener('session_closed', () => { location.href = '/'; });
      window.addEventListener('beforeunload', () => es.close());
    },

    async fetchMenu() {
      const res = await fetch(`/api/menu?session_id=${this.sessionId}`);
      if (!res.ok) { await isSessionError(res); return; }
      const data = await res.json();
      this.categories = data.categories;
    },

    async fetchCart() {
      const res = await fetch(`/api/cart?session_id=${this.sessionId}`);
      if (!res.ok) { await isSessionError(res); return; }
      const data = await res.json();
      this.cartItems = data.items;
    },

    async addToCart(itemId) {
      const res = await fetch(`/api/cart/items?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_item_id: itemId, quantity: this.cartQty(itemId) + 1 }),
      });
      if (!res.ok) await isSessionError(res);
      // cartItems updated via SSE cart_updated event
    },

    scrollToCategory(id) {
      document.getElementById('cat-' + id)?.scrollIntoView({ behavior: 'smooth' });
    },
  };
}
