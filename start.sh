#!/bin/bash

# ============================================================
#  AI Drug Interaction Checker - Start Script
#  Clinical Decision Support System
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       AI Drug Interaction Checker                       ║"
echo "║       Clinical Decision Support System                  ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Patient Safety = Liability Reduction                   ║"
echo "║  Hospitals pay to avoid lawsuits                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
DB_NAME=${DB_NAME:-drug_interaction_checker}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# ---- Step 1: Clean up used ports ----
echo -e "${YELLOW}[1/6] Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"

kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  ${RED}Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "  ${GREEN}Port $port is free${NC}"
  fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# ---- Step 2: Check PostgreSQL ----
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
  echo -e "  ${RED}PostgreSQL not found. Please install PostgreSQL.${NC}"
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
  echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo -e "  ${RED}Could not start PostgreSQL. Please start it manually.${NC}"
    exit 1
  }
  sleep 2
fi
echo -e "  ${GREEN}PostgreSQL is running${NC}"

# ---- Step 3: Create database ----
echo -e "${YELLOW}[3/6] Setting up database...${NC}"

# Create database if not exists
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1 || {
  echo -e "  ${CYAN}Creating database: $DB_NAME${NC}"
  createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || true
}
echo -e "  ${GREEN}Database ready: $DB_NAME${NC}"

# ---- Step 4: Install dependencies ----
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"

cd backend
if [ ! -d node_modules ]; then
  echo -e "  ${CYAN}Installing backend dependencies...${NC}"
  npm install --silent
else
  echo -e "  ${GREEN}Backend dependencies already installed${NC}"
fi
cd ..

cd frontend
if [ ! -d node_modules ]; then
  echo -e "  ${CYAN}Installing frontend dependencies...${NC}"
  npm install --silent
else
  echo -e "  ${GREEN}Frontend dependencies already installed${NC}"
fi
cd ..

# ---- Step 5: Seed database ----
echo -e "${YELLOW}[5/6] Seeding database with sample data...${NC}"
cd backend
node src/seeds/seed.js
cd ..
echo -e "  ${GREEN}Database seeded successfully${NC}"

# ---- Step 6: Start application with hot reload ----
echo -e "${YELLOW}[6/6] Starting application with hot reload...${NC}"

# Start backend with nodemon (hot reload)
echo -e "  ${CYAN}Starting backend on port $BACKEND_PORT (with hot reload)...${NC}"
cd backend
npx nodemon src/server.js &
BACKEND_PID=$!
cd ..

# Start frontend (React hot reload built-in)
echo -e "  ${CYAN}Starting frontend on port $FRONTEND_PORT (with hot reload)...${NC}"
cd frontend
PORT=$FRONTEND_PORT BROWSER=none npm start &
FRONTEND_PID=$!
cd ..

sleep 3

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  Application Started Successfully!                      ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Frontend: http://localhost:${FRONTEND_PORT}                        ║${NC}"
echo -e "${GREEN}${BOLD}║  Backend:  http://localhost:${BACKEND_PORT}/api/health              ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Demo Login:                                             ║${NC}"
echo -e "${GREEN}${BOLD}║    Email:    sarah@hospital.com                          ║${NC}"
echo -e "${GREEN}${BOLD}║    Password: password123                                 ║${NC}"
echo -e "${GREEN}${BOLD}║                                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Press Ctrl+C to stop all services                       ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Trap cleanup
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
