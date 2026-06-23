# Warehouse

Self-hosted warehouse inventory management system. Tracks items, locations, categories, tags, and barcodes, with role-based access control, LDAP/SSO login, audit logging, webhooks, and a public API.

## Stack

- **Backend**: Node.js, Express, Prisma (PostgreSQL)
- **Frontend**: React, Vite, Tailwind CSS

This is an npm workspaces monorepo — `backend` and `frontend` are separate workspaces sharing one root `package.json`/lockfile.

## Setup

### 0. Node.js (build from source)

Requires Node.js 20 (LTS) — `node-cron` 4.x in this project requires Node >=20.

```bash
sudo apt update && sudo apt install -y python3 g++ make git
git clone https://github.com/nodejs/node.git
cd node
git checkout v20.20.2
./configure
make -j$(nproc)   # this takes a while
sudo make install
cd ..
node -v           # should print v20.20.2
```

### 1. Get the code

Download the latest release into `/opt` (not a clone of `main`, which may contain in-progress work):

```bash
cd /opt
sudo curl -LO https://github.com/warehouse-inventorymanagement/warehouse/releases/download/v1.1.1/warehouse-v1.1.1.tar.gz
sudo tar xzf warehouse-v1.1.1.tar.gz
sudo rm warehouse-v1.1.1.tar.gz
cd warehouse   # now /opt/warehouse
```

Or grab the same archive from the [Releases page](https://github.com/warehouse-inventorymanagement/warehouse/releases/latest).

### 2. Database

Requires PostgreSQL. Create a dedicated user and database (run as the `postgres` superuser):

```bash
sudo -u postgres psql -c "CREATE USER warehouse WITH PASSWORD 'choose-a-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE warehouse OWNER warehouse;"
```

Pick your own password here — this becomes part of `DATABASE_URL` below. If `psql` reports an auth error when the app later connects, your `pg_hba.conf` may need local connections set to `md5` instead of `peer`/`trust`.

A `setup-database.sh` script exists at the repo root that automates the above, but it unconditionally **drops** any existing `warehouse` user/database first and hardcodes a weak password — only use it for a disposable dev instance, never against a database you care about.

### 3. App

```bash
npm run install:all          # installs root + backend + frontend deps

cp backend/.env.example backend/.env
# edit backend/.env:
#   DATABASE_URL="postgresql://warehouse:<your-password>@localhost:5432/warehouse?schema=public"
#   JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
# generate secrets with: openssl rand -base64 64 / openssl rand -hex 32

npm run db:push               # sync Prisma schema into the database (creates tables)
npm run dev                   # backend on :3000, frontend on :5317

npm run bootstrap             # first-time only: creates default roles + admin user
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
