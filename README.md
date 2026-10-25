# Barwaqt Super Admin -- test

Next.js console for platform administrators (`ADMIN` role). Separate app from the customer storefront (`web`) and vendor portal (`vendor_web`).

```sh
npm install
npm run dev   # http://localhost:3002
```

Set `API_URL` in `.env.local` if the API is not on `http://localhost:4000/api/v1`.

## Features

- **Analytics** — platform order value, delivered sales, commission, COD collected/remitted/outstanding, settlements and refunds (`/admin/reports`), plus a vendor and rider summary and recent audit activity.
- **Vendors** — list every registered vendor with its owner account, business, location, commission and approval status; register new vendors (creates the owner `VENDOR` account and an approved store); suspend/approve and change commission (`/admin/vendors`).
- **Products** — choose any vendor and browse its live catalog products (`/catalog/products?vendorId=`).
- **Riders** — create rider accounts (`/admin/staff`), review the rider directory and shift log (`/rider/shifts`) and assign available riders to `READY` orders (`/orders/:id/assign`).
- **Orders / Audit Log / Notifications / Settings** — marketplace-wide order monitoring, the administrative audit trail, notifications and account settings.

## Auth model

Sign-in goes through `/api/auth/[action]`, which stores HttpOnly cookies and refuses any account whose role is not `ADMIN`. Commerce calls go through `/api/commerce/[...path]`, restricted to `admin`, `catalog`, `vendor`, `orders`, `rider`, `finance` and `notifications`. Browser JavaScript never sees the backend tokens.

Administrator accounts are provisioned by the platform (seed `ADMIN_EMAIL`/`ADMIN_PASSWORD`); there is no public admin registration.

## Checks

```sh
npm run lint
npm run build
```

## CI/CD and production hosting

Pushes to `main` automatically validate and deploy the admin console to `/var/www/console.barwaqt.com`, using PM2 (`barwaqt-admin`) on port 3002. Follow [Ubuntu, Nginx, HTTPS and GitHub setup](DEPLOYMENT.md) before the first deployment.

Products opens the pending review queue. Open a listing to inspect every image, its full description, specifications, category, price and vendor. Approve after review or reject with a reason shown to the vendor. Listing changes require a new review. Deploy the backend product-moderation migration before this UI.
