# 🍘 HR HABIB WhatsApp Bot — QR Edition 2.0

**WhatsApp Web QR authentication (not Baileys pairing codes)** · Node.js 22 · Docker · Render · 21 active WhatsApp commands

This release **replaces Baileys** with `whatsapp-web.js` **v1.34.7** (headless Chromium). It works through WhatsApp Web's *Linked Devices → Scan QR code* flow on a personal WhatsApp or WhatsApp Business account. It is **unofficial**, and linking or continued operation is **not guaranteed** by WhatsApp.

## 🚀 Render: fresh deploy (recommended)

**IMPORTANT:** If your older Render service was created with **Language: Node**, merely adding `Dockerfile` won't switch that existing service to Docker. The easiest method is to **create a new Web Service** and select **Docker**. The previous Baileys service should be stopped after verifying the new service; do not run both on the same account intentionally.

1. Download the ZIP, extract it, upload the **contents of the `HR-HABIB-WHATSAPP` folder** into your GitHub repository **root** (you should see `Dockerfile`, `index.js`, `package.json`, `render.yaml` at the top level).
2. Render Dashboard → **New → Web Service → select GitHub repository**.
3. Settings: **Language: Docker** · Dockerfile path: `./Dockerfile` · Root Directory: blank · **Plan: Starter or better**.
   - With Docker, Render reads `CMD ["node", "index.js"]`; no `nom install` typo, and you **do not enter a Node Build Command**.
4. Render → **Environment**: add the following:

   | Key | Value |
   | --- | --- |
   | `QR_PASSWORD` | A NEW unique password (minimum 12 characters); **keep private** |
   | `DATA_DIR` | `/app/data` |
   | `PREFIX` | `!` |
   | `PORT` | `10000` (optional; Docker default) |

   Do not set a `PHONE_NUMBER` or `PAIRING_CODE_ENABLED`: **neither is used by QR Edition**. The phone number is determined by the WhatsApp account that scans the QR.
5. For reliable session persistence, use a **paid** plan and attach a **Persistent Disk**, mount path **`/app/data`**, size at least **1 GB**. Render Free has no persistent disk, sleeps, and may require scanning again after redeploy/restart. Running Chromium may require more memory than the smallest service offers.
6. Click **Deploy Web Service**. Once logs show `HTTP server started` and `QR code available`, open:

   `https://YOUR-SERVICE.onrender.com/qr`

   Your browser asks for username/password:
   - **Username:** `admin`
   - **Password:** your private `QR_PASSWORD` from Render.

7. **IMPORTANT: display the QR on another screen** (e.g. laptop or a second phone). On your PRIMARY phone open **WhatsApp Business → ⋮ → Linked Devices → Link a Device → Scan QR** and scan the QR on that other screen. Do **not** choose “Link with phone number instead”; this edition uses **QR** only.
8. QR automatically refreshes every 12 seconds; after scanning `/health` should show `"connected":true`. Test with `!ping`, `!help` and `!prefix`.

### Render Blueprints

`render.yaml` is also provided. Create **New → Blueprint** from your repo to create a Docker service with a Starter plan and a 1 GB persistent disk. Provide `QR_PASSWORD` in the Blueprint/environment when prompted. The Blueprint does not automatically change a manually created Node service.

### QR security

- `/qr` is protected by HTTP Basic Authentication; **never share your QR or login password**. Use HTTPS (Render supplies it).
- `/health` is public but shows only status and command count, no QR or credentials.
- Never upload `data/`, `.env`, the session, or browser profile to GitHub. These contain linked-device credentials.
- Use only **one service instance** for a session. Do not scale this service horizontally with the same disk/profile.
- If WhatsApp Web logs out, visit `/qr` to see if a new QR is available. If a corrupted profile prevents login, first stop the service and safely archive/clear only the `/app/data/wwebjs_auth` profile; this intentionally requires a new QR scan.

### Bot commands

`!help`, `!ping`, `!hi`, `!echo`, `!time`, `!uptime`, `!id`, `!owner`, `!prefix`, `!groupinfo`, `!groupname`, `!tagall`, `!kick`, `!promote`, `!demote`, `!welcome`, `!autoreact`, `!react`, `!unsend`, `!picture`, `!clear`. Some commands require group admin or owner permissions; their success depends on current WhatsApp Web feature support. Message reaction/deletion by reply is limited to recent messages cached in the active process.

### Existing original scripts

The original Messenger scripts — **164 commands and 7 events** — remain in `legacy/scripts/` as **disabled reference files**. They use Facebook APIs and have **not** been converted into 164 working WhatsApp commands. Active WhatsApp commands live in `commands/`. The original `author` metadata in archived scripts is preserved.

### Project files

```text
Dockerfile            # Chromium + Node runtime for Render
render.yaml           # New Docker Render blueprint
index.js              # Web server: /health, password-protected /qr
lib/client.js         # whatsapp-web.js QR session and reconnect
lib/web-adapter.js    # Translate whatsapp-web.js events to 21 commands
lib/engine.js         # Command parser + permissions
lib/store.js          # Persistent prefix / group settings
commands/             # 21 active commands
events/               # WhatsApp group welcome/leave
legacy/scripts/       # Original Messenger scripts, disabled
test/                 # Offline tests
```

### Running checks locally

Node.js 22:

```bash
npm install
npm run check
npm test
QR_PASSWORD="REPLACE_WITH_LONG_PRIVATE_PASSWORD" npm start
```

For a local non-Docker installation, ensure Chromium is installed for Puppeteer, or use its downloaded browser. Do not set `CHROME_PATH` unless it points to a working browser. The Docker image already sets `CHROME_PATH=/usr/bin/chromium` and `PUPPETEER_SKIP_DOWNLOAD=true`.

### Limitations and warning

Successful QR login cannot be tested without your device. Automated offline tests validate only the JavaScript code and adapter behaviors; they do **not** prove WhatsApp Web/Chromium runs on your specific Render plan or that WhatsApp will allow the device to link. WhatsApp warns that unofficial clients may put accounts at risk. For production business messaging with contractual platform support use the **official WhatsApp Business Platform Cloud API**, which has a different authentication and messaging model and cannot simply act as an unrestricted personal chat bot.
