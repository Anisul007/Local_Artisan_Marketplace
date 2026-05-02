function onlyDigits(v = "") {
  return String(v || "").replace(/\D+/g, "");
}

function luhnCheck(cardNumber = "") {
  const s = onlyDigits(cardNumber);
  let sum = 0;
  let shouldDouble = false;
  for (let i = s.length - 1; i >= 0; i -= 1) {
    let d = Number(s[i]);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return s.length >= 13 && s.length <= 19 && sum % 10 === 0;
}

function parseExpiry(mmYy = "") {
  const m = String(mmYy || "").trim().match(/^(\d{2})\s*\/\s*(\d{2,4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) return null;
  return { month, year };
}

export async function chargePayment({ amountCents, currency = "AUD", payment = {} }) {
  const cardNumber = String(payment.cardNumber || "").trim();
  const last4 = onlyDigits(cardNumber).slice(-4) || "0000";

  const gatewayRef = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return {
    ok: true,
    data: {
      gateway: "mock-gateway",
      gatewayReference: gatewayRef,
      cardLast4: last4,
      currency,
      amountCents: Number(amountCents) || 0,
    },
  };
}
