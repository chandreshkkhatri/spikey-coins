# Spikey Coins - Bash Scripts

This directory contains deployment and management scripts for the Spikey Coins application using PM2.

## Scripts

### Deployment Scripts

- **`start-backend.sh`** - Deploy the Node.js backend server with PM2
- **`start-frontend.sh`** - Deploy the Next.js frontend with PM2  
- **`stop-all.sh`** - Stop all Spikey Coins PM2 processes

### Usage

```bash
# Deploy only the backend (recommended for production)
./bash-scripts/start-backend.sh

# Deploy only the frontend
./bash-scripts/start-frontend.sh

# Stop all services
./bash-scripts/stop-all.sh

# Or use the main script (from project root)
./start.sh
```

## PM2 Management

### Common PM2 Commands

```bash
# View all processes
pm2 status

# View logs for all processes
pm2 logs

# View logs for specific service
pm2 logs spikey-coins-backend
pm2 logs spikey-coins-frontend

# Restart services
pm2 restart spikey-coins-backend
pm2 restart spikey-coins-frontend
pm2 restart all

# Stop services
pm2 stop spikey-coins-backend
pm2 stop spikey-coins-frontend
pm2 stop all

# Delete processes
pm2 delete spikey-coins-backend
pm2 delete spikey-coins-frontend
pm2 delete all

# Monitor processes (interactive)
pm2 monit
```

### Process Configuration

Both services use PM2 ecosystem files (`ecosystem.config.js`) that are automatically created with:

- **Memory management**: Automatic restart at 1GB memory usage
- **Error handling**: Auto-restart with exponential backoff
- **Logging**: Centralized logs in `logs/` directory
- **Environment**: Development/production environment support

## Service Details

### Backend Service
- **Name**: `spikey-coins-backend`
- **Port**: 8000
- **Script**: `app.ts` (with tsx loader)
- **Logs**: `node-server/logs/`

### Frontend Service  
- **Name**: `spikey-coins-frontend`
- **Port**: 3000
- **Script**: Next.js development server
- **Logs**: `react-ui-nextjs/logs/`

## Prerequisites

- Node.js (v16 or higher)
- npm
- PM2 (installed automatically if missing)

## Directory Structure

```
spikey-coins/
├── bash-scripts/          # Deployment scripts
│   ├── start-backend.sh   # Backend deployment
│   ├── start-frontend.sh  # Frontend deployment
│   └── stop-all.sh        # Stop all services
├── node-server/           # Backend application
└── react-ui-nextjs/       # Frontend application
```