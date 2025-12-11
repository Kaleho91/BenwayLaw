# MapleLaw

Canada-first legal practice management SaaS for small and mid-sized law firms.

## Overview

MapleLaw is designed specifically for Canadian law firms, with built-in support for:

- **Ontario (LSO) compliance** - Trust accounting rules, SIBA interest tracking
- **PIPEDA & Law 25** - Privacy-first data handling with audit logs
- **Canadian taxes** - HST, GST, PST calculated correctly by province
- **Employment Law** - Pre-built matter templates and workflows

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL (multi-tenant via firm_id)
- **Infrastructure**: AWS ca-central-1 (Toronto), Docker

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Local Development

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start all services in dev mode
pnpm dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

## Project Structure

```
maplelaw/
├── apps/
│   ├── frontend/          # Next.js web application
│   └── backend/           # NestJS API server
├── packages/
│   └── shared/            # Shared types and utilities
├── infra/
│   ├── docker-compose.yml # Local dev environment
│   └── terraform/         # AWS infrastructure
└── package.json           # Monorepo root
```

## License

Proprietary - All rights reserved
