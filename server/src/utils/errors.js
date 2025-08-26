export function sendErr(res, status, code, message) {
  return res.status(status).json({ ok: false, code, message });
}
