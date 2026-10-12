# PocketPad

**PocketPad** turns your smartphone into a high-precision, low-latency laptop trackpad. It sends pointer moves, clicks, scrolls, keyboard inputs, shortcuts, and presenter commands over a local WebSocket connection to a lightweight desktop companion daemon running on your computer.

Built with React, TypeScript, Tailwind CSS, and Apple Human Interface Guidelines (HIG) principles.

---

## Features

- **Multi-Touch Trackpad**:
  - One-finger cursor movement with sub-pixel precision and velocity-based acceleration curves.
  - One-finger tap-to-click (left click).
  - Two-finger tap (right click).
  - Two-finger drag for smooth natural scrolling.
  - Tap-and-drag for fluid click-and-drag gestures.
  - Optional long-press right click.
  - Soft accent touch glow and ripple visual feedback.
  - 150ms soft accent border glow on every click.
- **Physical Click Buttons**:
  - Dedicated Left and Right click buttons supporting hold-to-drag.
  - Left-handed mode toggle (inverts button placement).
  - Option to hide click buttons to maximize trackpad area.
- **Quick Actions Sheet**:
  - 4-column tactile shortcuts: Back, Forward, Copy, Paste, Mission Control / Task View, Volume Down, Volume Up, Mute, Play/Pause, and Presenter Mode.
- **Presenter Mode**:
  - Full-screen dark interface with persistent `mm:ss` stopwatch timer (survives screen transitions).
  - Massive Next and Previous slide buttons.
  - Optional Cursor Trackpad Strip (~40% height) for pointer movement during slide navigation.
- **Virtual Keyboard**:
  - Hidden input summoner for full native mobile keyboard input.
  - 44px glass special-keys row (`Esc`, `Tab`, sticky `Ctrl`, `Alt`, `Shift`, `Cmd`/`Win`, and arrow keys).
- **Session Security**:
  - Random 16-byte cryptographic session token + 6-digit numeric PIN.
  - Local private network filtering (`127.x`, `10.x`, `172.16-31.x`, `192.168.x`).
  - Single active client enforcement.

---

## Trying Demo Mode in AI Studio Preview

You can try the entire trackpad experience immediately inside the AI Studio web preview without installing the desktop companion:

1. Open PocketPad in the AI Studio preview.
2. On the Pairing screen, click **"Try demo mode"**.
3. PocketPad connects to an internal, in-memory `MockTransport` within 600ms.
4. Interact with the trackpad:
   - Drag to move cursor (visualized in the top-left debug overlay with live messages-per-second counter).
   - Tap for left click.
   - Two-finger tap for right click.
   - Two-finger scroll.
   - Use the Quick Actions sheet and Presenter mode.

---

## Production Setup with Desktop Companion

To use PocketPad with your real laptop cursor:

### Step 1: Build the Web App
From the project root:
```bash
npm run build
```
This generates the optimized client bundle in the `./dist` directory.

### Step 2: Copy to Companion Static Directory
Copy the built static files into the companion's `public/` directory:
```bash
mkdir -p companion/public
cp -R dist/* companion/public/
```

### Step 3: Start the Desktop Companion
Navigate to the companion directory and run:
```bash
cd companion
npm install
npm start
```

### Step 4: Connect Your Phone
1. The terminal will print:
   - Your local network URL (e.g., `http://192.168.1.100:4455/?token=...`)
   - A 6-digit session PIN
   - An ASCII QR code
2. Scan the QR code with your phone camera, or open the link in Safari / Chrome.
3. Your phone will connect instantly and begin controlling your laptop's cursor!

---

## Operating System Permissions

- **macOS**: Enable Accessibility permissions for your Terminal app in **System Settings > Privacy & Security > Accessibility**.
- **Windows**: Allow Node.js on **Private networks** when Windows Defender Firewall prompts.
- **Wi-Fi**: Ensure your phone and laptop are connected to the same Wi-Fi network (or use your phone's personal hotspot).

---

## Design System & Developer Tools

To inspect the Apple HIG design tokens and components:
- Append `?dev=1&gallery` to the URL.
