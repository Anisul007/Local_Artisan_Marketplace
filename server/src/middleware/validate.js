export function validate(schema) {
  return (req, res, next) => {
    try {
      const errors = [];
      if (schema?.params) {
        for (const fn of schema.params) {
          const msg = fn(req.params);
          if (msg) errors.push(msg);
        }
      }
      if (schema?.query) {
        for (const fn of schema.query) {
          const msg = fn(req.query);
          if (msg) errors.push(msg);
        }
      }
      if (schema?.body) {
        for (const fn of schema.body) {
          const msg = fn(req.body);
          if (msg) errors.push(msg);
        }
      }
      if (errors.length > 0) {
        return res.status(400).json({ ok: false, message: errors[0], errors });
      }
      return next();
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid request payload" });
    }
  };
}

export const requiredString = (field, label = field) => (obj = {}) => {
  const v = obj?.[field];
  if (typeof v !== "string" || !v.trim()) return `${label} is required`;
  return null;
};

export const optionalStringMax = (field, max, label = field) => (obj = {}) => {
  const v = obj?.[field];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return `${label} must be a string`;
  if (v.length > max) return `${label} too long`;
  return null;
};
