import { getLastWaiterRequest } from '../db/queries/waiter.js';

export const COOLDOWN_SECONDS = 120;

export async function getCooldownStatus(sessionId) {
  const last = await getLastWaiterRequest(sessionId);
  if (!last) {
    return { cooldown_active: false, cooldown_remaining_seconds: 0, cooldown_seconds: COOLDOWN_SECONDS, last_request_at: null };
  }

  const elapsed = Math.floor((Date.now() - new Date(last.requested_at).getTime()) / 1000);
  const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed);

  return {
    cooldown_active: remaining > 0,
    cooldown_remaining_seconds: remaining,
    cooldown_seconds: COOLDOWN_SECONDS,
    last_request_at: last.requested_at,
  };
}
