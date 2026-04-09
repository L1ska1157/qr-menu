const SESSION_ERROR_CODES = new Set(['SESSION_CLOSED', 'SESSION_NOT_FOUND', 'INVALID_SESSION_ID']);

// Call when the response body hasn't been read yet.
// Returns true and redirects if it's a session error.
async function isSessionError(res) {
  if (res.ok) return false;
  if (res.status !== 400 && res.status !== 404 && res.status !== 409) return false;
  try {
    const data = await res.json();
    if (SESSION_ERROR_CODES.has(data.error)) { location.href = '/error.html'; return true; }
  } catch {}
  return false;
}

// Call when the response body was already parsed into `data`.
// Returns true and redirects if it's a session error.
function redirectOnSessionError(data) {
  if (SESSION_ERROR_CODES.has(data?.error)) { location.href = '/error.html'; return true; }
  return false;
}
