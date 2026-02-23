#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Starting BOGCAT setup..."

if ! command -v node >/dev/null 2>&1; then
	echo "Node.js is not installed. Please install Node.js 20+ and retry."
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "npm is not installed. Please install npm and retry."
	exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
	echo "Node.js 20+ is required. Current version: $(node -v)"
	exit 1
fi

if [ -f package-lock.json ]; then
	echo "Installing dependencies with npm ci..."
	npm ci
else
	echo "Installing dependencies with npm install..."
	npm install
fi

if [ ! -f .env ]; then
	echo "Creating .env from defaults..."

	DEV_PASSWORD="bogcat-dev-password"
	HASHED_PASSWORD="$(node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" "$DEV_PASSWORD")"
	JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

	cat > .env <<EOF
DATABASE_URL="file:${ROOT_DIR}/packages/db/dev.db"
HASHED_PASSWORD="${HASHED_PASSWORD}"
JWT_SECRET="${JWT_SECRET}"
WEB_URL="http://localhost:3000"
PORT=4000
EOF

	echo ".env created"
	echo "Default shared password for local login: ${DEV_PASSWORD}"
fi

if grep -q '/absolute/path/to/bogcat/packages/db/dev.db' .env; then
	echo "🔧 Updating DATABASE_URL in .env to this machine's workspace path..."
	sed -i "s|file:/absolute/path/to/bogcat/packages/db/dev.db|file:${ROOT_DIR}/packages/db/dev.db|g" .env
fi

if grep -q '^HASHED_PASSWORD=""' .env; then
	echo "HASHED_PASSWORD is empty in .env. Generating a development password hash..."
	DEV_PASSWORD="bogcat-dev-password"
	HASHED_PASSWORD="$(node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" "$DEV_PASSWORD")"
	sed -i "s|^HASHED_PASSWORD=\"\"|HASHED_PASSWORD=\"${HASHED_PASSWORD}\"|" .env
	echo "Default shared password for local login: ${DEV_PASSWORD}"
fi

echo "Generating Prisma client..."
npm run db:generate

echo "Applying Prisma migrations..."
npx prisma migrate deploy --schema ./packages/db/prisma/schema.prisma

echo "Seeding database..."
npm run db:seed

echo "Setup complete. Starting development servers..."
npm run dev