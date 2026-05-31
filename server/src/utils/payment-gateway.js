function onlyDigits(v = "") {
  return String(v || "").replace(/\D+/g, "");
}

const WALLET_METHODS = new Set(["paypal", "afterpay", "google_pay"]);

export function isWalletPaymentMethod(method = "") {
  return WALLET_METHODS.has(String(method || "").toLowerCase());
}

export async function chargePayment({ amountCents, currency = "AUD", payment = {} }) {
  const method = String(payment.method || "card").toLowerCase();
  const amount = Number(amountCents) || 0;

  if (amount < 0) {
    return { ok: false, message: "Invalid payment amount." };
  }

  const gatewayRef = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  if (isWalletPaymentMethod(method)) {
    const labels = { paypal: "PayPal", afterpay: "Afterpay", google_pay: "Google Pay" };
    return {
      ok: true,
      data: {
        gateway: labels[method] || method,
        gatewayReference: gatewayRef,
        paymentMethod: method,
        cardLast4: "",
        currency,
        amountCents: amount,
      },
    };
  }

  const cardName = String(payment.cardName || "").trim();
  const cardNumber = String(payment.cardNumber || "").trim();
  const expiry = String(payment.expiry || "").trim();
  const cvc = String(payment.cvc || "").trim();

  if (!cardName) return { ok: false, message: "Card holder name is required." };
  if (!cardNumber) return { ok: false, message: "Card number is required." };
  if (!expiry) return { ok: false, message: "Card expiry is required." };
  if (!cvc) return { ok: false, message: "CVC is required." };

  const last4 = onlyDigits(cardNumber).slice(-4) || "0000";

  return {
    ok: true,
    data: {
      gateway: "Card",
      gatewayReference: gatewayRef,
      paymentMethod: "card",
      cardLast4: last4,
      currency,
      amountCents: amount,
    },
  };
}
