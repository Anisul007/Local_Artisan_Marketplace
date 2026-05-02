function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    // Prevent operator injection keys used by Mongo queries.
    if (key.startsWith("$") || key.includes(".")) continue;
    out[key] = sanitizeValue(nested);
  }
  return out;
}

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
}
