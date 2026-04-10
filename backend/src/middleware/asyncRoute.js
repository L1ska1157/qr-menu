// Wraps an async route handler so any rejected promise is forwarded to next(err).
// Required in Express 4 — Express 5 does this automatically.
export const ar = fn => (req, res, next) => fn(req, res, next).catch(next);
