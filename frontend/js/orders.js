function ordersApp() {
  return {
    orders: [],
    paymentBanner: null,
    loading: true,
    sessionId: sessionStorage.getItem('session_id'),

    get numberedOrders() {
      return [...this.orders]
        .sort((a, b) => new Date(a.placed_at) - new Date(b.placed_at))
        .map((o, i) => ({ ...o, number: i + 1 }));
    },
    get unpaidOrders() { return this.numberedOrders.filter(o => !o.is_paid); },
    get paidOrders()   { return this.numberedOrders.filter(o => o.is_paid);  },
    get unpaidTotal()  { return this.unpaidOrders.reduce((s, o) => s + o.total_cents, 0); },

    async init() {
      if (!this.sessionId) { location.href = '/'; return; }

      const params = new URLSearchParams(location.search);
      const payment = params.get('payment');
      if (payment === 'success') {
        this.paymentBanner = 'success';
        this.pollPaymentStatus();
      } else if (payment === 'failed') {
        this.paymentBanner = 'failed';
      }

      await this.fetchOrders();
      this.loading = false;
    },

    async fetchOrders() {
      const res = await fetch(`/api/orders?session_id=${this.sessionId}`);
      if (!res.ok) { await isSessionError(res); return; }
      const data = await res.json();
      this.orders = data.orders;
    },

    async pollPaymentStatus() {
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const res = await fetch(`/api/payments/status/${this.sessionId}?session_id=${this.sessionId}`);
        if (!res.ok) continue;
        const data = await res.json();
        const completed = data.payments.some(p => p.status === 'completed');
        if (completed) {
          await this.fetchOrders();
          this.paymentBanner = null;
          return;
        }
      }
      this.paymentBanner = 'verifying';
    },

    async payOrder(orderId) {
      const res = await fetch(`/api/payments/initiate?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: [orderId] }),
      });
      if (!res.ok) { if (!await isSessionError(res)) alert('Could not initiate payment. Please try again.'); return; }
      const data = await res.json();
      location.href = data.redirect_url;
    },

    async payAll() {
      const ids = this.unpaidOrders.map(o => o.order_id);
      const res = await fetch(`/api/payments/initiate?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: ids }),
      });
      if (!res.ok) { if (!await isSessionError(res)) alert('Could not initiate payment. Please try again.'); return; }
      const data = await res.json();
      location.href = data.redirect_url;
    },

    formatTime(iso) {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    formatDate(iso) {
      return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    },
  };
}
