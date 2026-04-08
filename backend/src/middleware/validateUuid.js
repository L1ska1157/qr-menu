const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(val) {
  return typeof val === 'string' && UUID_RE.test(val);
}

export function requireUuidParam(paramName, errorCode) {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (!isUuid(val)) {
      return next({ code: errorCode, message: `${paramName} must be a valid UUID` });
    }
    next();
  };
}
