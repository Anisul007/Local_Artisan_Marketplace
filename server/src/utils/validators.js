export const ERR = {
  REQUIRED: "ERR_REQUIRED",
  INVALID_EMAIL: "ERR_INVALID_EMAIL",
  INVALID_PHONE_AU: "ERR_INVALID_PHONE_AU",
  PASSWORD_WEAK: "ERR_PASSWORD_WEAK",
  PASSWORD_MISMATCH: "ERR_PASSWORD_MISMATCH",
  AUTH_FAILED: "ERR_AUTH_FAILED",
  EMAIL_TAKEN: "ERR_EMAIL_TAKEN"
};

export const isEmail = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// AU phone: 04xxxxxxxx / +61 4xxxxxxxx OR landlines 0[2|3|7|8]xxxxxxxx / +61[2|3|7|8]xxxxxxxx
export const isAuPhone = (v = "") => {
  const s = v.replace(/\s+/g, "");
  const mobile = /^(\+?61|0)4\d{8}$/;
  const land   = /^(\+?61|0)(2|3|7|8)\d{8}$/;
  return mobile.test(s) || land.test(s);
};

export const passwordStrong = (v = "") =>
  v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
