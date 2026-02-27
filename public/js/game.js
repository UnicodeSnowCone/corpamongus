// ═══ Game — Main game loop, canvas rendering, input ═══
const Game = (() => {
  let canvas, ctx;
  let myId = null;
  let gameState = null;
  let mapData = null;
  let keys = { up: false, down: false, left: false, right: false };
  let animFrame = null;
  let lastSendTime = 0;
  const SEND_RATE = 1000 / 30; // Send input 30 times/sec

  function init(playerId, startData) {
    myId = playerId;
    mapData = startData.map;
    GameMap.setMapData(mapData);

    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Input
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // HUD buttons
    document.getElementById('btn-use').onclick = onUseTask;
    document.getElementById('btn-report').onclick = onReport;
    document.getElementById('btn-kill').onclick = onKill;
    document.getElementById('btn-emergency').onclick = onEmergency;
    document.getElementById('btn-map').onclick = toggleMap;
    document.getElementById('btn-tasks').onclick = toggleTaskList;
    document.getElementById('btn-sabotage').onclick = toggleSabotage;
    document.getElementById('btn-vent').onclick = onVent;

    // Sabotage buttons
    document.querySelectorAll('.sab-btn').forEach(btn => {
      btn.onclick = () => {
        Network.send('sabotage', { sabotageType: btn.dataset.sab });
        document.getElementById('sabotage-overlay').classList.add('hidden');
      };
    });

    HUD.init(startData.role);

    // Start render loop
    if (animFrame) cancelAnimationFrame(animFrame);
    render();
    startInputLoop();
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function startInputLoop() {
    setInterval(() => {
      if (keys.up || keys.down || keys.left || keys.right) {
        Network.send('move', { keys });
      }
    }, SEND_RATE);
  }

  function updateState(state) {
    gameState = state;
    HUD.update(state);
  }

  function render() {
    animFrame = requestAnimationFrame(render);
    if (!gameState || !ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const camX = gameState.x;
    const camY = gameState.y;
    const vision = gameState.sabotage === 'lights' ? 150 : 300;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Draw to offscreen-like layer
    ctx.save();

    // Draw map
    GameMap.draw(ctx, camX, camY, W, H, vision, gameState.sabotage);

    // Translate for entities
    ctx.save();
    ctx.translate(-camX + W / 2, -camY + H / 2);

    // Draw bodies
    if (gameState.bodies) {
      gameState.bodies.forEach(body => {
        Player.drawBean(ctx, body.x, body.y, body.archetype, 1, { dead: true });
        // X eyes
        ctx.fillStyle = 'rgba(255,0,0,0.6)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💀', body.x, body.y - 30);
      });
    }

    // Draw other players
    if (gameState.players) {
      gameState.players.forEach(p => {
        if (!p.alive && p.id !== myId) return; // Don't show dead players (unless ghost)
        Player.drawBean(ctx, p.x, p.y, p.archetype, 1, {
          ghost: !p.alive,
          inVent: p.inVent,
        });
        // Name label
        ctx.fillStyle = p.alive ? '#FFF' : 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 11px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - 35);
      });
    }

    // Draw self
    if (gameState.alive || true) { // Always draw self (ghost mode)
      const selfArch = window._myArchetype || 'intern';
      Player.drawBean(ctx, gameState.x, gameState.y, selfArch, 1, {
        ghost: !gameState.alive,
        inVent: gameState.inVent,
      });
      ctx.fillStyle = gameState.alive ? '#FFF' : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 11px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(window._myName || 'You', gameState.x, gameState.y - 35);
    }

    // Draw task indicators (arrows to nearby tasks)
    if (gameState.role === 'crewmate' && gameState.tasks) {
      gameState.tasks.forEach(taskId => {
        if (gameState.completedTasks.includes(taskId)) return;
        const task = mapData.tasks[taskId];
        if (!task) return;
        const dx = task.x - gameState.x;
        const dy = task.y - gameState.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 300) {
          // Show task glow
          ctx.fillStyle = 'rgba(255,193,7,0.15)';
          ctx.beginPath();
          ctx.arc(task.x, task.y, 25 + Math.sin(Date.now() / 300) * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    ctx.restore();

    // Fog of war
    GameMap.drawFogOfWar(ctx, camX, camY, camX, camY, W, H, vision);

    // Vignette overlay
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  function onKeyDown(e) {
    if (Tasks.isOpen()) return;
    if (document.activeElement?.tagName === 'INPUT') return;

    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': keys.up = true; e.preventDefault(); break;
      case 's': case 'arrowdown': keys.down = true; e.preventDefault(); break;
      case 'a': case 'arrowleft': keys.left = true; e.preventDefault(); break;
      case 'd': case 'arrowright': keys.right = true; e.preventDefault(); break;
      case 'e': onUseTask(); break;
      case 'q': onKill(); break;
      case 'r': onReport(); break;
      case 'm': toggleMap(); break;
      case 't': toggleTaskList(); break;
    }
  }

  function onKeyUp(e) {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': keys.up = false; break;
      case 's': case 'arrowdown': keys.down = false; break;
      case 'a': case 'arrowleft': keys.left = false; break;
      case 'd': case 'arrowright': keys.right = false; break;
    }
  }

  function onUseTask() {
    if (!gameState || !gameState.alive) return;
    if (gameState.nearbyTasks && gameState.nearbyTasks.length > 0) {
      const taskId = gameState.nearbyTasks[0];
      Tasks.openTask(taskId, (completedId) => {
        Network.send('complete_task', { taskId: completedId });
      });
    }
  }

  function onReport() {
    if (!gameState || !gameState.canReport || !gameState.alive) return;
    Network.send('report', { bodyId: gameState.canReport });
  }

  function onKill() {
    if (!gameState || !gameState.canKill || gameState.role !== 'impostor' || !gameState.alive) return;
    Network.send('kill', { targetId: gameState.canKill });
  }

  function onEmergency() {
    if (!gameState || !gameState.alive || gameState.emergencyMeetings <= 0) return;
    Network.send('emergency');
  }

  function onVent() {
    if (!gameState || gameState.role !== 'impostor' || !gameState.alive) return;
    if (gameState.inVent) {
      // In vent: travel to connected vent and exit
      Network.send('use_vent', { travel: true });
    } else if (gameState.nearbyVent) {
      // Near a vent: enter it
      Network.send('use_vent', { travel: false });
    }
  }

  function toggleMap() {
    const overlay = document.getElementById('map-overlay');
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden') && gameState) {
      GameMap.drawMinimap(
        document.getElementById('minimap-canvas'),
        gameState.x, gameState.y,
        gameState.tasks, gameState.completedTasks
      );
    }
  }

  function toggleTaskList() {
    if (!gameState) return;
    const taskDefs = {};
    if (mapData && mapData.tasks) {
      for (const [id, t] of Object.entries(mapData.tasks)) {
        taskDefs[id] = t;
      }
    }
    // Merge with Tasks.TASK_DEFS for names
    for (const [id, def] of Object.entries(Tasks.TASK_DEFS)) {
      if (taskDefs[id]) {
        taskDefs[id].name = def.name;
      }
    }
    HUD.showTaskList(gameState.tasks || [], gameState.completedTasks || [], taskDefs);
  }

  function toggleSabotage() {
    document.getElementById('sabotage-overlay').classList.toggle('hidden');
  }

  function stop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    keys = { up: false, down: false, left: false, right: false };
  }

  return { init, updateState, stop };
})();
