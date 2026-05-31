import { FaCcAmex, FaCcMastercard, FaCcVisa } from "react-icons/fa6";
import { SiAfterpay, SiGooglepay, SiPaypal } from "react-icons/si";

const logoBox =
  "flex h-11 min-w-[4.75rem] shrink-0 items-center justify-center rounded-lg bg-white px-2.5 ring-1 ring-gray-200";

export function CardNetworksLogo({ className = "" }) {
  return (
    <div className={`${logoBox} gap-1 ${className}`} aria-hidden>
      <FaCcVisa className="h-7 w-9 text-[#1A1F71]" title="Visa" />
      <FaCcMastercard className="h-7 w-9 text-[#EB001B]" title="Mastercard" />
      <FaCcAmex className="h-7 w-9 text-[#006FCF]" title="American Express" />
    </div>
  );
}

export function PaymentMethodLogo({ method, className = "" }) {
  switch (method) {
    case "card":
      return <CardNetworksLogo className={className} />;
    case "paypal":
      return (
        <div className={`${logoBox} ${className}`}>
          <SiPaypal className="h-7 w-auto text-[#003087]" aria-label="PayPal" />
        </div>
      );
    case "afterpay":
      return (
        <div className={`${logoBox} ${className}`}>
          <SiAfterpay className="h-6 w-auto text-black" aria-label="Afterpay" />
        </div>
      );
    case "google_pay":
      return (
        <div className={`${logoBox} ${className}`}>
          <SiGooglepay className="h-7 w-auto text-[#5F6368]" aria-label="Google Pay" />
        </div>
      );
    default:
      return null;
  }
}
