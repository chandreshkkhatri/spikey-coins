# Spikey Coins - Bash Scripts

This directory contains deployment and management scripts for the Spikey Coins application using PM2.

## Scripts

### Deployment Scripts

- **`start-backend.sh`** - Deploy the Node.js backend server with PM2
- **`start-frontend.sh`** - Deploy the Next.js frontend with PM2  
- **`stop-all.sh`** - Stop all Spikey Coins PM2 processes
- **`deploy-to-ec2.sh`** - Deploy backend to EC2 instance

### Usage

```bash
# Deploy production backend (port 8000)
./bash-scripts/start-backend.sh

# Deploy dev backend (port 8001, separate process)
./bash-scripts/start-backend.sh --dev

# Deploy with custom port and name
./bash-scripts/start-backend.sh --port 9000 --name my-custom-backend

# Deploy only the frontend
./bash-scripts/start-frontend.sh

# Stop all services
./bash-scripts/stop-all.sh

# Stop only dev backend
./bash-scripts/stop-all.sh --dev

# Stop specific service by name
./bash-scripts/stop-all.sh --name my-custom-backend

# Or use the main script (from project root)
./start.sh
```

### Running Dev and Production Simultaneously

You can run both production and dev servers at the same time:

```bash
# Start production (port 8000, process: spikey-coins-backend)
./bash-scripts/start-backend.sh

# Start dev (port 8001, process: spikey-coins-backend-dev)
./bash-scripts/start-backend.sh --dev

# Check both running
pm2 status

# View logs for each
pm2 logs spikey-coins-backend
pm2 logs spikey-coins-backend-dev
```

### Environment Variables

You can also use environment variables instead of flags:

```bash
# Using environment variables
BACKEND_PORT=9000 BACKEND_NAME=my-server ./bash-scripts/start-backend.sh

# For EC2 deployment
EC2_HOST=your-server.amazonaws.com ./bash-scripts/deploy-to-ec2.sh --dev
```

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_PORT` | Server port | 8000 (prod), 8099 (dev) |
| `BACKEND_NAME` | PM2 process name | spikey-coins-backend |
| `BACKEND_ENV` | Environment (production/development) | production |

## EC2 Deployment

```bash
# Deploy production to EC2
EC2_HOST=your-ec2-ip ./bash-scripts/deploy-to-ec2.sh

# Deploy dev server to EC2
EC2_HOST=your-ec2-ip ./bash-scripts/deploy-to-ec2.sh --dev

# Deploy with custom settings
EC2_HOST=your-ec2-ip ./bash-scripts/deploy-to-ec2.sh --port 9000 --name staging-server
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

### Backend Service (Production)
- **Name**: `spikey-coins-backend`
- **Port**: 8000
- **Script**: `dist/app.js`
- **Logs**: `node-server/logs/`

### Backend Service (Development)
- **Name**: `spikey-coins-backend-dev`
- **Port**: 8099
- **Script**: `dist/app.js`
- **Logs**: `node-server/logs/`

### Frontend Service  
- **Name**: `spikey-coins-frontend`
- **Port**: 3000
- **Script**: Next.js development server
- **Logs**: `ui/logs/`

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
│   ├── stop-all.sh        # Stop all services
│   └── deploy-to-ec2.sh   # EC2 deployment
├── node-server/           # Backend application
└── ui/                    # Frontend application
```