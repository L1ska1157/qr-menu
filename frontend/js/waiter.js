function waiterApp() {
  return {
    cooldownActive: false,
    cooldownRemaining: 0,
    cooldownTotal: 120,
    dashOffset: 138.23,
    sessionId: sessionStorage.getItem('session_id'),
    _interval: null,

    get circumference() { return 138.23; },

    async init() {
      if (!this.sessionId) return;
      await this.fetchStatus();
      if (this.cooldownActive) this.startCountdown();
    },

    async fetchStatus() {
      const res = await fetch(`/api/waiter/status?session_id=${this.sessionId}`);
      if (!res.ok) { await isSessionError(res); return; }
      const data = await res.json();
      this.cooldownActive = data.cooldown_active;
      this.cooldownRemaining = data.cooldown_remaining_seconds;
      this.cooldownTotal = data.cooldown_seconds;
      this.updateDashOffset();
    },

    async callWaiter() {
      const res = await fetch(`/api/waiter/call?session_id=${this.sessionId}`, { method: 'POST' });
      const data = await res.json();
      if (redirectOnSessionError(data)) return;
      if (res.status === 201) {
        this.cooldownTotal = data.cooldown_seconds;
        this.cooldownActive = true;
        this.cooldownRemaining = data.cooldown_seconds;
        this.updateDashOffset();
        this.startCountdown();
      } else if (res.status === 429) {
        this.cooldownActive = true;
        this.cooldownRemaining = data.cooldown_remaining_seconds ?? 0;
        this.updateDashOffset();
        this.startCountdown();
      }
    },

    startCountdown() {
      if (this._interval) clearInterval(this._interval);
      this._interval = setInterval(() => {
        if (this.cooldownRemaining > 0) {
          this.cooldownRemaining--;
          this.updateDashOffset();
        } else {
          this.cooldownActive = false;
          clearInterval(this._interval);
          this._interval = null;
        }
      }, 1000);
    },

    updateDashOffset() {
      const progress = (this.cooldownTotal - this.cooldownRemaining) / this.cooldownTotal;
      this.dashOffset = this.circumference * (1 - progress);
    },
  };
}
