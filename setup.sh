#!/bin/bash
# ═══ Corporate Among Us — Lightsail Setup Script ═══
# Run this on a fresh Ubuntu Lightsail instance after SSH-ing in.
# Usage: chmod +x setup.sh && ./setup.sh

set -e

echo "🏢 Corporate Among Us — Server Setup"
echo "======================================"

# 0. Wait for any running unattended-upgrades to finish
echo "⏳ Waiting for any background updates to finish..."
sudo systemctl stop unattended-upgrades 2>/dev/null || true
while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
  echo "   Package manager is locked — waiting 5s..."
  sleep 5
done

# Prevent the "restart daemons?" interactive prompt
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# 1. Update system
echo "📦 Updating system packages..."
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# 2. Install Node.js 20 LTS
echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "   Node.js version: $(node --version)"
echo "   npm version: $(npm --version)"

# 3. Install PM2 (process manager — keeps the game running + auto-restart)
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# 4. Set up the game directory
echo "📁 Setting up game directory..."
APP_DIR="$HOME/corporate-among-us"

if [ -d "$APP_DIR" ]; then
  echo "   Directory already exists. Pulling latest files..."
else
  mkdir -p "$APP_DIR"
fi

# If files are already in the current directory, copy them
if [ -f "./server.js" ]; then
  echo "   Copying game files..."
  cp -r ./server.js ./package.json ./public "$APP_DIR/"
else
  echo "   ⚠️  Game files not found in current directory."
  echo "   Copy your game files to $APP_DIR manually, then run:"
  echo "   cd $APP_DIR && pm2 start ecosystem.config.js"
fi

# 5. Create PM2 ecosystem config
echo "⚙️  Creating PM2 config..."
cat > "$APP_DIR/ecosystem.config.js" << 'PMEOF'
module.exports = {
  apps: [{
    name: 'corporate-among-us',
    script: 'server.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    merge_logs: true,
  }],
};
PMEOF

mkdir -p "$APP_DIR/logs"

# 6. Open port 3000 in the firewall (iptables)
echo "🔓 Configuring firewall..."
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
# Persist iptables rules (pre-answer the interactive prompts)
echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
sudo netfilter-persistent save

# 7. Start the app
if [ -f "$APP_DIR/server.js" ]; then
  echo "🚀 Starting Corporate Among Us..."
  cd "$APP_DIR"
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | bash

  echo ""
  echo "======================================"
  echo "🏢 Corporate Among Us is LIVE!"
  echo "======================================"
  echo ""
  echo "  Your game is running on port 3000."
  echo "  Access it at: http://$(curl -s ifconfig.me):3000"
  echo ""
  echo "  Useful PM2 commands:"
  echo "    pm2 status              — Check if game is running"
  echo "    pm2 logs                — View live logs"
  echo "    pm2 restart all         — Restart the game"
  echo "    pm2 stop all            — Stop the game"
  echo ""
fi
