// ═══ Lobby — Lobby UI, character selection ═══
const Lobby = (() => {
  let myId = null;
  let myArchetype = null;
  let hostId = null;
  let allArchetypes = [];
  let availableArchetypes = [];

  function showLobby(data) {
    myId = data.playerId;
    hostId = data.hostId || data.playerId; // Creator is host
    allArchetypes = data.archetypes || [];
    availableArchetypes = data.availableArchetypes || [];

    document.getElementById('lobby-code').textContent = data.code;
    renderArchetypes(data);
    renderPlayers(data.players);
    updateStartButton(data.players);

    Main.showScreen('lobby');
  }

  function renderArchetypes(data) {
    const grid = document.getElementById('archetype-select');
    grid.innerHTML = '';

    // Find my current archetype
    const me = data.players?.find(p => p.id === myId);
    myArchetype = me?.archetype || allArchetypes[0]?.id;
    window._myArchetype = myArchetype;

    allArchetypes.forEach(arch => {
      const card = document.createElement('div');
      card.className = 'archetype-card';
      const isTaken = !availableArchetypes.find(a => a.id === arch.id) && arch.id !== myArchetype;
      if (isTaken) card.classList.add('taken');
      if (arch.id === myArchetype) card.classList.add('selected');

      const canvas = document.createElement('canvas');
      canvas.width = 70;
      canvas.height = 88;
      Player.drawBeanToCanvas(canvas, arch.id);

      const label = document.createElement('div');
      label.className = 'archetype-label';
      label.textContent = arch.name;

      card.appendChild(canvas);
      card.appendChild(label);

      if (!isTaken) {
        card.onclick = () => {
          if (arch.id === myArchetype) return;
          myArchetype = arch.id;
          window._myArchetype = myArchetype;
          Network.send('change_archetype', { archetype: arch.id });
          // Update UI
          document.querySelectorAll('.archetype-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        };
      }

      grid.appendChild(card);
    });
  }

  function renderPlayers(players) {
    const list = document.getElementById('player-list');
    list.innerHTML = '';

    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';

      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 50;
      Player.drawBeanToCanvas(canvas, p.archetype);

      const info = document.createElement('div');
      const nameEl = document.createElement('div');
      nameEl.className = 'pname';
      nameEl.textContent = p.name;
      info.appendChild(nameEl);

      if (p.id === hostId) {
        const badge = document.createElement('span');
        badge.className = 'host-badge';
        badge.textContent = 'HOST';
        info.appendChild(badge);
      }

      card.appendChild(canvas);
      card.appendChild(info);
      list.appendChild(card);
    });
  }

  function updateStartButton(players) {
    const btn = document.getElementById('btn-start');
    const waiting = document.getElementById('waiting-msg');

    if (myId === hostId) {
      btn.classList.remove('hidden');
      btn.textContent = players.length < 4
        ? `START GAME (need ${4 - players.length} more)`
        : `START GAME (${players.length} players)`;
      btn.disabled = players.length < 4;
      btn.onclick = () => Network.send('start_game');
      waiting.classList.add('hidden');
    } else {
      btn.classList.add('hidden');
      waiting.classList.remove('hidden');
    }
  }

  function onPlayerJoined(data) {
    availableArchetypes = data.availableArchetypes || [];
    renderPlayers(data.players);
    updateStartButton(data.players);
    renderArchetypes({ players: data.players, archetypes: allArchetypes, availableArchetypes });
  }

  function onPlayerLeft(data) {
    hostId = data.hostId;
    availableArchetypes = data.availableArchetypes || [];
    renderPlayers(data.players);
    updateStartButton(data.players);
    renderArchetypes({ players: data.players, archetypes: allArchetypes, availableArchetypes });
  }

  function onPlayerUpdated(data) {
    availableArchetypes = data.availableArchetypes || [];
    renderPlayers(data.players);
    renderArchetypes({ players: data.players, archetypes: allArchetypes, availableArchetypes });
  }

  function getMyId() { return myId; }
  function getMyArchetype() { return myArchetype; }

  return { showLobby, onPlayerJoined, onPlayerLeft, onPlayerUpdated, getMyId, getMyArchetype };
})();
