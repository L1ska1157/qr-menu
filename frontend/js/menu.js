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

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.fetchMenu();
          this.fetchCartCount();
        }
      });
    },

    async fetchMenu() {
      const res = await fetch(`/api/menu?session_id=${this.sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      this.categories = data.categories;
    },

    async fetchCartCount() {
      const res = await fetch(`/api/cart?session_id=${this.sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      this.cartItemCount = data.items.reduce((sum, i) => sum + i.quantity, 0);
    },

    async addToCart(itemId) {
      const res = await fetch(`/api/cart/items?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_item_id: itemId, quantity: 1 }),
      });
      if (res.ok) this.cartItemCount++;
    },

    scrollToCategory(id) {
      document.getElementById('cat-' + id)?.scrollIntoView({ behavior: 'smooth' });
    },
  };
}
