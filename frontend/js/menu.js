function menuApp() {
  return {
    categories: [],
    cartItemCount: 0,
    loading: true,
    sessionId: sessionStorage.getItem('session_id'),

    async init() {
      if (!this.sessionId) { location.href = '/'; return; }
      await Promise.all([this.fetchMenu(), this.fetchCartCount()]);
      this.loading = false;
      this.initSSE();

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.fetchMenu();
          this.fetchCartCount();
        }
      });
    },

    initSSE() {
      const es = new EventSource(`/api/cart/events?session_id=${this.sessionId}`);
      es.addEventListener('cart_updated', (e) => {
        const items = JSON.parse(e.data).items;
        this.cartItemCount = items.filter(i => i.is_available !== false).reduce((sum, i) => sum + i.quantity, 0);
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

    async fetchCartCount() {
      const res = await fetch(`/api/cart?session_id=${this.sessionId}`);
      if (!res.ok) { await isSessionError(res); return; }
      const data = await res.json();
      this.cartItemCount = data.items.filter(i => i.is_available !== false).reduce((sum, i) => sum + i.quantity, 0);
    },

    async addToCart(itemId) {
      const res = await fetch(`/api/cart/items?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_item_id: itemId, quantity: 1 }),
      });
      if (!res.ok) await isSessionError(res);
      // cartItemCount is updated via SSE cart_updated event
    },

    scrollToCategory(id) {
      document.getElementById('cat-' + id)?.scrollIntoView({ behavior: 'smooth' });
    },
  };
}
