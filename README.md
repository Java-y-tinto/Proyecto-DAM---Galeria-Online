# Online Art Gallery E-Commerce Platform

This is my full-stack e-commerce project for an online art gallery — think secure browsing, buying prints/digital art, user accounts, and admin management all in one. Built as a DAM (Desarrollo de Aplicaciones Multiplataforma) final project, but with real-world quality in mind: decoupled frontend, GraphQL for clean data, Odoo handling the heavy ERP lifting, and Stripe for payments.

The big idea was **never** let the Angular frontend talk directly to Odoo. Everything goes through a lightweight GraphQL middleware (BFF pattern). This keeps things secure, avoids exposing the ERP, prevents over/under-fetching, and makes the frontend dev experience way nicer with strong typing.

**Live demo** (if deployed. It's probably down since the client hasn't contacted me to add all the products and start selling artworks): Check out [paquirobles.com](https://paquirobles.com) for the production version.

## Architecture Overview

- **Frontend** — Angular 19 SPA (reactive, RxJS everywhere). No direct backend calls — only GraphQL queries/mutations.
- **BFF Middleware** — Node.js + Apollo Server + TypeScript. Exposes a clean GraphQL API and talks to Odoo using JSON-RPC (via [@fernandoslim/odoo-jsonrpc](https://github.com/fernandoslim/odoo-jsonrpc)).
- **Backend** — Odoo 18 as the single source of truth for products, orders, users, etc. Payments routed to Stripe (never stored in Odoo). Registered users get **portal access** in Odoo, so they can log into the Odoo portal (/my) to see their own invoices, orders, etc. — basically the "My Account" section, but it's Odoo's built-in portal with restricted permissions.
- **Deployment** — Everything containerized with Docker Compose. Includes NGINX for frontend serving + SSL setup via Certbot/Let's Encrypt (great for production VPS, optional for local).

This separation makes scaling easier, improves security (frontend can't touch DB/ERP directly), and lets me reuse Odoo's powerful modules without the usual frontend pain.

## Tech Stack

### Frontend

- Angular 19
- TypeScript
- SCSS
- RxJS (observables for everything async)
- Testing: Vitest + Jest

### Middleware (BFF)

- Node.js
- TypeScript (strict mode)
- Apollo Server (GraphQL)
- JSON-RPC client for Odoo

### Backend

- Odoo 18 (ERP + database)
- Stripe (payments)

### DevOps

- Docker + Docker Compose
- GitHub Actions (CI: build & test on push/PR)
- NGINX (frontend proxy + SSL termination)
- Let's Encrypt (Certbot script for production certs)

## Features

- Browse/search art products
- User registration/login (synced with Odoo portal)
- Shopping cart + checkout with Stripe
- Order history via Odoo portal (/my)
- Admin side fully in Odoo (products, users, etc.)
- Responsive design (mobile-friendly, with some mobile-specific code in `/movil`)

## Getting Started

### Prerequisites

- Docker + Docker Compose (recommended for full stack)
- Node.js 20+ (or Bun) if developing frontend/middleware locally
- Git

### Quick Run (Local Development / Testing)

1. Clone the repo:

```bash
git clone https://github.com/Java-y-tinto/Proyecto-DAM---Galeria-Online.git
cd Proyecto-DAM---Galeria-Online
```

2. **Recommended: Use Docker Compose**

   There's a `docker-compose.yml` at root that spins up:

   - Odoo backend
   - PostgreSQL (for Odoo)
   - Middleware (GraphQL server)
   - Frontend (NGINX serving Angular)

```bash
docker compose up -d
```

   > **Important notes about `docker-compose.yml`:**
   > - It's configured for a production-like setup (includes Certbot/Let's Encrypt for SSL and has my VPS' routes).
   > - For local dev, comment out/remove the certbot service and any domain/SSL volumes/ports.
   > - You'll likely need to edit env vars (e.g., Odoo DB password, domain for certbot, Stripe keys) and add secrets (or just use env vars if you are in a dev environment).
   > - First run: Odoo setup wizard at `http://localhost:8069` (create DB, install modules).
   > - Middleware connects to Odoo — check `.env` or middleware config for credentials.

3. Access the app:

   | Service | URL |
   |---|---|
   | Frontend | `http://localhost:80` (or `4200` if running Angular dev server separately) |
   | GraphQL playground | `http://localhost:4000/graphql` |
   | Odoo backend/admin | `http://localhost:8069` |
   | Odoo portal (user "My Account") | `http://localhost:8069/my` (after registering/login in frontend) |

   > **REMEMBER:** These are the default ports for each service. They **will** change if you modify the ports specified in the Docker Compose file.

### Local Dev without Full Docker (Frontend + Middleware Only)

**Frontend:**

```bash
cd frontend
npm install
ng serve
```

**Middleware:**

```bash
cd middleware
npm install
npm run start:dev   # or bun dev if using Bun
```

You'll need a running Odoo instance (local or Docker) for the middleware to connect.

## Additional Notes

- **SSL/Certbot:** The `init-letsencrypt.sh` script and certbot service are for real domains/VPS. Skip or comment them out locally unless you want HTTPS with self-signed certs.
- **Odoo Portal:** Users get the standard Odoo portal group → limited to their own data (orders, invoices, etc.). No full ERP access.
- **Payments:** Stripe test keys recommended for dev. Real keys only in production.
- **Customization:** This is tuned for my art gallery use-case — feel free to fork and adapt.

## Why This Project? (For Recruiters)

I wanted to demonstrate:

- Modern frontend with clean API consumption (GraphQL + codegen if used)
- Secure architecture (BFF to protect legacy/ERP backend)
- Real integration with a complex system (Odoo)
- Containerized, CI-ready deployment
- Type safety and maintainability focus

Happy to discuss trade-offs, challenges (Odoo JSON-RPC quirks, Apollo auth, etc.), or show live demo/code walkthrough.

Contributions welcome — issues/PRs appreciated!
