// ═══ HUD — In-game heads-up display ═══
const HUD = (() => {
  let role = null;

  function init(playerRole) {
    role = playerRole;
    // Show/hide role-specific buttons
    document.getElementById('btn-kill').classList.toggle('hidden', role !== 'impostor');
    document.getElementById('btn-sabotage').classList.toggle('hidden', role !== 'impostor');
    document.getElementById('btn-vent').classList.toggle('hidden', role !== 'impostor');
    document.getElementById('kill-cooldown').classList.toggle('hidden', role !== 'impostor');
  }

  function update(state) {
    // Task bar
    const pct = state.totalTasks > 0 ? (state.taskProgress / state.totalTasks * 100) : 0;
    document.getElementById('task-bar').style.width = pct + '%';
    document.getElementById('task-bar-text').textContent = `Tasks: ${state.taskProgress}/${state.totalTasks}`;

    // Sabotage alert
    const sabAlert = document.getElementById('sabotage-alert');
    const sabText = document.getElementById('sabotage-text');
    if (state.sabotage) {
      sabAlert.classList.remove('hidden');
      switch (state.sabotage) {
        case 'lights': sabText.textContent = 'LIGHTS OUT! Find the breaker!'; break;
        case 'wifi': sabText.textContent = 'WiFi DOWN! Tasks disabled!'; break;
        case 'coffee': sabText.textContent = 'COFFEE MACHINE BROKE! Moving slow!'; break;
        case 'fire_drill': sabText.textContent = 'FIRE DRILL! Everyone to lobby!'; break;
      }
    } else {
      sabAlert.classList.add('hidden');
    }

    // Use button (for tasks)
    const btnUse = document.getElementById('btn-use');
    if (state.nearbyTasks && state.nearbyTasks.length > 0 && state.alive && state.sabotage !== 'wifi') {
      btnUse.classList.remove('hidden');
    } else {
      btnUse.classList.add('hidden');
    }

    // Report button
    const btnReport = document.getElementById('btn-report');
    if (state.canReport && state.alive) {
      btnReport.classList.remove('hidden');
    } else {
      btnReport.classList.add('hidden');
    }

    // Kill button (impostor)
    if (role === 'impostor') {
      const btnKill = document.getElementById('btn-kill');
      if (state.canKill && state.alive) {
        btnKill.classList.remove('hidden');
        btnKill.disabled = false;
      } else {
        btnKill.classList.add('hidden');
      }

      // Kill cooldown (only show when alive)
      const cdEl = document.getElementById('kill-cooldown');
      if (state.killCooldown > 0 && state.alive) {
        cdEl.classList.remove('hidden');
        cdEl.textContent = `Kill: ${Math.ceil(state.killCooldown)}s`;
      } else {
        cdEl.classList.add('hidden');
      }

      // Vent button
      const btnVent = document.getElementById('btn-vent');
      if ((state.nearbyVent || state.inVent) && state.alive) {
        btnVent.classList.remove('hidden');
        btnVent.textContent = state.inVent ? 'EXIT CHUTE' : 'MAIL CHUTE';
      } else {
        btnVent.classList.add('hidden');
      }

      // Sabotage button
      const btnSab = document.getElementById('btn-sabotage');
      btnSab.classList.toggle('hidden', !state.alive || !!state.sabotage);
    }

    // Emergency button
    const btnEmergency = document.getElementById('btn-emergency');
    if (state.alive && state.emergencyMeetings > 0) {
      // Check if near the button location (lobby center-ish)
      const dx = 1200 - state.x;
      const dy = 900 - state.y;
      if (Math.sqrt(dx * dx + dy * dy) < 100) {
        btnEmergency.classList.remove('hidden');
      } else {
        btnEmergency.classList.add('hidden');
      }
    } else {
      btnEmergency.classList.add('hidden');
    }

    // Ghost overlay
    if (!state.alive) {
      document.getElementById('ghost-overlay').classList.remove('hidden');
      document.getElementById('btn-kill').classList.add('hidden');
      document.getElementById('btn-sabotage').classList.add('hidden');
      document.getElementById('btn-vent').classList.add('hidden');
      document.getElementById('btn-report').classList.add('hidden');
      document.getElementById('btn-emergency').classList.add('hidden');
    }
  }

  function showTaskList(tasks, completedTasks, taskDefs) {
    const overlay = document.getElementById('tasklist-overlay');
    const list = document.getElementById('task-list-items');
    list.innerHTML = '';

    tasks.forEach(taskId => {
      const def = taskDefs[taskId];
      if (!def) return;
      const done = completedTasks.includes(taskId);
      const li = document.createElement('li');
      li.className = done ? 'done' : '';
      li.innerHTML = `${done ? '✅' : '⬜'} ${def.name} <span class="task-room">${def.room.replace(/_/g, ' ')}</span>`;
      list.appendChild(li);
    });

    overlay.classList.toggle('hidden');
  }

  return { init, update, showTaskList };
})();
