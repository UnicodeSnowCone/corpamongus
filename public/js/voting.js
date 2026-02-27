// ═══ Voting — All-Hands Meeting UI ═══
const Voting = (() => {
  let myId = null;
  let myVote = null;
  let timerInterval = null;
  let phase = 'discussion'; // discussion | voting

  function init(playerId) {
    myId = playerId;
  }

  function showMeeting(data) {
    myVote = null;
    phase = 'discussion';

    const screen = document.getElementById('screen-meeting');
    screen.classList.add('active');

    // Title
    const title = document.getElementById('meeting-title');
    const subtitle = document.getElementById('meeting-subtitle');
    if (data.type === 'emergency') {
      title.textContent = '🔔 EMERGENCY ALL-HANDS MEETING';
      subtitle.textContent = `Called by ${data.callerName}`;
    } else {
      title.textContent = '💀 BODY REPORTED!';
      subtitle.textContent = `${data.callerName} found a body!`;
    }

    renderPlayers(data.players, false);
    startTimer(data.discussionTime, 'Discussion');

    // Show chat, hide vote button
    document.getElementById('chat-area').style.display = 'block';
    document.getElementById('vote-area').classList.add('hidden');
    document.getElementById('chat-messages').innerHTML = '';

    // Chat send
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('btn-chat-send');
    chatSend.onclick = () => sendChat(chatInput);
    chatInput.onkeydown = (e) => {
      if (e.key === 'Enter') sendChat(chatInput);
    };
  }

  function sendChat(input) {
    const text = input.value.trim();
    if (text) {
      Network.send('chat', { text });
      input.value = '';
    }
  }

  function addChatMessage(msg) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-name" style="color:${getPlayerColor(msg.senderId)}">${msg.senderName}:</span>${escapeHtml(msg.text)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function startVoting(data) {
    phase = 'voting';
    startTimer(data.votingTime, 'Voting');
    document.getElementById('vote-area').classList.remove('hidden');

    // Enable clicking on players to vote
    document.querySelectorAll('.meeting-player:not(.dead)').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => {
        if (myVote) return;
        myVote = el.dataset.playerId;
        Network.send('vote', { targetId: myVote });
        el.classList.add('selected');
        document.querySelectorAll('.meeting-player').forEach(p => p.style.pointerEvents = 'none');
      };
    });

    document.getElementById('btn-skip-vote').onclick = () => {
      if (myVote) return;
      myVote = 'skip';
      Network.send('vote', { targetId: 'skip' });
      document.querySelectorAll('.meeting-player').forEach(p => p.style.pointerEvents = 'none');
    };
  }

  function onVoteCast(data) {
    // Show vote indicator
    const el = document.querySelector(`[data-player-id="${data.voterId}"]`);
    if (el) el.classList.add('voted');
  }

  function showResult(data) {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('screen-meeting').classList.remove('active');

    const screen = document.getElementById('screen-result');
    screen.classList.add('active');

    const resultText = document.getElementById('result-text');
    const resultRole = document.getElementById('result-role');
    const resultBean = document.getElementById('result-bean');

    if (data.skipped || data.tie) {
      resultText.textContent = data.tie ? 'It\'s a tie! No one was fired.' : 'Meeting adjourned. No one was fired.';
      resultRole.textContent = 'Back to work, everyone.';
      resultBean.innerHTML = '';
    } else if (data.ejected) {
      resultText.textContent = `${data.ejectedName} has been FIRED!`;
      resultRole.textContent = `They were ${data.ejectedRole === 'impostor' ? 'an Impostor' : 'a Crewmate'}.`;
      // Draw ejected bean
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 160;
      resultBean.innerHTML = '';
      resultBean.appendChild(canvas);
      // Find archetype from players
      const players = getAllPlayers();
      const ejectedPlayer = players.find(p => p.id === data.ejected);
      if (ejectedPlayer) {
        Player.drawBeanToCanvas(canvas, ejectedPlayer.archetype);
      }
    }

    // Auto-close after 4 seconds
    setTimeout(() => {
      screen.classList.remove('active');
    }, 4500);
  }

  function endMeeting(data) {
    document.getElementById('screen-meeting').classList.remove('active');
    document.getElementById('screen-result').classList.remove('active');
    if (timerInterval) clearInterval(timerInterval);
  }

  function renderPlayers(players, votingEnabled) {
    const container = document.getElementById('meeting-players');
    container.innerHTML = '';
    // Store for later reference
    window._meetingPlayers = players;

    players.forEach(p => {
      const div = document.createElement('div');
      div.className = 'meeting-player' + (p.alive ? '' : ' dead');
      div.dataset.playerId = p.id;

      const canvas = document.createElement('canvas');
      canvas.width = 35;
      canvas.height = 44;
      Player.drawBeanToCanvas(canvas, p.archetype, { dead: !p.alive });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'mp-name';
      nameSpan.textContent = p.name + (p.alive ? '' : ' 💀');

      div.appendChild(canvas);
      div.appendChild(nameSpan);
      container.appendChild(div);
    });
  }

  function startTimer(seconds, label) {
    if (timerInterval) clearInterval(timerInterval);
    let remaining = seconds;
    const timerEl = document.getElementById('meeting-timer');
    timerEl.textContent = `${label}: ${remaining}s`;
    timerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerEl.textContent = `${label}: Time's up!`;
      } else {
        timerEl.textContent = `${label}: ${remaining}s`;
      }
    }, 1000);
  }

  function getAllPlayers() {
    return window._meetingPlayers || [];
  }

  function getPlayerColor(playerId) {
    const players = getAllPlayers();
    const p = players.find(pl => pl.id === playerId);
    if (p) {
      const arch = Player.getArchetype(p.archetype);
      return arch.color;
    }
    return '#FFF';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { init, showMeeting, addChatMessage, startVoting, onVoteCast, showResult, endMeeting };
})();
