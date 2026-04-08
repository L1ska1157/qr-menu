function landingApp() {
  return {
    loading: true,
    error: false,
    status: null,
    restaurantName: '',
    tableId: null,
    sessionId: null,

    async init() {
      const params = new URLSearchParams(location.search);
      this.tableId = params.get('table_id');

      if (!this.tableId) {
        this.error = true;
        this.loading = false;
        return;
      }

      const res = await fetch(`/api/table/${this.tableId}/status`);
      if (res.status === 404) {
        location.href = '/error.html';
        return;
      }

      const data = await res.json();
      this.restaurantName = data.restaurant_name;
      this.status = data.status;
      this.sessionId = data.session_id;
      this.loading = false;
    },

    joinSession() {
      sessionStorage.setItem('session_id', this.sessionId);
      location.href = '/menu.html';
    },

    async createSession() {
      const res = await fetch(`/api/table/${this.tableId}/session`, { method: 'POST' });
      if (!res.ok) {
        // If session just got created by someone else, join it
        const data = await res.json();
        if (data.session_id) {
          sessionStorage.setItem('session_id', data.session_id);
          location.href = '/menu.html';
          return;
        }
        this.error = true;
        return;
      }
      const data = await res.json();
      sessionStorage.setItem('session_id', data.session_id);
      location.href = '/menu.html';
    },
  };
}
