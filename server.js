// Corporate Among Us — Zero-dependency game server
// Uses raw Node.js http + crypto for WebSocket protocol

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;

// ─── MIME types for static file serving ───
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ─── Game State ───
const lobbies = new Map(); // code -> lobby
const clients = new Map(); // ws -> { id, lobbyCode, playerName }

const ARCHETYPES = [
  { id: 'intern',      name: 'The Intern',      color: '#4CAF50', accent: '#388E3C', item: 'lanyard' },
  { id: 'manager',     name: 'The Manager',     color: '#2196F3', accent: '#1565C0', item: 'tie' },
  { id: 'itguy',       name: 'The IT Guy',      color: '#9C27B0', accent: '#6A1B9A', item: 'headset' },
  { id: 'hr',          name: 'HR Rep',          color: '#E91E63', accent: '#AD1457', item: 'clipboard' },
  { id: 'accountant',  name: 'The Accountant',  color: '#78909C', accent: '#546E7A', item: 'calculator' },
  { id: 'sales',       name: 'Sales Bro',       color: '#FF9800', accent: '#E65100', item: 'polo' },
  { id: 'executive',   name: 'The Executive',   color: '#F44336', accent: '#C62828', item: 'briefcase' },
  { id: 'designer',    name: 'The Designer',    color: '#009688', accent: '#00695C', item: 'macbook' },
];

// ─── Map definition ───
const MAP_W = 2400;
const MAP_H = 1800;

const ROOMS = [
  { id: 'exec_suite',    name: 'Exec Suite',     x: 0,    y: 0,    w: 800,  h: 600,  color: '#FFE0B2', borderColor: '#FF9800', tasks: ['water_plant'] },
  { id: 'conf_room',     name: 'Conference Room', x: 800,  y: 0,    w: 800,  h: 600,  color: '#BBDEFB', borderColor: '#2196F3', tasks: ['book_room'] },
  { id: 'rooftop',       name: 'Rooftop Lounge', x: 1600, y: 0,    w: 800,  h: 600,  color: '#C8E6C9', borderColor: '#4CAF50', tasks: [] },
  { id: 'bathroom',      name: 'Bathroom',       x: 0,    y: 600,  w: 400,  h: 600,  color: '#E1BEE7', borderColor: '#9C27B0', tasks: [] },
  { id: 'hr_office',     name: 'HR Office',      x: 400,  y: 600,  w: 400,  h: 600,  color: '#F8BBD0', borderColor: '#E91E63', tasks: ['tps_report'] },
  { id: 'lobby',         name: 'Lobby',          x: 800,  y: 600,  w: 800,  h: 600,  color: '#FFF9C4', borderColor: '#FFC107', tasks: ['reply_all'], hasEmergencyButton: true },
  { id: 'it_dept',       name: 'IT Department',  x: 1600, y: 600,  w: 400,  h: 600,  color: '#D1C4E9', borderColor: '#673AB7', tasks: ['fix_printer'] },
  { id: 'server_room',   name: 'Server Room',    x: 2000, y: 600,  w: 400,  h: 600,  color: '#B0BEC5', borderColor: '#607D8B', tasks: ['reboot_server'] },
  { id: 'break_room',    name: 'Break Room',     x: 0,    y: 1200, w: 800,  h: 600,  color: '#FFCCBC', borderColor: '#FF5722', tasks: ['brew_coffee'] },
  { id: 'cubicle_farm',  name: 'Cubicle Farm',   x: 800,  y: 1200, w: 800,  h: 600,  color: '#DCEDC8', borderColor: '#8BC34A', tasks: ['expense_report', 'update_linkedin'] },
  { id: 'supply_closet', name: 'Supply Closet',  x: 1600, y: 1200, w: 800,  h: 600,  color: '#D7CCC8', borderColor: '#795548', tasks: ['shred_docs'] },
];

// Doors connecting rooms (pairs of positions)
const DOORS = [
  { room1: 'exec_suite',   room2: 'conf_room',    x: 800,  y: 250,  w: 20, h: 100 },
  { room1: 'conf_room',    room2: 'rooftop',      x: 1600, y: 250,  w: 20, h: 100 },
  { room1: 'exec_suite',   room2: 'bathroom',     x: 200,  y: 600,  w: 100, h: 20 },
  { room1: 'exec_suite',   room2: 'hr_office',    x: 600,  y: 600,  w: 100, h: 20 },
  { room1: 'conf_room',    room2: 'lobby',        x: 1100, y: 600,  w: 100, h: 20 },
  { room1: 'rooftop',      room2: 'it_dept',      x: 1800, y: 600,  w: 100, h: 20 },
  { room1: 'rooftop',      room2: 'server_room',  x: 2100, y: 600,  w: 100, h: 20 },
  { room1: 'bathroom',     room2: 'hr_office',    x: 400,  y: 850,  w: 20,  h: 100 },
  { room1: 'hr_office',    room2: 'lobby',        x: 800,  y: 850,  w: 20,  h: 100 },
  { room1: 'lobby',        room2: 'it_dept',      x: 1600, y: 850,  w: 20,  h: 100 },
  { room1: 'it_dept',      room2: 'server_room',  x: 2000, y: 850,  w: 20,  h: 100 },
  { room1: 'bathroom',     room2: 'break_room',   x: 200,  y: 1200, w: 100, h: 20 },
  { room1: 'hr_office',    room2: 'break_room',   x: 600,  y: 1200, w: 100, h: 20 },
  { room1: 'lobby',        room2: 'cubicle_farm', x: 1100, y: 1200, w: 100, h: 20 },
  { room1: 'it_dept',      room2: 'supply_closet',x: 1800, y: 1200, w: 100, h: 20 },
  { room1: 'server_room',  room2: 'supply_closet',x: 2100, y: 1200, w: 100, h: 20 },
  { room1: 'break_room',   room2: 'cubicle_farm', x: 800,  y: 1450, w: 20,  h: 100 },
  { room1: 'cubicle_farm', room2: 'supply_closet',x: 1600, y: 1450, w: 20,  h: 100 },
];

// Mail chute (vent) connections for impostors
const VENTS = [
  { id: 'v1', room: 'exec_suite',   x: 200, y: 200, connects: 'v2' },
  { id: 'v2', room: 'supply_closet',x: 2000,y: 1400,connects: 'v1' },
  { id: 'v3', room: 'break_room',   x: 200, y: 1400,connects: 'v4' },
  { id: 'v4', room: 'server_room',  x: 2200,y: 800, connects: 'v3' },
  { id: 'v5', room: 'bathroom',     x: 150, y: 850, connects: 'v6' },
  { id: 'v6', room: 'rooftop',      x: 1900,y: 200, connects: 'v5' },
];

// Task definitions
const TASKS = {
  fix_printer:     { name: 'Fix the Printer',       room: 'it_dept',       x: 1700, y: 700, type: 'click_sequence' },
  expense_report:  { name: 'Submit Expense Report',  room: 'cubicle_farm',  x: 1000, y: 1350, type: 'drag_drop' },
  brew_coffee:     { name: 'Brew Coffee',            room: 'break_room',    x: 300,  y: 1350, type: 'click_sequence' },
  book_room:       { name: 'Book Conference Room',   room: 'conf_room',     x: 1100, y: 150,  type: 'select' },
  tps_report:      { name: 'File TPS Report',        room: 'hr_office',     x: 550,  y: 750,  type: 'fill_form' },
  reply_all:       { name: 'Reply-All Email Chain',   room: 'lobby',         x: 1100, y: 750,  type: 'select' },
  update_linkedin: { name: 'Update LinkedIn',        room: 'cubicle_farm',  x: 1300, y: 1500, type: 'toggle' },
  shred_docs:      { name: 'Shred Documents',        room: 'supply_closet', x: 1900, y: 1350, type: 'click_sequence' },
  reboot_server:   { name: 'Reboot the Server',      room: 'server_room',   x: 2200, y: 750,  type: 'click_sequence' },
  water_plant:     { name: 'Water the Office Plant',  room: 'exec_suite',    x: 400,  y: 200,  type: 'click_sequence' },
};

// Walls (room boundaries minus doors)
function buildWalls() {
  const walls = [];
  const WALL_T = 12;
  for (const room of ROOMS) {
    // top wall
    walls.push({ x: room.x, y: room.y, w: room.w, h: WALL_T, room: room.id, side: 'top' });
    // bottom wall
    walls.push({ x: room.x, y: room.y + room.h - WALL_T, w: room.w, h: WALL_T, room: room.id, side: 'bottom' });
    // left wall
    walls.push({ x: room.x, y: room.y, w: WALL_T, h: room.h, room: room.id, side: 'left' });
    // right wall
    walls.push({ x: room.x + room.w - WALL_T, y: room.y, w: WALL_T, h: room.h, room: room.id, side: 'right' });
  }
  return walls;
}

const WALLS = buildWalls();

// ─── Utility functions ───
function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return lobbies.has(code) ? generateLobbyCode() : code;
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function createLobby(hostId) {
  const code = generateLobbyCode();
  const lobby = {
    code,
    hostId,
    players: new Map(),
    state: 'lobby', // lobby | playing | meeting | gameover
    settings: { numImpostors: 1, discussionTime: 30, votingTime: 30, killCooldown: 25, speed: 3, vision: 250, emergencyMeetings: 1 },
    taskProgress: 0,
    totalTasks: 0,
    sabotage: null,
    sabotageTimer: null,
    meetingCaller: null,
    meetingType: null, // 'emergency' | 'report'
    reportedBody: null,
    votes: new Map(),
    chatMessages: [],
    meetingTimer: null,
    meetingPhase: null, // 'discussion' | 'voting'
    bodies: [],
  };
  lobbies.set(code, lobby);
  return lobby;
}

function getAvailableArchetypes(lobby) {
  const taken = new Set();
  lobby.players.forEach(p => { if (p.archetype) taken.add(p.archetype); });
  return ARCHETYPES.filter(a => !taken.has(a.id));
}

function assignRoles(lobby) {
  const playerIds = [...lobby.players.keys()];
  const numImpostors = Math.min(lobby.settings.numImpostors, Math.floor(playerIds.length / 3) || 1);
  // Shuffle
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }
  const impostorIds = new Set(playerIds.slice(0, numImpostors));
  lobby.players.forEach((p, id) => {
    p.role = impostorIds.has(id) ? 'impostor' : 'crewmate';
    p.alive = true;
    p.x = 1100 + (Math.random() - 0.5) * 200;
    p.y = 850 + (Math.random() - 0.5) * 200;
    p.tasks = [];
    p.completedTasks = [];
    p.killCooldown = lobby.settings.killCooldown;
    p.emergencyMeetings = lobby.settings.emergencyMeetings;
    p.inVent = false;
  });

  // Assign tasks to crewmates
  const taskIds = Object.keys(TASKS);
  let totalTasks = 0;
  lobby.players.forEach((p) => {
    if (p.role === 'crewmate') {
      // Shuffle and pick 5 tasks
      const shuffled = [...taskIds].sort(() => Math.random() - 0.5);
      p.tasks = shuffled.slice(0, Math.min(5, taskIds.length));
      totalTasks += p.tasks.length;
    }
  });
  lobby.totalTasks = totalTasks;
  lobby.taskProgress = 0;
  lobby.bodies = [];
  lobby.sabotage = null;
}

function getPlayerRoom(px, py) {
  for (const room of ROOMS) {
    if (px >= room.x && px < room.x + room.w && py >= room.y && py < room.y + room.h) {
      return room;
    }
  }
  return null;
}

function canSeeThroughDoor(x1, y1, x2, y2) {
  // Simple check: if two players are in adjacent rooms connected by a door, they can see each other
  return true; // Simplified — vision radius handles visibility
}

function checkCollision(px, py, radius) {
  const WALL_T = 12;
  for (const room of ROOMS) {
    // Check if player is near room boundary
    // Top wall
    if (py - radius < room.y + WALL_T && py + radius > room.y &&
        px > room.x && px < room.x + room.w) {
      // Check if there's a door here
      const hasDoor = DOORS.some(d =>
        d.y >= room.y - 5 && d.y <= room.y + WALL_T + 5 &&
        px > d.x - 10 && px < d.x + d.w + 10
      );
      if (!hasDoor && py - radius < room.y + WALL_T) return true;
    }
    // Bottom wall
    if (py + radius > room.y + room.h - WALL_T && py - radius < room.y + room.h &&
        px > room.x && px < room.x + room.w) {
      const hasDoor = DOORS.some(d =>
        d.y >= room.y + room.h - WALL_T - 5 && d.y <= room.y + room.h + 5 &&
        px > d.x - 10 && px < d.x + d.w + 10
      );
      if (!hasDoor && py + radius > room.y + room.h - WALL_T) return true;
    }
    // Left wall
    if (px - radius < room.x + WALL_T && px + radius > room.x &&
        py > room.y && py < room.y + room.h) {
      const hasDoor = DOORS.some(d =>
        d.x >= room.x - 5 && d.x <= room.x + WALL_T + 5 &&
        py > d.y - 10 && py < d.y + d.h + 10
      );
      if (!hasDoor && px - radius < room.x + WALL_T) return true;
    }
    // Right wall
    if (px + radius > room.x + room.w - WALL_T && px - radius < room.x + room.w &&
        py > room.y && py < room.y + room.h) {
      const hasDoor = DOORS.some(d =>
        d.x >= room.x + room.w - WALL_T - 5 && d.x <= room.x + room.w + 5 &&
        py > d.y - 10 && py < d.y + d.h + 10
      );
      if (!hasDoor && px + radius > room.x + room.w - WALL_T) return true;
    }
  }
  return false;
}

function broadcastToLobby(lobby, type, data, excludeId) {
  const msg = JSON.stringify({ type, ...data });
  lobby.players.forEach((p, id) => {
    if (id !== excludeId && p.ws && p.ws.readyState === 1) {
      wsSend(p.ws, msg);
    }
  });
}

function sendToPlayer(lobby, playerId, type, data) {
  const p = lobby.players.get(playerId);
  if (p && p.ws && p.ws.readyState === 1) {
    wsSend(p.ws, JSON.stringify({ type, ...data }));
  }
}

function getPublicPlayerData(lobby) {
  const players = [];
  lobby.players.forEach((p, id) => {
    players.push({
      id,
      name: p.name,
      archetype: p.archetype,
      alive: p.alive,
      x: p.x,
      y: p.y,
      inVent: p.inVent,
    });
  });
  return players;
}

function checkWinConditions(lobby) {
  let aliveCrewmates = 0;
  let aliveImpostors = 0;
  lobby.players.forEach(p => {
    if (p.alive) {
      if (p.role === 'impostor') aliveImpostors++;
      else aliveCrewmates++;
    }
  });

  if (aliveImpostors === 0) {
    endGame(lobby, 'crewmates', 'All impostors have been fired!');
    return true;
  }
  if (aliveImpostors >= aliveCrewmates) {
    endGame(lobby, 'impostors', 'Impostors have taken over the office!');
    return true;
  }
  if (lobby.taskProgress >= lobby.totalTasks && lobby.totalTasks > 0) {
    endGame(lobby, 'crewmates', 'All tasks completed! The office is saved!');
    return true;
  }
  return false;
}

function endGame(lobby, winner, message) {
  lobby.state = 'gameover';
  if (lobby.meetingTimer) clearTimeout(lobby.meetingTimer);
  const playerInfo = [];
  lobby.players.forEach((p, id) => {
    playerInfo.push({ id, name: p.name, role: p.role, archetype: p.archetype, alive: p.alive });
  });
  broadcastToLobby(lobby, 'game_over', { winner, message, playerInfo, hostId: lobby.hostId });
}

function startMeeting(lobby, callerId, type, bodyId) {
  lobby.state = 'meeting';
  lobby.meetingCaller = callerId;
  lobby.meetingType = type;
  lobby.reportedBody = bodyId || null;
  lobby.votes = new Map();
  lobby.chatMessages = [];
  lobby.meetingPhase = 'discussion';

  // Remove reported body
  if (bodyId) {
    lobby.bodies = lobby.bodies.filter(b => b.id !== bodyId);
  }

  const callerName = lobby.players.get(callerId)?.name || 'Unknown';

  broadcastToLobby(lobby, 'meeting_start', {
    caller: callerId,
    callerName,
    type,
    players: getPublicPlayerData(lobby),
    discussionTime: lobby.settings.discussionTime,
    votingTime: lobby.settings.votingTime,
  });

  // Discussion timer -> voting phase
  lobby.meetingTimer = setTimeout(() => {
    lobby.meetingPhase = 'voting';
    broadcastToLobby(lobby, 'voting_start', { votingTime: lobby.settings.votingTime });

    // Voting timer -> tally
    lobby.meetingTimer = setTimeout(() => {
      tallyVotes(lobby);
    }, lobby.settings.votingTime * 1000);
  }, lobby.settings.discussionTime * 1000);
}

function tallyVotes(lobby) {
  const voteCounts = new Map();
  voteCounts.set('skip', 0);

  lobby.players.forEach((p, id) => {
    if (p.alive) {
      const vote = lobby.votes.get(id) || 'skip';
      voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
    }
  });

  let maxVotes = 0;
  let maxId = 'skip';
  let tie = false;
  voteCounts.forEach((count, id) => {
    if (count > maxVotes) {
      maxVotes = count;
      maxId = id;
      tie = false;
    } else if (count === maxVotes) {
      tie = true;
    }
  });

  let ejected = null;
  let ejectedName = '';
  let ejectedRole = '';

  if (!tie && maxId !== 'skip') {
    const player = lobby.players.get(maxId);
    if (player) {
      player.alive = false;
      ejected = maxId;
      ejectedName = player.name;
      ejectedRole = player.role;
    }
  }

  const voteResults = {};
  lobby.votes.forEach((vote, id) => { voteResults[id] = vote; });

  broadcastToLobby(lobby, 'meeting_result', {
    ejected,
    ejectedName,
    ejectedRole,
    tie,
    skipped: maxId === 'skip',
    votes: voteResults,
  });

  // Return to game after delay
  setTimeout(() => {
    if (lobby.state === 'gameover') return;
    if (!checkWinConditions(lobby)) {
      lobby.state = 'playing';
      // Reset positions to lobby area
      lobby.players.forEach(p => {
        if (p.alive) {
          p.x = 1100 + (Math.random() - 0.5) * 200;
          p.y = 850 + (Math.random() - 0.5) * 200;
          p.inVent = false;
        }
      });
      broadcastToLobby(lobby, 'meeting_end', { players: getPublicPlayerData(lobby) });
    }
  }, 5000);
}

// ─── Game tick (30fps) ───
setInterval(() => {
  lobbies.forEach((lobby) => {
    if (lobby.state !== 'playing') return;

    // Update kill cooldowns
    lobby.players.forEach(p => {
      if (p.role === 'impostor' && p.killCooldown > 0) {
        p.killCooldown -= 1/30;
      }
    });

    // Build game state for each player (with fog of war)
    lobby.players.forEach((p, myId) => {
      if (!p.ws || p.ws.readyState !== 1) return;

      const vision = lobby.sabotage === 'lights' ? 120 : lobby.settings.vision;
      const visiblePlayers = [];
      const visibleBodies = [];

      lobby.players.forEach((other, otherId) => {
        if (otherId === myId) return;
        if (other.inVent && p.role !== 'impostor') return;
        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= vision + 100) {
          visiblePlayers.push({
            id: otherId, name: other.name, archetype: other.archetype,
            x: other.x, y: other.y, alive: other.alive, inVent: other.inVent,
          });
        }
      });

      lobby.bodies.forEach(body => {
        const dx = body.x - p.x;
        const dy = body.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= vision + 100) {
          visibleBodies.push(body);
        }
      });

      // Nearby interactables
      const nearbyTasks = [];
      if (p.role === 'crewmate') {
        p.tasks.forEach(taskId => {
          if (p.completedTasks.includes(taskId)) return;
          const task = TASKS[taskId];
          const dx = task.x - p.x;
          const dy = task.y - p.y;
          if (Math.sqrt(dx*dx + dy*dy) < 80) {
            nearbyTasks.push(taskId);
          }
        });
      }

      // Nearby vents (impostor only)
      let nearbyVent = null;
      if (p.role === 'impostor') {
        for (const vent of VENTS) {
          const dx = vent.x - p.x;
          const dy = vent.y - p.y;
          if (Math.sqrt(dx*dx + dy*dy) < 60) {
            nearbyVent = vent.id;
            break;
          }
        }
      }

      // Can kill?
      let canKill = null;
      if (p.role === 'impostor' && p.alive && p.killCooldown <= 0 && !p.inVent) {
        let closestDist = 80;
        lobby.players.forEach((target, targetId) => {
          if (targetId === myId || !target.alive || target.role === 'impostor') return;
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < closestDist) {
            closestDist = dist;
            canKill = targetId;
          }
        });
      }

      // Can report?
      let canReport = null;
      if (p.alive) {
        for (const body of lobby.bodies) {
          const dx = body.x - p.x;
          const dy = body.y - p.y;
          if (Math.sqrt(dx*dx + dy*dy) < 80) {
            canReport = body.id;
            break;
          }
        }
      }

      const state = {
        x: p.x, y: p.y,
        players: visiblePlayers,
        bodies: visibleBodies,
        nearbyTasks,
        nearbyVent,
        canKill,
        canReport,
        killCooldown: p.role === 'impostor' ? Math.max(0, p.killCooldown) : null,
        taskProgress: lobby.taskProgress,
        totalTasks: lobby.totalTasks,
        sabotage: lobby.sabotage,
        role: p.role,
        alive: p.alive,
        tasks: p.tasks,
        completedTasks: p.completedTasks,
        inVent: p.inVent,
        emergencyMeetings: p.emergencyMeetings,
      };

      wsSend(p.ws, JSON.stringify({ type: 'state', ...state }));
    });
  });
}, 1000 / 30);

// ─── Handle incoming messages ───
function handleMessage(ws, data) {
  const client = clients.get(ws);
  if (!client) return;

  let msg;
  try { msg = JSON.parse(data); } catch { return; }

  switch (msg.type) {
    case 'create_lobby': {
      const lobby = createLobby(client.id);
      const arch = msg.archetype || ARCHETYPES[0].id;
      lobby.players.set(client.id, {
        ws, name: msg.name || 'Player', archetype: arch,
        alive: true, x: 1100, y: 850, role: null, tasks: [], completedTasks: [],
        killCooldown: 0, emergencyMeetings: 1, inVent: false,
      });
      client.lobbyCode = lobby.code;
      wsSend(ws, JSON.stringify({
        type: 'lobby_created',
        code: lobby.code,
        playerId: client.id,
        players: getPublicPlayerData(lobby),
        archetypes: ARCHETYPES,
        availableArchetypes: getAvailableArchetypes(lobby),
      }));
      break;
    }

    case 'join_lobby': {
      const code = (msg.code || '').toUpperCase().trim();
      const lobby = lobbies.get(code);
      if (!lobby) {
        wsSend(ws, JSON.stringify({ type: 'error', message: 'Lobby not found' }));
        return;
      }
      if (lobby.state !== 'lobby') {
        wsSend(ws, JSON.stringify({ type: 'error', message: 'Game already in progress' }));
        return;
      }
      if (lobby.players.size >= 8) {
        wsSend(ws, JSON.stringify({ type: 'error', message: 'Lobby is full (max 8 players)' }));
        return;
      }
      const avail = getAvailableArchetypes(lobby);
      const arch = avail.find(a => a.id === msg.archetype) ? msg.archetype : avail[0]?.id;
      if (!arch) {
        wsSend(ws, JSON.stringify({ type: 'error', message: 'No characters available' }));
        return;
      }
      lobby.players.set(client.id, {
        ws, name: msg.name || 'Player', archetype: arch,
        alive: true, x: 1100, y: 850, role: null, tasks: [], completedTasks: [],
        killCooldown: 0, emergencyMeetings: 1, inVent: false,
      });
      client.lobbyCode = code;
      wsSend(ws, JSON.stringify({
        type: 'lobby_joined',
        code,
        playerId: client.id,
        players: getPublicPlayerData(lobby),
        archetypes: ARCHETYPES,
        availableArchetypes: getAvailableArchetypes(lobby),
        hostId: lobby.hostId,
      }));
      broadcastToLobby(lobby, 'player_joined', {
        players: getPublicPlayerData(lobby),
        availableArchetypes: getAvailableArchetypes(lobby),
      }, client.id);
      break;
    }

    case 'change_archetype': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'lobby') return;
      const avail = getAvailableArchetypes(lobby);
      if (avail.find(a => a.id === msg.archetype)) {
        const p = lobby.players.get(client.id);
        if (p) p.archetype = msg.archetype;
        broadcastToLobby(lobby, 'player_updated', {
          players: getPublicPlayerData(lobby),
          availableArchetypes: getAvailableArchetypes(lobby),
        });
      }
      break;
    }

    case 'start_game': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'lobby') return;
      if (client.id !== lobby.hostId) return;
      if (lobby.players.size < 4) {
        wsSend(ws, JSON.stringify({ type: 'error', message: 'Need at least 4 players to start' }));
        return;
      }
      assignRoles(lobby);
      lobby.state = 'playing';

      // Send role reveal to each player
      lobby.players.forEach((p, id) => {
        const impostorNames = [];
        if (p.role === 'impostor') {
          lobby.players.forEach((other, otherId) => {
            if (otherId !== id && other.role === 'impostor') {
              impostorNames.push(other.name);
            }
          });
        }
        sendToPlayer(lobby, id, 'game_start', {
          role: p.role,
          fellowImpostors: impostorNames,
          tasks: p.tasks.map(t => ({ id: t, ...TASKS[t] })),
          map: { width: MAP_W, height: MAP_H, rooms: ROOMS, doors: DOORS, vents: p.role === 'impostor' ? VENTS : [], tasks: TASKS },
        });
      });
      break;
    }

    case 'move': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing') return;
      const p = lobby.players.get(client.id);
      if (!p || !p.alive || p.inVent) return;

      const speed = lobby.sabotage === 'coffee' ? lobby.settings.speed * 0.5 : lobby.settings.speed;
      let dx = 0, dy = 0;
      if (msg.keys) {
        if (msg.keys.up) dy -= 1;
        if (msg.keys.down) dy += 1;
        if (msg.keys.left) dx -= 1;
        if (msg.keys.right) dx += 1;
      }
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }
      const newX = p.x + dx * speed;
      const newY = p.y + dy * speed;

      // Bounds check
      if (newX >= 15 && newX <= MAP_W - 15 && newY >= 15 && newY <= MAP_H - 15) {
        // Simple room containment: must be in a room or doorway
        const inRoom = ROOMS.some(r =>
          newX >= r.x + 15 && newX <= r.x + r.w - 15 &&
          newY >= r.y + 15 && newY <= r.y + r.h - 15
        );
        const inDoor = DOORS.some(d =>
          newX >= d.x - 30 && newX <= d.x + d.w + 30 &&
          newY >= d.y - 30 && newY <= d.y + d.h + 30
        );
        if (inRoom || inDoor) {
          p.x = newX;
          p.y = newY;
        }
      }
      break;
    }

    case 'kill': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing') return;
      const killer = lobby.players.get(client.id);
      if (!killer || killer.role !== 'impostor' || !killer.alive || killer.killCooldown > 0) return;

      const target = lobby.players.get(msg.targetId);
      if (!target || !target.alive || target.role === 'impostor') return;

      const dx = target.x - killer.x;
      const dy = target.y - killer.y;
      if (Math.sqrt(dx*dx + dy*dy) > 100) return;

      target.alive = false;
      killer.killCooldown = lobby.settings.killCooldown;
      killer.x = target.x;
      killer.y = target.y;

      lobby.bodies.push({
        id: generateId(),
        playerId: msg.targetId,
        name: target.name,
        archetype: target.archetype,
        x: target.x,
        y: target.y,
      });

      sendToPlayer(lobby, msg.targetId, 'you_died', {});
      checkWinConditions(lobby);
      break;
    }

    case 'report': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing') return;
      const reporter = lobby.players.get(client.id);
      if (!reporter || !reporter.alive) return;

      const body = lobby.bodies.find(b => b.id === msg.bodyId);
      if (!body) return;
      const dx = body.x - reporter.x;
      const dy = body.y - reporter.y;
      if (Math.sqrt(dx*dx + dy*dy) > 100) return;

      startMeeting(lobby, client.id, 'report', body.id);
      break;
    }

    case 'emergency': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing') return;
      const caller = lobby.players.get(client.id);
      if (!caller || !caller.alive || caller.emergencyMeetings <= 0) return;

      // Must be near emergency button in lobby
      const dx = 1200 - caller.x;
      const dy = 900 - caller.y;
      if (Math.sqrt(dx*dx + dy*dy) > 100) return;

      caller.emergencyMeetings--;
      startMeeting(lobby, client.id, 'emergency');
      break;
    }

    case 'vote': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'meeting' || lobby.meetingPhase !== 'voting') return;
      const voter = lobby.players.get(client.id);
      if (!voter || !voter.alive) return;
      if (lobby.votes.has(client.id)) return;

      lobby.votes.set(client.id, msg.targetId || 'skip');
      broadcastToLobby(lobby, 'vote_cast', { voterId: client.id, total: lobby.votes.size });

      // Check if all alive players have voted
      let aliveCount = 0;
      lobby.players.forEach(p => { if (p.alive) aliveCount++; });
      if (lobby.votes.size >= aliveCount) {
        if (lobby.meetingTimer) clearTimeout(lobby.meetingTimer);
        tallyVotes(lobby);
      }
      break;
    }

    case 'chat': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'meeting') return;
      const sender = lobby.players.get(client.id);
      if (!sender || !sender.alive) return;
      const text = (msg.text || '').trim().slice(0, 200);
      if (!text) return;
      const chatMsg = { senderId: client.id, senderName: sender.name, text, time: Date.now() };
      lobby.chatMessages.push(chatMsg);
      broadcastToLobby(lobby, 'chat_message', chatMsg);
      break;
    }

    case 'complete_task': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing') return;
      const p = lobby.players.get(client.id);
      if (!p || !p.alive || p.role !== 'crewmate') return;
      if (!p.tasks.includes(msg.taskId) || p.completedTasks.includes(msg.taskId)) return;

      // Verify proximity
      const task = TASKS[msg.taskId];
      if (!task) return;
      const dx = task.x - p.x;
      const dy = task.y - p.y;
      if (Math.sqrt(dx*dx + dy*dy) > 100) return;

      p.completedTasks.push(msg.taskId);
      lobby.taskProgress++;
      broadcastToLobby(lobby, 'task_completed', {
        taskProgress: lobby.taskProgress,
        totalTasks: lobby.totalTasks,
      });
      checkWinConditions(lobby);
      break;
    }

    case 'sabotage': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing') return;
      const p = lobby.players.get(client.id);
      if (!p || p.role !== 'impostor' || !p.alive) return;
      if (lobby.sabotage) return;

      const sabType = msg.sabotageType;
      if (!['wifi', 'coffee', 'lights', 'fire_drill'].includes(sabType)) return;

      lobby.sabotage = sabType;
      broadcastToLobby(lobby, 'sabotage_start', { sabotageType: sabType });

      if (sabType === 'fire_drill') {
        // Force everyone to lobby after delay
        setTimeout(() => {
          if (lobby.sabotage === 'fire_drill') {
            lobby.players.forEach(p => {
              if (p.alive) {
                p.x = 1100 + (Math.random() - 0.5) * 300;
                p.y = 850 + (Math.random() - 0.5) * 300;
              }
            });
            lobby.sabotage = null;
            broadcastToLobby(lobby, 'sabotage_end', {});
          }
        }, 8000);
      } else {
        // Auto-end after 20 seconds if not fixed
        lobby.sabotageTimer = setTimeout(() => {
          if (lobby.sabotage) {
            lobby.sabotage = null;
            broadcastToLobby(lobby, 'sabotage_end', {});
          }
        }, 20000);
      }
      break;
    }

    case 'fix_sabotage': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing' || !lobby.sabotage) return;
      const p = lobby.players.get(client.id);
      if (!p || !p.alive) return;

      lobby.sabotage = null;
      if (lobby.sabotageTimer) clearTimeout(lobby.sabotageTimer);
      broadcastToLobby(lobby, 'sabotage_end', {});
      break;
    }

    case 'use_vent': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'playing') return;
      const p = lobby.players.get(client.id);
      if (!p || p.role !== 'impostor' || !p.alive) return;

      if (p.inVent) {
        if (msg.travel) {
          // Travel to connected vent, then exit
          const currentVent = VENTS.find(v => {
            const dx = v.x - p.x;
            const dy = v.y - p.y;
            return Math.sqrt(dx*dx + dy*dy) < 80;
          });
          if (currentVent) {
            const dest = VENTS.find(v => v.id === currentVent.connects);
            if (dest) {
              p.x = dest.x;
              p.y = dest.y;
            }
          }
          p.inVent = false;
        } else {
          // Just exit vent
          p.inVent = false;
        }
      } else {
        // Enter vent
        const vent = VENTS.find(v => {
          const dx = v.x - p.x;
          const dy = v.y - p.y;
          return Math.sqrt(dx*dx + dy*dy) < 60;
        });
        if (vent) {
          p.inVent = true;
          p.x = vent.x;
          p.y = vent.y;
        }
      }
      break;
    }

    case 'return_to_lobby': {
      const lobby = lobbies.get(client.lobbyCode);
      if (!lobby || lobby.state !== 'gameover') return;
      if (client.id !== lobby.hostId) return;

      lobby.state = 'lobby';
      lobby.bodies = [];
      lobby.sabotage = null;
      lobby.players.forEach(p => {
        p.alive = true;
        p.role = null;
        p.tasks = [];
        p.completedTasks = [];
        p.x = 1100;
        p.y = 850;
        p.inVent = false;
      });
      broadcastToLobby(lobby, 'returned_to_lobby', {
        players: getPublicPlayerData(lobby),
        availableArchetypes: getAvailableArchetypes(lobby),
        hostId: lobby.hostId,
      });
      break;
    }
  }
}

// ─── Raw WebSocket Implementation ───
function wsSend(ws, data) {
  if (ws.readyState !== 1) return;
  const payload = Buffer.from(data);
  let header;
  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text
    header[1] = payload.length;
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  try { ws.socket.write(Buffer.concat([header, payload])); } catch {}
}

function parseFrame(buffer) {
  if (buffer.length < 2) return null;
  const firstByte = buffer[0];
  const secondByte = buffer[1];
  const opcode = firstByte & 0x0f;
  const masked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  if (masked) {
    if (buffer.length < offset + 4 + payloadLength) return null;
    const mask = buffer.slice(offset, offset + 4);
    offset += 4;
    const data = buffer.slice(offset, offset + payloadLength);
    for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
    return { opcode, data, totalLength: offset + payloadLength };
  } else {
    if (buffer.length < offset + payloadLength) return null;
    return { opcode, data: buffer.slice(offset, offset + payloadLength), totalLength: offset + payloadLength };
  }
}

// ─── HTTP Server ───
const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const filePath = path.join(__dirname, 'public', url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ─── WebSocket Upgrade ───
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }

  const accept = crypto.createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-5AB9FC6391C5')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const ws = { socket, readyState: 1, buffer: Buffer.alloc(0) };
  const clientId = generateId();
  clients.set(ws, { id: clientId, lobbyCode: null });

  socket.on('data', (chunk) => {
    ws.buffer = Buffer.concat([ws.buffer, chunk]);
    while (true) {
      const frame = parseFrame(ws.buffer);
      if (!frame) break;
      ws.buffer = ws.buffer.slice(frame.totalLength);

      if (frame.opcode === 0x08) {
        // Close frame
        ws.readyState = 3;
        socket.end();
        return;
      }
      if (frame.opcode === 0x09) {
        // Ping -> Pong
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a;
        pong[1] = 0;
        socket.write(pong);
        continue;
      }
      if (frame.opcode === 0x01) {
        handleMessage(ws, frame.data.toString('utf8'));
      }
    }
  });

  socket.on('close', () => {
    ws.readyState = 3;
    const client = clients.get(ws);
    if (client && client.lobbyCode) {
      const lobby = lobbies.get(client.lobbyCode);
      if (lobby) {
        lobby.players.delete(client.id);
        if (lobby.players.size === 0) {
          lobbies.delete(client.lobbyCode);
        } else {
          if (lobby.hostId === client.id) {
            lobby.hostId = lobby.players.keys().next().value;
          }
          broadcastToLobby(lobby, 'player_left', {
            playerId: client.id,
            players: getPublicPlayerData(lobby),
            hostId: lobby.hostId,
            availableArchetypes: getAvailableArchetypes(lobby),
          });
          if (lobby.state === 'playing') checkWinConditions(lobby);
        }
      }
    }
    clients.delete(ws);
  });

  socket.on('error', () => {
    ws.readyState = 3;
    socket.destroy();
  });
});

server.listen(PORT, () => {
  console.log(`\n  🏢 Corporate Among Us`);
  console.log(`  Server running on http://localhost:${PORT}\n`);
});
