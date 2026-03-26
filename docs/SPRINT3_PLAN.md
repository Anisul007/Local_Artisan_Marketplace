# Sprint 3 – Customer Browsing & Ordering

## Implementation order (dependencies first)

| Order | User Story | Status | Notes |
|-------|------------|--------|--------|
| 1 | **US1** Verify Account with OTP | ✅ Done | OTP 5 min; wrong OTP shows error (backend + VerifyEmail) |
| 2 | **US2** Browse by category/keyword | ✅ Done | Category filter, search, sort (existing) |
| 3 | **US3** View Listing Details | ✅ Done | Product page with full details (existing) |
| 4 | **US4** View Product Images and Price | ✅ Done | Thumbnails in shop + product page (existing) |
| 5 | **US5** Add to Cart | ✅ Done | CartContext, Add button on shop + product page, cart icon with count |
| 6 | **US6** Remove/Modify Cart | ✅ Done | Cart page: remove, quantity ±, total updates |
| 7 | **US7** Review Cart Before Checkout | ✅ Done | Cart page shows names, quantities, prices, total; edit/remove |
| 8 | **US8** Confirm Order Before Placing | 🔶 Partial | Checkout page shows review + total; "Confirm" not yet wired to API |
| 9 | **Backend** Orders + confirmation email | ⏳ Next | Order model, POST/GET orders, send confirmation email |
| 10 | **US9** Order Confirmation | ⏳ Next | Success page (order ID, summary) + wire email |
| 11 | **US10** Track Orders & Leave Reviews | ⏳ Next | Customer orders page (status), review form (rating + comment) |
