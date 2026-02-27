// ═══ Player — Bean character rendering ═══

// Polyfill for roundRect (Safari, older browsers)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    const radius = typeof r === 'object' ? r : { tl: r, tr: r, br: r, bl: r };
    const tl = radius.tl || 0, tr = radius.tr || 0, br = radius.br || 0, bl = radius.bl || 0;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

const Player = (() => {
  const ARCHETYPES = {
    intern:     { color: '#4CAF50', accent: '#388E3C', item: 'lanyard',    label: 'Intern' },
    manager:    { color: '#2196F3', accent: '#1565C0', item: 'tie',        label: 'Manager' },
    itguy:      { color: '#9C27B0', accent: '#6A1B9A', item: 'headset',    label: 'IT Guy' },
    hr:         { color: '#E91E63', accent: '#AD1457', item: 'clipboard',  label: 'HR Rep' },
    accountant: { color: '#78909C', accent: '#546E7A', item: 'calculator', label: 'Accountant' },
    sales:      { color: '#FF9800', accent: '#E65100', item: 'polo',       label: 'Sales Bro' },
    executive:  { color: '#F44336', accent: '#C62828', item: 'briefcase',  label: 'Executive' },
    designer:   { color: '#009688', accent: '#00695C', item: 'macbook',    label: 'Designer' },
  };

  // Draw a bean character on a canvas context
  function drawBean(ctx, x, y, archetype, scale = 1, options = {}) {
    const arch = ARCHETYPES[archetype] || ARCHETYPES.intern;
    const s = scale;
    const ghost = options.ghost || false;
    const dead = options.dead || false;
    const inVent = options.inVent || false;

    ctx.save();
    ctx.translate(x, y);
    if (ghost) ctx.globalAlpha = 0.4;
    if (inVent) ctx.globalAlpha = 0.6;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 22 * s, 16 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bean body
    ctx.fillStyle = arch.color;
    ctx.beginPath();
    ctx.moveTo(-15 * s, -20 * s);
    ctx.bezierCurveTo(-18 * s, -30 * s, 18 * s, -30 * s, 15 * s, -20 * s);
    ctx.lineTo(17 * s, 10 * s);
    ctx.bezierCurveTo(17 * s, 22 * s, 8 * s, 22 * s, 3 * s, 18 * s);
    ctx.lineTo(3 * s, 22 * s);
    ctx.bezierCurveTo(3 * s, 26 * s, -3 * s, 26 * s, -3 * s, 22 * s);
    ctx.lineTo(-3 * s, 18 * s);
    ctx.bezierCurveTo(-8 * s, 22 * s, -17 * s, 22 * s, -17 * s, 10 * s);
    ctx.closePath();
    ctx.fill();

    // Bean body outline
    ctx.strokeStyle = arch.accent;
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    // Backpack (Among Us style)
    ctx.fillStyle = arch.accent;
    ctx.beginPath();
    ctx.roundRect(-22 * s, -10 * s, 8 * s, 20 * s, 3 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    if (!dead) {
      // Visor
      ctx.fillStyle = '#B3E5FC';
      ctx.beginPath();
      ctx.moveTo(0, -18 * s);
      ctx.bezierCurveTo(14 * s, -18 * s, 18 * s, -6 * s, 10 * s, -4 * s);
      ctx.bezierCurveTo(4 * s, -2 * s, -2 * s, -8 * s, 0, -18 * s);
      ctx.closePath();
      ctx.fill();
      // Visor shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(8 * s, -14 * s, 3 * s, 2 * s, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Visor border
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(0, -18 * s);
      ctx.bezierCurveTo(14 * s, -18 * s, 18 * s, -6 * s, 10 * s, -4 * s);
      ctx.bezierCurveTo(4 * s, -2 * s, -2 * s, -8 * s, 0, -18 * s);
      ctx.stroke();

      // Draw corporate item
      drawItem(ctx, arch.item, s, arch);
    } else {
      // Dead body: no visor, bone sticking out
      ctx.fillStyle = '#eee';
      ctx.beginPath();
      ctx.ellipse(5 * s, -20 * s, 4 * s, 6 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawItem(ctx, item, s, arch) {
    ctx.save();
    switch (item) {
      case 'lanyard':
        // Badge lanyard
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(-2 * s, -22 * s);
        ctx.lineTo(-2 * s, 5 * s);
        ctx.stroke();
        ctx.fillStyle = '#FFF';
        ctx.fillRect(-6 * s, 2 * s, 8 * s, 10 * s);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(-4 * s, 5 * s, 4 * s, 3 * s);
        break;
      case 'tie':
        ctx.fillStyle = '#C62828';
        ctx.beginPath();
        ctx.moveTo(3 * s, -6 * s);
        ctx.lineTo(7 * s, 8 * s);
        ctx.lineTo(3 * s, 14 * s);
        ctx.lineTo(-1 * s, 8 * s);
        ctx.closePath();
        ctx.fill();
        break;
      case 'headset':
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        ctx.arc(0, -22 * s, 14 * s, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.ellipse(-14 * s, -18 * s, 4 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(14 * s, -18 * s, 4 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'clipboard':
        ctx.fillStyle = '#795548';
        ctx.fillRect(14 * s, -8 * s, 10 * s, 14 * s);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(15 * s, -5 * s, 8 * s, 10 * s);
        ctx.fillStyle = '#FFD54F';
        ctx.fillRect(17 * s, -10 * s, 4 * s, 3 * s);
        break;
      case 'calculator':
        ctx.fillStyle = '#37474F';
        ctx.fillRect(14 * s, -4 * s, 9 * s, 12 * s);
        ctx.fillStyle = '#4FC3F7';
        ctx.fillRect(15 * s, -3 * s, 7 * s, 4 * s);
        ctx.fillStyle = '#666';
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            ctx.fillRect((15 + c * 2.5) * s, (3 + r * 2.5) * s, 1.5 * s, 1.5 * s);
          }
        }
        break;
      case 'polo':
        // Popped collar
        ctx.fillStyle = arch.color;
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(-8 * s, -16 * s);
        ctx.lineTo(-4 * s, -24 * s);
        ctx.lineTo(0, -18 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(8 * s, -16 * s);
        ctx.lineTo(4 * s, -24 * s);
        ctx.lineTo(0, -18 * s);
        ctx.stroke();
        break;
      case 'briefcase':
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.roundRect(12 * s, 6 * s, 12 * s, 9 * s, 2 * s);
        ctx.fill();
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
        ctx.strokeStyle = '#8D6E63';
        ctx.beginPath();
        ctx.moveTo(16 * s, 6 * s);
        ctx.lineTo(16 * s, 3 * s);
        ctx.lineTo(20 * s, 3 * s);
        ctx.lineTo(20 * s, 6 * s);
        ctx.stroke();
        break;
      case 'macbook':
        ctx.fillStyle = '#B0BEC5';
        ctx.beginPath();
        ctx.roundRect(12 * s, 0, 12 * s, 8 * s, 1 * s);
        ctx.fill();
        ctx.fillStyle = '#90A4AE';
        ctx.fillRect(11 * s, 8 * s, 14 * s, 2 * s);
        // Apple-ish logo
        ctx.fillStyle = '#CFD8DC';
        ctx.beginPath();
        ctx.arc(18 * s, 4 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  // Draw bean onto a small canvas (for UI cards)
  function drawBeanToCanvas(canvas, archetype, options = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width || 70;
    const h = canvas.height || 88;
    ctx.clearRect(0, 0, w, h);
    const scale = Math.min(w / 50, h / 60) * 0.8;
    drawBean(ctx, w / 2, h / 2 + 2, archetype, scale, options);
  }

  function getArchetype(id) {
    return ARCHETYPES[id] || ARCHETYPES.intern;
  }

  return { drawBean, drawBeanToCanvas, getArchetype, ARCHETYPES };
})();
