#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a production-ready WireGuard server on Ubuntu/Debian.
# Usage example:
#   sudo bash ops/setup-wireguard-server.sh --public-nic eth0 --port 51820 --interface wg0 --server-cidr 10.10.0.1/16

INTERFACE="wg0"
WG_PORT="51820"
SERVER_CIDR="10.10.0.1/16"
PUBLIC_NIC=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --interface)
      INTERFACE="$2"
      shift 2
      ;;
    --port)
      WG_PORT="$2"
      shift 2
      ;;
    --server-cidr)
      SERVER_CIDR="$2"
      shift 2
      ;;
    --public-nic)
      PUBLIC_NIC="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (or via sudo)."
  exit 1
fi

if [[ -z "$PUBLIC_NIC" ]]; then
  PUBLIC_NIC=$(ip route get 1.1.1.1 | awk '/dev/ {print $5; exit}')
fi

if [[ -z "$PUBLIC_NIC" ]]; then
  echo "Could not detect public NIC. Pass --public-nic explicitly."
  exit 1
fi

echo "[1/7] Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y wireguard iptables-persistent

echo "[2/7] Generating server keypair"
umask 077
mkdir -p /etc/wireguard
if [[ ! -f "/etc/wireguard/${INTERFACE}.key" ]]; then
  wg genkey | tee "/etc/wireguard/${INTERFACE}.key" | wg pubkey > "/etc/wireguard/${INTERFACE}.pub"
fi
SERVER_PRIVATE_KEY=$(cat "/etc/wireguard/${INTERFACE}.key")
SERVER_PUBLIC_KEY=$(cat "/etc/wireguard/${INTERFACE}.pub")

echo "[3/7] Enabling IP forwarding"
cat >/etc/sysctl.d/99-wireguard-forwarding.conf <<SYSCTL
net.ipv4.ip_forward=1
SYSCTL
sysctl --system >/dev/null

echo "[4/7] Writing /etc/wireguard/${INTERFACE}.conf"
cat >"/etc/wireguard/${INTERFACE}.conf" <<WGCONF
[Interface]
Address = ${SERVER_CIDR}
ListenPort = ${WG_PORT}
PrivateKey = ${SERVER_PRIVATE_KEY}
SaveConfig = true
PostUp = iptables -A FORWARD -i ${INTERFACE} -j ACCEPT; iptables -A FORWARD -o ${INTERFACE} -j ACCEPT; iptables -t nat -A POSTROUTING -o ${PUBLIC_NIC} -j MASQUERADE
PostDown = iptables -D FORWARD -i ${INTERFACE} -j ACCEPT; iptables -D FORWARD -o ${INTERFACE} -j ACCEPT; iptables -t nat -D POSTROUTING -o ${PUBLIC_NIC} -j MASQUERADE
WGCONF
chmod 600 "/etc/wireguard/${INTERFACE}.conf"

echo "[5/7] Opening UDP ${WG_PORT}"
if command -v ufw >/dev/null 2>&1; then
  ufw allow "${WG_PORT}/udp" || true
fi

echo "[6/7] Starting WireGuard interface"
systemctl enable "wg-quick@${INTERFACE}" --now

echo "[7/7] Done"
PUBLIC_IPV4=$(curl -4 -s https://ifconfig.me || true)

echo
printf 'WireGuard interface: %s\n' "$INTERFACE"
printf 'Server public key: %s\n' "$SERVER_PUBLIC_KEY"
printf 'Suggested endpoint: %s:%s\n' "${PUBLIC_IPV4:-<your-public-ip-or-domain>}" "$WG_PORT"
printf 'Provision command on PNM: wg-quick save %s\n' "$INTERFACE"
