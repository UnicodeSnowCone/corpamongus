// ═══ Map — Office map rendering ═══
const GameMap = (() => {
  let mapData = null;

  function setMapData(data) {
    mapData = data;
  }

  function draw(ctx, cameraX, cameraY, canvasW, canvasH, vision, sabotage) {
    if (!mapData) return;

    ctx.save();
    ctx.translate(-cameraX + canvasW / 2, -cameraY + canvasH / 2);

    // Draw rooms
    for (const room of mapData.rooms) {
      // Room fill
      ctx.fillStyle = room.color;
      ctx.fillRect(room.x, room.y, room.w, room.h);

      // Room border/walls
      ctx.strokeStyle = room.borderColor;
      ctx.lineWidth = 12;
      ctx.strokeRect(room.x + 6, room.y + 6, room.w - 12, room.h - 12);

      // Room floor pattern (subtle grid)
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (let gx = room.x + 40; gx < room.x + room.w; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, room.y + 12);
        ctx.lineTo(gx, room.y + room.h - 12);
        ctx.stroke();
      }
      for (let gy = room.y + 40; gy < room.y + room.h; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(room.x + 12, gy);
        ctx.lineTo(room.x + room.w - 12, gy);
        ctx.stroke();
      }

      // Room name
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.font = 'bold 18px Fredoka One, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name.toUpperCase(), room.x + room.w / 2, room.y + room.h / 2);

      // Emergency button in lobby
      if (room.hasEmergencyButton) {
        drawEmergencyButton(ctx, 1200, 900);
      }
    }

    // Draw doors
    for (const door of mapData.doors) {
      ctx.fillStyle = '#FFECB3';
      if (door.w > door.h) {
        // Horizontal door
        ctx.fillRect(door.x - 10, door.y - 8, door.w + 20, 28);
      } else {
        // Vertical door
        ctx.fillRect(door.x - 8, door.y - 10, 28, door.h + 20);
      }
    }

    // Draw vents (mail chutes)
    if (mapData.vents) {
      for (const vent of mapData.vents) {
        drawVent(ctx, vent.x, vent.y);
      }
    }

    // Draw task locations
    if (mapData.tasks) {
      for (const [taskId, task] of Object.entries(mapData.tasks)) {
        drawTaskMarker(ctx, task.x, task.y);
      }
    }

    ctx.restore();
  }

  function drawEmergencyButton(ctx, x, y) {
    // Table
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Button
    ctx.fillStyle = '#F44336';
    ctx.beginPath();
    ctx.arc(x, y - 5, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.arc(x, y - 5, 10, 0, Math.PI * 2);
    ctx.fill();
    // Text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 6px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIRE', x, y - 7);
    ctx.fillText('ALARM', x, y - 1);
  }

  function drawVent(ctx, x, y) {
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.roundRect(x - 20, y - 15, 40, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#546E7A';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Slats
    ctx.strokeStyle = '#455A64';
    ctx.lineWidth = 2;
    for (let i = -8; i <= 8; i += 4) {
      ctx.beginPath();
      ctx.moveTo(x - 15, y + i);
      ctx.lineTo(x + 15, y + i);
      ctx.stroke();
    }
    // Label
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 7px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAIL', x, y + 22);
  }

  function drawTaskMarker(ctx, x, y) {
    // Yellow exclamation mark
    ctx.fillStyle = 'rgba(255,193,7,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFC107';
    ctx.font = 'bold 16px Fredoka One, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y);
    ctx.textBaseline = 'alphabetic';
  }

  function drawFogOfWar(ctx, playerX, playerY, cameraX, cameraY, canvasW, canvasH, vision) {
    ctx.save();
    // Create radial gradient mask
    const screenX = playerX - cameraX + canvasW / 2;
    const screenY = playerY - cameraY + canvasH / 2;

    ctx.globalCompositeOperation = 'destination-in';
    const gradient = ctx.createRadialGradient(screenX, screenY, vision * 0.3, screenX, screenY, vision);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function drawMinimap(canvas, playerX, playerY, tasks, completedTasks) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!mapData) return;

    const scaleX = w / mapData.width;
    const scaleY = h / mapData.height;
    const scale = Math.min(scaleX, scaleY);
    const ox = (w - mapData.width * scale) / 2;
    const oy = (h - mapData.height * scale) / 2;

    // Draw rooms
    for (const room of mapData.rooms) {
      ctx.fillStyle = room.color;
      ctx.fillRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
      ctx.strokeStyle = room.borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
      // Name
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.font = 'bold 8px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, ox + (room.x + room.w / 2) * scale, oy + (room.y + room.h / 2) * scale + 3);
    }

    // Draw doors
    for (const door of mapData.doors) {
      ctx.fillStyle = '#FFECB3';
      ctx.fillRect(ox + door.x * scale - 2, oy + door.y * scale - 2, Math.max(door.w * scale, 4) + 4, Math.max(door.h * scale, 4) + 4);
    }

    // Draw task markers
    if (tasks) {
      for (const taskId of tasks) {
        const task = mapData.tasks[taskId];
        if (task) {
          const done = completedTasks && completedTasks.includes(taskId);
          ctx.fillStyle = done ? '#4CAF50' : '#FFC107';
          ctx.beginPath();
          ctx.arc(ox + task.x * scale, oy + task.y * scale, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw player position
    ctx.fillStyle = '#FF1744';
    ctx.beginPath();
    ctx.arc(ox + playerX * scale, oy + playerY * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  return { setMapData, draw, drawFogOfWar, drawMinimap };
})();
