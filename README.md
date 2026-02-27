# 🏢 Corporate Among Us

A real-time multiplayer social deduction game inspired by **Among Us**, set in the corporate world. Complete goofy office tasks, find the impostor, and survive the all-hands meeting — all in your browser.

**Zero dependencies.** Runs on raw Node.js built-in modules. No npm install needed.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)
![Players](https://img.shields.io/badge/Players-4--8-orange)

---

## How It Works

Crewmates complete corporate tasks around the office while impostors secretly **fire** their coworkers. When a body is found, an **All-Hands Meeting** is called — discuss, debate, and vote someone out. Was it the Sales Bro? The Intern? Find the impostor before it's too late.

### Win Conditions

- **Crewmates win** by completing all tasks or voting out every impostor
- **Impostors win** by firing enough crewmates to reach a majority

---

## Features

### 🎭 8 Corporate Archetypes
Each character has a unique color, outfit, and Among Us-style bean design:

| Character | Color | Accessory |
|-----------|-------|-----------|
| The Intern | Green | Oversized badge lanyard |
| The Manager | Blue | Power tie + coffee mug |
| The IT Guy | Purple | Headset + hoodie |
| HR Rep | Pink | Clipboard |
| The Accountant | Gray | Calculator + visor |
| Sales Bro | Orange | Popped polo collar |
| The Executive | Red | Suit jacket + briefcase |
| The Designer | Teal | Turtleneck + MacBook |

### 🗺️ 10-Room Office Map
Vibrant, color-coded rooms connected by doors and hallways:

```
┌───────────┬──────────────┬─────────────┐
│   EXEC    │  CONFERENCE  │  ROOFTOP    │
│   SUITE   │  ROOM        │  LOUNGE     │
├─────┬─────┼──────────────┼──────┬──────┤
│BATH │ HR  │              │  IT  │SERVER│
│ROOM │     │    LOBBY     │ DEPT │ ROOM │
├─────┴─────┼──────────────┼──────┴──────┤
│   BREAK   │   CUBICLE    │  SUPPLY     │
│   ROOM    │   FARM       │  CLOSET     │
└───────────┴──────────────┴─────────────┘
```

### ✅ Corporate Tasks (Crewmates)
- 🖨️ Fix the Printer
- 🧾 Submit Expense Report
- ☕ Brew Coffee
- 📅 Book Conference Room
- 📋 File TPS Report
- 📧 Reply-All Email Chain
- 💼 Update LinkedIn (toggle buzzwords like "Synergy Expert" and "AI Whisperer")
- 📄 Shred Documents
- 🖥️ Reboot the Server
- 🌿 Water the Office Plant

### 🔥 Impostor Abilities
- **Fire** — Hand someone a pink slip (kill)
- **Sabotage** — WiFi Down, Lights Out, Coffee Machine Broke, Fire Drill
- **Mail Chutes** — Travel between rooms through the office mail system (vents)

### 📢 All-Hands Meetings
- Report a body or pull the fire alarm to call a meeting
- Real-time text chat during discussion phase
- Timed voting — majority rules, ties skip

---

## Quick Start

```bash
git clone https://github.com/UnicodeSnowCone/corpamongus.git
cd corpamongus
node server.js
```

Open `http://localhost:3000` in your browser. Share the 4-letter lobby code with friends.

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| E | Use / Interact with task |
| Q | Fire (impostor only) |
| R | Report body |
| M | Toggle map |
| T | Toggle task list |

---

## Deployment

### AWS Lightsail (Recommended — $3.50/mo)

See [DEPLOY.md](DEPLOY.md) for a full step-by-step guide. The short version:

1. Create an Ubuntu Lightsail instance
2. Upload files and run `./setup.sh`
3. Share `http://YOUR_IP:3000` with friends

### Docker

```bash
docker build -t corporate-among-us .
docker run -p 3000:3000 corporate-among-us
```

### Other Platforms

The game includes a `Procfile` for Heroku/Railway/Render and a `Dockerfile` for any container platform. It respects the `PORT` environment variable.

---

## Tech Stack

- **Backend**: Node.js (built-in `http` + `crypto` modules — zero dependencies)
- **Frontend**: HTML5 Canvas + vanilla JavaScript
- **Networking**: Raw WebSocket protocol (no Socket.IO needed)
- **Process Manager**: PM2 (installed by setup script for production)

The entire game is ~3,800 lines of code with no build step and no package manager required.

---

## Project Structure

```
├── server.js            # Game server — HTTP, WebSocket, all game logic
├── setup.sh             # One-command Lightsail deployment script
├── Dockerfile           # Container deployment
├── Procfile             # Platform deployment (Heroku/Railway/Render)
├── DEPLOY.md            # Deployment guide
└── public/
    ├── index.html       # Entry point — all screens
    ├── css/style.css    # Styles (lobby, game HUD, meetings)
    └── js/
        ├── main.js      # Screen management, network handlers
        ├── network.js   # WebSocket client wrapper
        ├── lobby.js     # Lobby UI, character selection
        ├── game.js      # Game loop, canvas rendering, input
        ├── map.js       # Office map rendering + minimap
        ├── player.js    # Bean character drawing + archetypes
        ├── tasks.js     # Task mini-games
        ├── voting.js    # All-hands meeting UI + voting
        └── hud.js       # In-game HUD (task bar, buttons)
```

---

## Game Settings

The host can configure these before starting (defaults shown):

| Setting | Default | Description |
|---------|---------|-------------|
| Impostors | 1 | Number of impostors (auto-caps at ⅓ of players) |
| Discussion Time | 30s | Chat time before voting opens |
| Voting Time | 30s | Time to cast votes |
| Kill Cooldown | 25s | Seconds between impostor kills |
| Player Speed | 3 | Movement speed |
| Vision Range | 250 | How far players can see |
| Emergency Meetings | 1 | Per player, per game |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

---

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

This is a fan project and is not affiliated with Innersloth or the official Among Us game.
