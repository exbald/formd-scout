#!/bin/bash
set -e

echo "============================================"
echo "  FormD Scout - Development Setup"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is required but not installed."
    echo "Install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "ERROR: Node.js 20+ required. Current version: $(node -v)"
    exit 1
fi

echo "[1/5] Checking Docker and PostgreSQL..."
PG_BIN="./node_modules/@embedded-postgres/linux-x64/native/bin"
PG_DATA="./pg-data"

# Try Docker first, then embedded PostgreSQL
if command -v docker &> /dev/null; then
    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
        echo "  Starting PostgreSQL via Docker Compose..."
        docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || echo "  WARNING: Could not start Docker."
        echo "  Waiting for PostgreSQL to be ready..."
        sleep 3
    else
        echo "  PostgreSQL container already running."
    fi
elif [ -f "$PG_BIN/pg_ctl" ]; then
    echo "  Using embedded PostgreSQL..."
    if "$PG_BIN/pg_ctl" -D "$PG_DATA" status &>/dev/null; then
        echo "  PostgreSQL already running."
    else
        if [ ! -d "$PG_DATA/base" ]; then
            echo "  Initializing database cluster..."
            rm -rf "$PG_DATA" /tmp/.s.PGSQL.5432* 2>/dev/null
            "$PG_BIN/initdb" -D "$PG_DATA" -U dev_user --auth=trust --no-locale --encoding=UTF8
        fi
        rm -f "$PG_DATA/postmaster.pid" /tmp/.s.PGSQL.5432* 2>/dev/null
        echo "  Starting PostgreSQL on port 5432..."
        "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/logfile" -o "-p 5432" start
        sleep 2
        npx tsx scripts/setup-db.ts 2>/dev/null || echo "  WARNING: DB setup script failed."
    fi
else
    echo "  No Docker or embedded PostgreSQL found. Ensure PostgreSQL is running on port 5432."
fi

echo ""
echo "[2/5] Installing dependencies..."
npm install --prefer-offline --no-audit 2>/dev/null || npm install

echo ""
echo "[3/5] Installing additional packages..."
npm install fast-xml-parser date-fns recharts 2>/dev/null || true

echo ""
echo "[4/5] Applying database schema..."
npx drizzle-kit push 2>/dev/null || echo "  WARNING: Schema push failed. Check database connection."

echo ""
echo "[5/5] Starting development server..."
echo ""
echo "============================================"
echo "  FormD Scout is starting!"
echo "  App:     http://localhost:3000"
echo "  DB:      postgresql://dev_user:dev_password@localhost:5432/postgres_dev"
echo "============================================"
echo ""

# Start the Next.js dev server
exec npm run dev
