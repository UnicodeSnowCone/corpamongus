// ═══ Main — Entry point, screen management, network handlers ═══
const Main = (() => {
  let myId = null;
  let myName = '';

  function init() {
    Network.connect();

    // Title screen buttons
    document.getElementById('btn-create').onclick = () => {
      const name = getPlayerName();
      if (!name) return;
      Network.send('create_lobby', { name, archetype: 'intern' });
    };

    document.getElementById('btn-join').onclick = () => {
      document.getElementById('join-form').classList.toggle('hidden');
    };

    document.getElementById('btn-join-submit').onclick = () => {
      const name = getPlayerName();
      const code = document.getElementById('input-code').value.trim().toUpperCase();
      if (!name) return;
      if (!code || code.length !== 4) {
        showError('Enter a 4-letter lobby code');
        return;
      }
      Network.send('join_lobby', { name, code, archetype: 'intern' });
    };

    // Enter key on code input
    document.getElementById('input-code').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-join-submit').click();
    });

    document.getElementById('btn-play-again').onclick = () => {
      Network.send('return_to_lobby');
    };

    // ─── Network handlers ───
    Network.on('lobby_created', (data) => {
      myId = data.playerId;
      Lobby.showLobby(data);
    });

    Network.on('lobby_joined', (data) => {
      myId = data.playerId;
      Lobby.showLobby(data);
    });

    Network.on('player_joined', (data) => {
      Lobby.onPlayerJoined(data);
    });

    Network.on('player_left', (data) => {
      Lobby.onPlayerLeft(data);
    });

    Network.on('player_updated', (data) => {
      Lobby.onPlayerUpdated(data);
    });

    Network.on('error', (data) => {
      showError(data.message);
    });

    Network.on('game_start', (data) => {
      // Show role reveal
      showRoleReveal(data);
    });

    Network.on('state', (data) => {
      Game.updateState(data);
    });

    Network.on('you_died', () => {
      // Show death notification
      document.getElementById('ghost-overlay').classList.remove('hidden');
    });

    Network.on('meeting_start', (data) => {
      Voting.showMeeting(data);
      showScreen('meeting');
    });

    Network.on('voting_start', (data) => {
      Voting.startVoting(data);
    });

    Network.on('vote_cast', (data) => {
      Voting.onVoteCast(data);
    });

    Network.on('chat_message', (data) => {
      Voting.addChatMessage(data);
    });

    Network.on('meeting_result', (data) => {
      Voting.showResult(data);
      showScreen('result');
    });

    Network.on('meeting_end', (data) => {
      Voting.endMeeting(data);
      showScreen('game');
    });

    Network.on('task_completed', (data) => {
      // Updated via state
    });

    Network.on('sabotage_start', (data) => {
      // Handled via HUD state updates
    });

    Network.on('sabotage_end', () => {
      // Handled via HUD state updates
    });

    Network.on('game_over', (data) => {
      showGameOver(data);
    });

    Network.on('returned_to_lobby', (data) => {
      // Reset game state
      document.getElementById('ghost-overlay').classList.add('hidden');
      Game.stop();
      Lobby.showLobby({
        playerId: myId,
        code: document.getElementById('lobby-code').textContent,
        players: data.players,
        archetypes: Object.entries(Player.ARCHETYPES).map(([id, a]) => ({ id, ...a })),
        availableArchetypes: data.availableArchetypes,
        hostId: data.hostId || myId,
      });
    });

    Network.on('disconnected', () => {
      showError('Disconnected from server. Reconnecting...');
    });
  }

  function getPlayerName() {
    const name = document.getElementById('input-name').value.trim();
    if (!name) {
      showError('Enter your name first!');
      return null;
    }
    myName = name;
    window._myName = name;
    return name;
  }

  function showError(msg) {
    const el = document.getElementById('error-msg');
    el.textContent = msg;
    setTimeout(() => { el.textContent = ''; }, 4000);
  }

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
  }

  function showRoleReveal(data) {
    showScreen('role');

    const title = document.getElementById('role-title');
    const subtitle = document.getElementById('role-subtitle');
    const beanContainer = document.getElementById('role-bean');

    if (data.role === 'impostor') {
      title.textContent = '🔥 IMPOSTOR';
      title.style.color = '#e94560';
      subtitle.textContent = data.fellowImpostors.length > 0
        ? `Your partner in crime: ${data.fellowImpostors.join(', ')}`
        : 'You work alone. Fire everyone before they catch you!';
    } else {
      title.textContent = '💼 CREWMATE';
      title.style.color = '#4CAF50';
      subtitle.textContent = 'Complete your tasks and find the impostor!';
    }

    // Draw bean
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 160;
    beanContainer.innerHTML = '';
    beanContainer.appendChild(canvas);
    Player.drawBeanToCanvas(canvas, Lobby.getMyArchetype());

    Voting.init(myId);

    // After 3 seconds, show game
    setTimeout(() => {
      showScreen('game');
      Game.init(myId, data);
    }, 3500);
  }

  function showGameOver(data) {
    showScreen('gameover');

    const title = document.getElementById('gameover-title');
    const msg = document.getElementById('gameover-msg');
    const roles = document.getElementById('gameover-roles');
    const btn = document.getElementById('btn-play-again');

    if (data.winner === 'crewmates') {
      title.textContent = '💼 CREWMATES WIN!';
      title.style.color = '#4CAF50';
    } else {
      title.textContent = '🔥 IMPOSTORS WIN!';
      title.style.color = '#e94560';
    }
    msg.textContent = data.message;

    // Show all players with their roles
    roles.innerHTML = '';
    if (data.playerInfo) {
      for (const p of data.playerInfo) {
        const card = document.createElement('div');
        card.className = 'role-card';

        const canvas = document.createElement('canvas');
        canvas.width = 35;
        canvas.height = 44;
        Player.drawBeanToCanvas(canvas, p.archetype, { dead: !p.alive });
        card.appendChild(canvas);

        const nameEl = document.createElement('span');
        nameEl.className = 'rc-name';
        nameEl.textContent = p.name + (p.alive ? '' : ' 💀');

        const roleEl = document.createElement('span');
        roleEl.className = `rc-role ${p.role === 'impostor' ? 'rc-impostor' : 'rc-crewmate'}`;
        roleEl.textContent = p.role === 'impostor' ? 'IMPOSTOR' : 'CREWMATE';

        card.appendChild(nameEl);
        card.appendChild(roleEl);
        roles.appendChild(card);
      }
    }

    // Show play again button for host
    if (data.hostId === myId) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }

  return { init, showScreen };
})();

// Start!
window.addEventListener('DOMContentLoaded', Main.init);
