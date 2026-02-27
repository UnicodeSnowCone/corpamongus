// ═══ Tasks — Corporate mini-game interactions ═══
const Tasks = (() => {
  let currentTask = null;
  let taskState = {};
  let onComplete = null;

  const TASK_DEFS = {
    fix_printer: {
      name: 'Fix the Printer',
      emoji: '🖨️',
      instructions: 'The printer is jammed AGAIN. Click the flashing paper jams to clear them!',
      type: 'click_sequence',
      steps: 5,
    },
    expense_report: {
      name: 'Submit Expense Report',
      emoji: '🧾',
      instructions: 'Fill out the expense report. Choose the correct categories.',
      type: 'form',
      fields: [
        { label: 'Expense Type', type: 'select', options: ['Coffee', 'Taxi', 'Lunch', 'Office Supplies', 'Team Building'] },
        { label: 'Amount', type: 'number', answer: null },
        { label: 'Justification', type: 'select', options: ['Business Critical', 'Client Meeting', 'Team Morale', 'I Deserve It'] },
      ],
    },
    brew_coffee: {
      name: 'Brew Coffee',
      emoji: '☕',
      instructions: 'Make the perfect cup. Click the steps in order!',
      type: 'click_sequence',
      steps: 4,
    },
    book_room: {
      name: 'Book Conference Room',
      emoji: '📅',
      instructions: 'Find an available time slot and book it!',
      type: 'select_slot',
    },
    tps_report: {
      name: 'File TPS Report',
      emoji: '📋',
      instructions: 'Fill out the TPS report. Don\'t forget the cover sheet!',
      type: 'form',
      fields: [
        { label: 'Cover Sheet', type: 'select', options: ['Attached', 'Will Attach Later', 'What Cover Sheet?'] },
        { label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'ASAP'] },
        { label: 'Department', type: 'select', options: ['Engineering', 'Sales', 'Marketing', 'Finance'] },
      ],
    },
    reply_all: {
      name: 'Reply-All Email Chain',
      emoji: '📧',
      instructions: 'Choose the best reply to this increasingly unhinged email chain.',
      type: 'email_reply',
    },
    update_linkedin: {
      name: 'Update LinkedIn',
      emoji: '💼',
      instructions: 'Toggle the right buzzwords for your profile!',
      type: 'toggles',
      items: ['Synergy Expert', 'Thought Leader', 'Disruptive Innovator', 'Growth Hacker', 'Blockchain Enthusiast', 'AI Whisperer'],
      required: 3,
    },
    shred_docs: {
      name: 'Shred Documents',
      emoji: '📄',
      instructions: 'Feed all the documents into the shredder! Click fast!',
      type: 'click_sequence',
      steps: 6,
    },
    reboot_server: {
      name: 'Reboot the Server',
      emoji: '🖥️',
      instructions: 'Enter the command sequence to reboot the server.',
      type: 'click_sequence',
      steps: 4,
    },
    water_plant: {
      name: 'Water the Office Plant',
      emoji: '🌿',
      instructions: 'Click to water — but not too much!',
      type: 'click_sequence',
      steps: 3,
    },
  };

  const COFFEE_STEPS = ['☕ Add grounds', '💧 Add water', '⏱️ Wait for brew', '🥛 Add cream'];
  const PRINTER_STEPS = ['📄 Open tray', '🔧 Remove jam', '📄 Realign paper', '🔌 Reset', '✅ Print test page'];
  const SHRED_ICONS = ['📄', '📋', '📑', '📃', '🗃️', '📝'];
  const SERVER_STEPS = ['💻 Open terminal', '⌨️ Type sudo reboot', '🔑 Enter password', '✅ Confirm'];
  const PLANT_STEPS = ['🚿 Turn on water', '🌿 Pour gently', '✅ Perfect!'];

  const EMAIL_CHAIN = [
    { from: 'Karen (Marketing)', text: 'Hi all, who moved my yogurt from the fridge??' },
    { from: 'Bob (Sales)', text: 'Not me. But whoever took my stapler, I\'m watching you.' },
    { from: 'CEO', text: 'Can we please keep this professional? Also, free donuts in the break room.' },
    { from: 'Dave (IT)', text: 'The donuts crashed the microwave. Sending a ticket.' },
  ];

  const REPLIES = [
    { text: 'Sorry about the yogurt, Karen. Will replace it!', correct: true },
    { text: 'Reply-all: UNSUBSCRIBE', correct: false },
    { text: 'Has anyone tried turning the yogurt off and on again?', correct: false },
    { text: 'Per my last email, the yogurt situation is unacceptable.', correct: true },
  ];

  function openTask(taskId, completeFn) {
    const def = TASK_DEFS[taskId];
    if (!def) return;

    currentTask = taskId;
    onComplete = completeFn;
    taskState = { clicks: 0, selected: new Set(), fields: {} };

    const overlay = document.getElementById('task-overlay');
    const content = document.getElementById('task-content');
    overlay.classList.remove('hidden');

    let html = `<div class="task-game">
      <h3>${def.emoji} ${def.name}</h3>
      <p class="task-instructions">${def.instructions}</p>
      <div class="task-area" id="task-area">`;

    switch (def.type) {
      case 'click_sequence':
        html += buildClickSequence(taskId, def);
        break;
      case 'form':
        html += buildForm(def);
        break;
      case 'select_slot':
        html += buildSlotSelect();
        break;
      case 'email_reply':
        html += buildEmailReply();
        break;
      case 'toggles':
        html += buildToggles(def);
        break;
    }

    html += `</div>
      <button class="btn btn-secondary" id="task-cancel">CANCEL</button>
    </div>`;

    content.innerHTML = html;

    document.getElementById('task-cancel').onclick = () => closeTask();
    attachTaskHandlers(taskId, def);
  }

  function buildClickSequence(taskId, def) {
    const steps = getStepLabels(taskId);
    let html = '<div id="click-progress" style="margin-bottom:12px;font-weight:700;">Step 1 of ' + def.steps + '</div>';
    html += '<div id="click-area" style="position:relative;height:150px;">';
    html += buildClickTarget(0, steps[0]);
    html += '</div>';
    return html;
  }

  function getStepLabels(taskId) {
    switch (taskId) {
      case 'brew_coffee': return COFFEE_STEPS;
      case 'fix_printer': return PRINTER_STEPS;
      case 'shred_docs': return SHRED_ICONS;
      case 'reboot_server': return SERVER_STEPS;
      case 'water_plant': return PLANT_STEPS;
      default: return Array(10).fill('🔘');
    }
  }

  function buildClickTarget(index, label) {
    const x = 20 + Math.random() * 60;
    const y = 10 + Math.random() * 60;
    return `<div class="click-target" id="click-target" style="left:${x}%;top:${y}%">${label || '🔘'}</div>`;
  }

  function buildForm(def) {
    let html = '';
    def.fields.forEach((field, i) => {
      html += '<div class="form-field">';
      html += `<label>${field.label}:</label>`;
      if (field.type === 'select') {
        html += `<select data-field="${i}">`;
        html += '<option value="">Select...</option>';
        field.options.forEach(opt => {
          html += `<option value="${opt}">${opt}</option>`;
        });
        html += '</select>';
      } else {
        html += `<input type="number" data-field="${i}" placeholder="$0.00">`;
      }
      html += '</div>';
    });
    html += '<button class="btn btn-primary" id="task-submit" style="margin-top:12px;">SUBMIT</button>';
    return html;
  }

  function buildSlotSelect() {
    const times = ['9:00 AM', '10:30 AM', '11:00 AM', '1:00 PM', '2:30 PM', '3:00 PM'];
    const booked = new Set([1, 3]); // Pre-booked slots
    let html = '';
    times.forEach((time, i) => {
      if (booked.has(i)) {
        html += `<div class="time-slot" style="opacity:0.3;cursor:default;text-decoration:line-through;">${time} — BOOKED</div>`;
      } else {
        html += `<div class="time-slot" data-slot="${i}">${time} — Available</div>`;
      }
    });
    return html;
  }

  function buildEmailReply() {
    let html = '<div style="text-align:left;margin-bottom:16px;">';
    EMAIL_CHAIN.forEach(msg => {
      html += `<div style="margin:6px 0;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;">`;
      html += `<strong style="color:#FFC107;">${msg.from}:</strong> ${msg.text}`;
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="font-weight:700;margin-bottom:8px;">Choose your reply:</div>';
    REPLIES.forEach((reply, i) => {
      html += `<div class="time-slot" data-reply="${i}" style="text-align:left;font-size:0.85rem;">${reply.text}</div>`;
    });
    return html;
  }

  function buildToggles(def) {
    let html = `<p style="font-size:0.8rem;color:#a0a0c0;margin-bottom:10px;">Select exactly ${def.required} buzzwords</p>`;
    def.items.forEach((item, i) => {
      html += `<div class="toggle-row" data-toggle="${i}">
        <div class="toggle-check" id="toggle-${i}"></div>
        <span>${item}</span>
      </div>`;
    });
    html += '<button class="btn btn-primary" id="task-submit" style="margin-top:12px;" disabled>UPDATE PROFILE</button>';
    return html;
  }

  function attachTaskHandlers(taskId, def) {
    switch (def.type) {
      case 'click_sequence': {
        const steps = getStepLabels(taskId);
        const area = document.getElementById('click-area');
        area.addEventListener('click', (e) => {
          if (e.target.classList.contains('click-target')) {
            taskState.clicks++;
            if (taskState.clicks >= def.steps) {
              completeTask();
            } else {
              document.getElementById('click-progress').textContent = `Step ${taskState.clicks + 1} of ${def.steps}`;
              area.innerHTML = buildClickTarget(taskState.clicks, steps[taskState.clicks] || '🔘');
            }
          }
        });
        break;
      }
      case 'form': {
        document.getElementById('task-submit').onclick = () => {
          const selects = document.querySelectorAll('[data-field]');
          let allFilled = true;
          selects.forEach(s => {
            if (!s.value) allFilled = false;
          });
          if (allFilled) completeTask();
        };
        break;
      }
      case 'select_slot': {
        document.querySelectorAll('[data-slot]').forEach(el => {
          el.onclick = () => completeTask();
        });
        break;
      }
      case 'email_reply': {
        document.querySelectorAll('[data-reply]').forEach(el => {
          el.onclick = () => completeTask();
        });
        break;
      }
      case 'toggles': {
        document.querySelectorAll('[data-toggle]').forEach(el => {
          el.onclick = () => {
            const idx = el.dataset.toggle;
            const check = document.getElementById(`toggle-${idx}`);
            if (taskState.selected.has(idx)) {
              taskState.selected.delete(idx);
              check.classList.remove('active');
              check.textContent = '';
            } else {
              taskState.selected.add(idx);
              check.classList.add('active');
              check.textContent = '✓';
            }
            const btn = document.getElementById('task-submit');
            btn.disabled = taskState.selected.size !== def.required;
          };
        });
        document.getElementById('task-submit').onclick = () => {
          if (taskState.selected.size === def.required) completeTask();
        };
        break;
      }
    }
  }

  function completeTask() {
    if (onComplete) onComplete(currentTask);
    closeTask();
  }

  function closeTask() {
    currentTask = null;
    document.getElementById('task-overlay').classList.add('hidden');
  }

  function isOpen() {
    return currentTask !== null;
  }

  return { openTask, closeTask, isOpen, TASK_DEFS };
})();
