function cartApp() {
  return {
    items: [],
    unpaidOrderCount: 0,
    loading: true,
    submitting: false,
    errorMsg: '',
    sessionId: sessionStorage.getItem('session_id'),

    get availableItems()   { return this.items.filter(i => i.is_available !== false); },
    get unavailableItems() { return this.items.filter(i => i.is_available === false); },
    get total() {
      return this.availableItems.reduce((sum, i) => sum + (i.price_cents * i.quantity) / 100, 0);
    },

    async init() {
      if (!this.sessionId) { location.href = '/'; return; }
      await Promise.all([this.fetchCart(), this.fetchUnpaidOrderCount()]);
      this.loading = false;
      this.initSSE();
    },

    initSSE() {
      const es = new EventSource(`/api/cart/events?session_id=${this.sessionId}`);
      es.addEventListener('cart_updated', (e) => {
        if (this.submitting) return;
        this.items = JSON.parse(e.data).items;
      });
      es.addEventListener('session_closed', () => { location.href = '/'; });
      window.addEventListener('beforeunload', () => es.close());
    },

    async fetchCart() {
      const res = await fetch(`/api/cart?session_id=${this.sessionId}`);
      if (!res.ok) { await isSessionError(res); return; }
      const data = await res.json();
      this.items = data.items;
    },

    async fetchUnpaidOrderCount() {
      const res = await fetch(`/api/orders?session_id=${this.sessionId}`);
      if (!res.ok) { await isSessionError(res); return; }
      const data = await res.json();
      this.unpaidOrderCount = data.orders.filter(o => !o.is_paid).length;
    },

    async increment(menuItemId) {
      const item = this.items.find(i => i.menu_item_id === menuItemId);
      if (!item) return;
      item.quantity++;
      const res = await fetch(`/api/cart/items/${menuItemId}?session_id=${this.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: item.quantity }),
      });
      if (!res.ok) await isSessionError(res);
    },

    async decrement(menuItemId) {
      const item = this.items.find(i => i.menu_item_id === menuItemId);
      if (!item) return;
      if (item.quantity <= 1) {
        this.items = this.items.filter(i => i.menu_item_id !== menuItemId);
        const res = await fetch(`/api/cart/items/${menuItemId}?session_id=${this.sessionId}`, { method: 'DELETE' });
        if (!res.ok) await isSessionError(res);
      } else {
        item.quantity--;
        const res = await fetch(`/api/cart/items/${menuItemId}?session_id=${this.sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity }),
        });
        if (!res.ok) await isSessionError(res);
      }
    },

    async submitOrder() {
      this.errorMsg = '';
      if (this.availableItems.length === 0) return;

      this.submitting = true;
      const res = await fetch(`/api/orders?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: this.availableItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })) }),
      });

      if (res.status === 201) {
        this.items = [];
        location.href = '/orders.html';
        return;
      }

      const data = await res.json();
      if (redirectOnSessionError(data)) return;
      if (data.error === 'ITEM_UNAVAILABLE') {
        location.reload();
        return;
      } else {
        this.errorMsg = data.message || 'Something went wrong. Please try again.';
      }
      this.submitting = false;
    },
  };
}
