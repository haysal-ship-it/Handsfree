# PocketPad Desktop Companion

The PocketPad Companion is a lightweight Node.js daemon that runs on your laptop or desktop. It serves the PocketPad web application to your smartphone over the local network and translates multi-touch trackpad gestures, keyboard input, and presenter commands directly into system-level OS cursor actions.

---

## 1. Prerequisites

- **Node.js**: Version 18.0.0 or newer (LTS recommended).
- **Network**: Your laptop and mobile device must be connected to the same local Wi-Fi network (or phone hotspot).

---

## 2. Installation

Navigate to the companion directory and install dependencies:

```bash
cd companion
npm install
```

> **Note on OS Automation Libraries**:  
> The companion uses `@nut-tree-fork/nut-js` for cross-platform cursor, mouse click, and keyboard control without native C++ compilation steps on supported platforms. If `@nut-tree-fork/nut-js` fails on an uncommon architecture or Node version, `robotjs` can be used as a drop-in fallback.

---

## 3. Serving the Phone App

The companion serves the static web app from the `./public` directory.

To populate `./public`:
1. From the project root, build the client app:
   ```bash
   npm run build
   ```
2. Copy the resulting `dist/` directory into `companion/public`:
   ```bash
   cp -R ../dist companion/public
   ```

---

## 4. Running the Companion

Start the server:

```bash
npm start
```

By default, the server listens on port `4455` (configurable with `PORT=XXXX npm start`).

When launched, the terminal will display:
- **Web App URL**: `http://<YOUR-LAPTOP-IP>:4455/?token=<SESSION-TOKEN>`
- **6-Digit Pairing Code**: Printed for manual input.
- **Terminal QR Code**: Scan with your smartphone camera to connect instantly.

---

## 5. Operating System Permissions

To allow PocketPad to control your mouse and keyboard, your operating system may require accessibility permissions:

### macOS
1. Open **System Settings** > **Privacy & Security** > **Accessibility**.
2. Enable permission for your terminal application (**Terminal**, **iTerm2**, or **VS Code**).
3. If prompt appears upon first gesture: Click **Open System Settings** and grant access.

### Windows
1. When prompted by **Windows Defender Firewall**, allow access on **Private networks**.

### Linux (X11 / Wayland)
- On X11, permissions are granted automatically.
- On Wayland, ensure your compositor permits remote input simulation or run under an XWayland session.

---

## 6. Testing the Connection

To verify that the companion can control the mouse cursor without a phone, run the included test client with the active session token or 6-digit code:

```bash
node scripts/test-client.js <SESSION-TOKEN-OR-6-DIGIT-CODE>
```

The test client will connect, authenticate, move the cursor in a small square path, and perform a left click.

---

## 7. Troubleshooting

- **Phone cannot reach the URL**:
  - Ensure both laptop and phone are connected to the exact same Wi-Fi network.
  - Check whether your Wi-Fi is a "Guest" network that enables client isolation (prevents devices from talking to each other).
  - **Fallback**: Turn on **Personal Hotspot** on your phone, connect your laptop to the phone's hotspot, and rerun `npm start`.
- **Wrong or Expired Code**:
  - Tokens and 6-digit codes regenerate on every companion start. Always use the active token or code printed in the latest terminal output.
- **Firewall Blocking**:
  - Verify that port `4455` (or your custom `PORT`) is open on your laptop's local firewall.

---

## 8. Security Notice

PocketPad incorporates multiple security layers for safe usage on local networks:
- **Unique Ephemeral Tokens**: Every companion launch generates a cryptographically secure 16-byte hex token and a random 6-digit session PIN.
- **Local Network Isolation**: The server strictly rejects connections originating from non-private IP addresses.
- **Trusted Networks**: Only run the companion on trusted private home or office networks or personal hotspots.
