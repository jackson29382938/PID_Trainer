import React, { useRef, useEffect } from 'react';

const WINDOW_SECONDS = 15;
const PADDING = { top: 20, right: 20, bottom: 35, left: 55 };

export default function ErrorGraph({ history, targetAltitude }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const innerW = w - PADDING.left - PADDING.right;
      const innerH = h - PADDING.top - PADDING.bottom;

      const target = targetAltitude || 5;
      const maxAlt = Math.max(target * 1.8, 8);
      const minAlt = -0.5;
      const altRange = maxAlt - minAlt;

      const scaleX = (t) => PADDING.left + (t / WINDOW_SECONDS) * innerW;
      const scaleY = (a) => PADDING.top + innerH - ((a - minAlt) / altRange) * innerH;

      // Background
      ctx.fillStyle = '#0d1420';
      ctx.fillRect(PADDING.left, PADDING.top, innerW, innerH);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let alt = 0; alt <= maxAlt; alt += 1) {
        const y = scaleY(alt);
        ctx.beginPath();
        ctx.moveTo(PADDING.left, y);
        ctx.lineTo(PADDING.left + innerW, y);
        ctx.stroke();
      }
      for (let t = 0; t <= WINDOW_SECONDS; t += 1) {
        const x = scaleX(t);
        ctx.beginPath();
        ctx.moveTo(x, PADDING.top);
        ctx.lineTo(x, PADDING.top + innerH);
        ctx.stroke();
      }

      // Axis labels
      ctx.fillStyle = '#8892b0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let alt = 0; alt <= maxAlt; alt += 1) {
        const y = scaleY(alt);
        ctx.fillText(alt.toFixed(1), PADDING.left - 8, y);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let t = 0; t <= WINDOW_SECONDS; t += 2) {
        const x = scaleX(t);
        ctx.fillText(t + 's', x, PADDING.top + innerH + 5);
      }

      // Axis titles
      ctx.fillStyle = '#5a6480';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Time (s)', PADDING.left + innerW / 2, h - 12);
      ctx.save();
      ctx.translate(12, PADDING.top + innerH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Altitude (m)', 0, 0);
      ctx.restore();

      if (!history || history.length < 2) return;

      const currentTime = history[history.length - 1].time;
      const windowStart = Math.max(0, currentTime - WINDOW_SECONDS);
      const visible = history.filter(h => h.time >= windowStart);

      if (visible.length < 2) return;

      // Target line
      const targetX1 = scaleX(0);
      const targetX2 = scaleX(WINDOW_SECONDS);
      const targetY = scaleY(target);

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(targetX1, targetY);
      ctx.lineTo(targetX2, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target label
      ctx.fillStyle = '#00ff88';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Target', targetX2 - 50, targetY - 4);

      // Error fill (between target and actual)
      const tMin = visible[0].time;
      const relToWindow = (t) => (t - windowStart) / WINDOW_SECONDS;

      ctx.beginPath();
      const firstErrY = scaleY(target);
      ctx.moveTo(scaleX(relToWindow(visible[0].time) * WINDOW_SECONDS), firstErrY);
      for (let i = 0; i < visible.length; i++) {
        const x = scaleX(relToWindow(visible[i].time) * WINDOW_SECONDS);
        const y = scaleY(visible[i].position);
        ctx.lineTo(x, y);
      }
      const lastX = scaleX(relToWindow(visible[visible.length - 1].time) * WINDOW_SECONDS);
      ctx.lineTo(lastX, firstErrY);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, targetY, 0, PADDING.top);
      gradient.addColorStop(0, 'rgba(255, 71, 87, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 71, 87, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Actual position line
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const x = scaleX(relToWindow(visible[i].time) * WINDOW_SECONDS);
        const y = scaleY(visible[i].position);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow effect on position line
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const x = scaleX(relToWindow(visible[i].time) * WINDOW_SECONDS);
        const y = scaleY(visible[i].position);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Current value marker
      if (visible.length > 0) {
        const last = visible[visible.length - 1];
        const lastPx = scaleX(relToWindow(last.time) * WINDOW_SECONDS);
        const lastPy = scaleY(last.position);

        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(lastPx, lastPy, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00d4ff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(last.position.toFixed(2) + 'm', lastPx + 8, lastPy - 2);

        // Current error
        const err = Math.abs(last.error);
        ctx.fillStyle = err > 0.2 ? '#ff4757' : '#00ff88';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('err: ' + err.toFixed(2) + 'm', lastPx - 4, lastPy + 8);
      }

      // 5% band
      const band5 = target * 0.05;
      const bandTop = scaleY(target + band5);
      const bandBot = scaleY(target - band5);
      ctx.fillStyle = 'rgba(0, 255, 136, 0.04)';
      ctx.fillRect(PADDING.left, bandTop, innerW, bandBot - bandTop);

      ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, bandTop);
      ctx.lineTo(PADDING.left + innerW, bandTop);
      ctx.moveTo(PADDING.left, bandBot);
      ctx.lineTo(PADDING.left + innerW, bandBot);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [history, targetAltitude]);

  return (
    <div className="error-graph">
      <canvas ref={canvasRef} />
    </div>
  );
}
