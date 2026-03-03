#!/usr/bin/env bash

set -e

echo "======================================"
echo "  MIDI Relay Pi Installer (ARM64)"
echo "======================================"

# ------------ CONFIG -------------
REPO_URL="https://github.com/josephdadams/midi-relay.git"
INSTALL_DIR="/opt/midi-relay"
SERVICE_USER="midi"
NODE_MAJOR="20"
# ---------------------------------

echo ""
echo "Updating system..."
sudo apt update
sudo apt upgrade -y

echo ""
echo "Installing required system packages..."
sudo apt install -y \
  curl \
  git \
  build-essential \
  python3 \
  make \
  g++ \
  libasound2-dev

echo ""
echo "Installing Node.js v$NODE_MAJOR (ARM64)..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | sudo -E bash -
sudo apt install -y nodejs

echo ""
echo "Node version:"
node -v
npm -v

echo ""
echo "Installing Yarn globally..."
sudo npm install -g yarn

echo ""
echo "Creating service user if needed..."

if id "$SERVICE_USER" &>/dev/null; then
  echo "User $SERVICE_USER already exists."
else
  sudo useradd -r -m -d $INSTALL_DIR -s /usr/sbin/nologin $SERVICE_USER
  echo "Created system user: $SERVICE_USER"
fi

echo "Adding $SERVICE_USER to required groups..."
sudo usermod -aG audio $SERVICE_USER || true
sudo usermod -aG plugdev $SERVICE_USER || true

echo ""
echo "Creating install directory at $INSTALL_DIR..."
sudo mkdir -p $INSTALL_DIR
sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR

echo ""
echo "Preparing installation directory..."

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Existing repo detected — resetting to origin/main..."
  cd $INSTALL_DIR
  sudo git fetch origin
  sudo git reset --hard origin/main
  sudo git clean -fd
  sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
else
  echo "Fresh install — cloning repository..."
  sudo rm -rf $INSTALL_DIR
  sudo mkdir -p $INSTALL_DIR
  sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
  sudo -u $SERVICE_USER git clone $REPO_URL $INSTALL_DIR
fi

cd $INSTALL_DIR

echo ""
echo "Installing project dependencies..."
sudo -u $SERVICE_USER yarn install --production

echo ""
echo "Creating systemd service..."

sudo tee /etc/systemd/system/midi-relay.service > /dev/null <<EOF
[Unit]
Description=MIDI Relay Service
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "Reloading systemd..."
sudo systemctl daemon-reload

echo "Enabling service..."
sudo systemctl enable midi-relay

echo "Starting service..."
sudo systemctl restart midi-relay

echo ""
echo "======================================"
echo " Installation complete!"
echo ""
echo " Service status:"
echo "   sudo systemctl status midi-relay"
echo ""
echo " Live logs:"
echo "   journalctl -u midi-relay -f"
echo ""
echo " Service user:"
echo "   id $SERVICE_USER"
echo "======================================"