# Deploying Corporate Among Us to AWS Lightsail

## Prerequisites

- An AWS account (free tier works)
- The game files (this folder)

## Step 1: Create a Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com)
2. Click **Create instance**
3. Choose:
   - **Region**: Pick the closest to your players
   - **Platform**: Linux/Unix
   - **Blueprint**: OS Only → **Ubuntu 22.04 LTS**
   - **Plan**: $3.50/mo (512 MB RAM, 1 vCPU) — plenty for this game
4. Name it `corporate-among-us` and click **Create instance**

## Step 2: Open Port 3000

1. In Lightsail, click your instance → **Networking** tab
2. Under **IPv4 Firewall**, click **Add rule**
3. Set: **Custom TCP**, Port **3000**
4. Click **Create**

## Step 3: Upload Game Files

Option A — SCP from your local machine:
```bash
scp -i ~/path-to-lightsail-key.pem -r ./* ubuntu@YOUR_INSTANCE_IP:~/corporate-among-us/
```

Option B — Git clone (if you push to a repo first):
```bash
ssh -i ~/path-to-lightsail-key.pem ubuntu@YOUR_INSTANCE_IP
git clone https://github.com/YOUR_USER/corporate-among-us.git
```

Option C — Use the Lightsail browser terminal:
- Click **Connect using SSH** in the Lightsail console
- Create the directory and paste files manually

## Step 4: Run the Setup Script

SSH into your instance and run:
```bash
cd ~/corporate-among-us
chmod +x setup.sh
./setup.sh
```

This script will:
- Install Node.js 20 LTS
- Install PM2 (process manager)
- Open port 3000 in the OS firewall
- Start the game server
- Configure auto-restart on reboot

## Step 5: Play!

Open your browser and go to:
```
http://YOUR_INSTANCE_IP:3000
```

Share this URL with friends — they join using the 4-letter lobby code!

## Useful Commands

```bash
# Check if game is running
pm2 status

# View live server logs
pm2 logs

# Restart after updating code
pm2 restart all

# Stop the game
pm2 stop all

# Update game files and restart
cd ~/corporate-among-us
git pull   # (if using git)
pm2 restart all
```

## Static IP (Recommended)

By default, your Lightsail instance's IP changes if you stop/start it. To get a permanent IP:

1. Go to Lightsail → **Networking** tab
2. Click **Create static IP**
3. Attach it to your instance

Now your game URL never changes.

## Optional: Add a Custom Domain Later

If you want `game.yourdomain.com` instead of an IP:

1. Get a static IP (above)
2. In your domain's DNS settings, add an A record pointing to the static IP
3. For HTTPS, install Caddy as a reverse proxy:

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile << EOF
game.yourdomain.com {
    reverse_proxy localhost:3000
}
EOF
sudo systemctl restart caddy
```

Caddy automatically provisions and renews HTTPS certificates.

## Cost

- **Lightsail $3.50/mo plan**: 512 MB RAM, 1 vCPU, 20 GB SSD, 1 TB transfer
- **Static IP**: Free while attached to a running instance
- **Total**: ~$3.50/month
