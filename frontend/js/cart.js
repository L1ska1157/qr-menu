function cartApp() {
  return {
    items: [],
    unpaidOrderCount: 0,
    loading: true,
    submitting: false,
    errorMsg: '',
    sessionId: sessionStorage.getItem('session_id'),

    get total() {
      return this.items.reduce((sum, i) => sum + (i.price_cents * i.quantity) / 100, 0);
    },

    async init() {
      if (!this.sessionId) { location.href = '/'; return; }
      await Promise.all([this.fetchCart(), this.fetchUnpaidOrderCount()]);
      this.loading = false;
    },

    async fetchCart() {
      const res = await fetch(`/api/cart?session_id=${this.sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      this.items = data.items;
    },

    async fetchUnpaidOrderCount() {
      const res = await fetch(`/api/orders?session_id=${this.sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      this.unpaidOrderCount = data.orders.filter(o => !o.is_paid).length;
    },

    async increment(menuItemId) {
      const item = this.items.find(i => i.menu_item_id === menuItemId);
      if (!item) return;
      item.quantity++;
      await fetch(`/api/cart/items/${menuItemId}?session_id=${this.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: item.quantity }),
      });
    },

    async decrement(menuItemId) {
      const item = this.items.find(i => i.menu_item_id === menuItemId);
      if (!item) return;
      if (item.quantity <= 1) {
        this.items = this.items.filter(i => i.menu_item_id !== menuItemId);
        await fetch(`/api/cart/items/${menuItemId}?session_id=${this.sessionId}`, { method: 'DELETE' });
      } else {
        item.quantity--;
        await fetch(`/api/cart/items/${menuItemId}?session_id=${this.sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity }),
        });
      }
    },

    async submitOrder() {
      this.errorMsg = '';
      this.submitting = true;
      const res = await fetch(`/api/orders?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: this.items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })) }),
      });

      if (res.status === 201) {
        this.items = [];
        location.href = '/orders.html';
        return;
      }

      const data = await res.json();
      if (data.error === 'ITEM_UNAVAILABLE') {
        const ids = new Set(data.unavailable_item_ids);
        this.items = this.items.map(i => ({ ...i, is_available: !ids.has(i.menu_item_id) }));
        this.errorMsg = 'Some items are no longer available. Please remove them and try again.';
      } else {
        this.errorMsg = data.message || 'Something went wrong. Please try again.';
      }
      this.submitting = false;
    },
  };
}
