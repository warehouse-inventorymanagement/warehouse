# Warehouse

Self-hosted warehouse inventory management system. Tracks items, locations, categories, tags, and barcodes, with role-based access control, LDAP/SSO login, audit logging, webhooks, and a public API.

## Stack

- **Backend**: Node.js, Express, Prisma (PostgreSQL)
- **Frontend**: React, Vite, Tailwind CSS

This is an npm workspaces monorepo — `backend` and `frontend` are separate workspaces sharing one root `package.json`/lockfile.

## Setup

```bash
npm run install:all          # installs root + backend + frontend deps

cp backend/.env.example backend/.env
# edit backend/.env: set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
# generate secrets with: openssl rand -base64 64 / openssl rand -hex 32

npm run db:push              # create database schema
npm run dev                  # backend on :3000, frontend on :5317

npm run bootstrap            # first-time only: creates default roles + admin user
                              # (must be run on the same host as the backend)
```

Default login after bootstrap: `warehouse` / `warehouse` — change the password immediately.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run backend + frontend in dev mode |
| `npm run build` | Build the frontend for production |
| `npm run db:push` / `db:reset` / `db:studio` | Prisma schema sync / reset / studio |
| `npm run bootstrap` | Create default roles and admin user (local only) |
