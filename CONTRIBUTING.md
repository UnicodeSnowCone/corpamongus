# Contributing to Corporate Among Us

Thanks for your interest in contributing! This project is intentionally simple — zero dependencies, vanilla JS, no build step — and we'd like to keep it that way.

## Development Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/UnicodeSnowCone/corpamongus.git
   cd corpamongus
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Open `http://localhost:3000` in your browser.

That's it. No `npm install`, no build tools, no bundler.

## Testing Multiplayer Locally

Open multiple browser tabs to `http://localhost:3000`. Create a lobby in one tab and join with the lobby code in the others. You need at least 4 "players" (tabs) to start a game.

## Project Architecture

All game state lives **server-side** in `server.js` to prevent cheating. The client sends inputs and receives state updates 30 times per second via WebSocket.

- **`server.js`** — HTTP file server, raw WebSocket implementation, all game logic (roles, movement, tasks, voting, sabotage)
- **`public/js/`** — Client modules, each handling one concern:
  - `network.js` — WebSocket wrapper
  - `game.js` — Canvas render loop and input handling
  - `map.js` — Office map rendering
  - `player.js` — Bean character drawing
  - `tasks.js` — Task mini-game UI
  - `voting.js` — Meeting and voting UI
  - `hud.js` — In-game HUD elements
  - `lobby.js` — Lobby and character selection
  - `main.js` — Screen management and network event routing

## Guidelines

- **No new dependencies.** The zero-dependency approach is a feature, not a limitation.
- **Keep it vanilla.** Plain HTML, CSS, and JavaScript. No frameworks, no transpilers.
- **Server-authoritative.** Never trust the client. Validate everything server-side.
- **Keep it fun.** The corporate humor is the soul of this game. New tasks, sabotages, and archetypes should be goofy and relatable.

## Ideas for Contributions

Here are some things that would make great PRs:

- **New tasks** — More corporate mini-games (attend a Zoom call, fix the Wi-Fi password, organize the supply closet)
- **New sabotages** — Creative office disruptions (mandatory team-building, surprise audit)
- **Sound effects** — Meeting bell, sabotage alarm, footsteps, task completion sounds
- **Mobile controls** — Touch joystick for phones/tablets
- **Animations** — Smoother kill animation, meeting transitions, task completion effects
- **New archetypes** — More corporate characters (The CFO, The Receptionist, The Freelancer)
- **Game settings UI** — Let the host configure settings in the lobby
- **Spectator mode** — Watch the game after being fired

## Submitting a PR

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/new-task-zoom-call`)
3. Make your changes
4. Test with 4+ browser tabs to verify multiplayer works
5. Push and open a PR with a description of what you changed and why

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Browser and OS
- Number of players in the game
- Console errors (if any)
