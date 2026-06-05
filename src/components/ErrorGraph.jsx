import React, { useRef, useEffect } from 'react';

const WINDOW_SECONDS = 15;
const PADDING = { top: 20, right: 20, bottom: 35, left: 55 };

export default function ErrorGraph({ history, targetAltitude }) {
  const canvasRef = useRef(null);
  const drawRef = useRef(() => {});

  // Keep the latest draw routine in a ref so the resize observer (set up once)
  // can repaint with current data without re-subscribing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;
      ctx.clearRect(0, 0, w, h);

      const innerW = w - PADDING.left - PADDING.right;
      const innerH = h - PADDING.top - PADDING.bottom;

      const target = targetAltitude || 5;
      const maxAlt = Math.max(target * 1.8, 8);
      const minAlt = -0.5;
      const altRange = maxAlt - minAlt;

      const currentTime = history && history.length > 0 ? history[history.length - 1].time : 0;
      const windowStart = Math.max(0, currentTime - WINDOW_SECONDS);

      const scaleX = (t) => PADDING.left + ((t - windowStart) / WINDOW_SECONDS) * innerW;
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
        const x = PADDING.left + (t / WINDOW_SECONDS) * innerW;
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
        const x = PADDING.left + (t / WINDOW_SECONDS) * innerW;
        ctx.fillText(Math.round(windowStart + t) + 's', x, PADDING.top + innerH + 5);
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

      // Target line + 5% settle band (always drawn so the goal is visible
      // even before a run starts)
      const targetY = scaleY(target);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, targetY);
      ctx.lineTo(PADDING.left + innerW, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00ff88';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Target', PADDING.left + innerW - 50, targetY - 4);

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

      if (!history || history.length < 2) return;

      const visible = history.filter(h => h.time >= windowStart);
      if (visible.length < 2) return;

      // Clip plotted data to the chart area so large overshoots don't bleed
      // over the axes/labels.
      ctx.save();
      ctx.beginPath();
      ctx.rect(PADDING.left, PADDING.top, innerW, innerH);
      ctx.clip();

      // Error fill (between target and actual)
      ctx.beginPath();
      ctx.moveTo(scaleX(visible[0].time), targetY);
      for (let i = 0; i < visible.length; i++) {
        ctx.lineTo(scaleX(visible[i].time), scaleY(visible[i].position));
      }
      ctx.lineTo(scaleX(visible[visible.length - 1].time), targetY);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, targetY, 0, PADDING.top);
      gradient.addColorStop(0, 'rgba(255, 71, 87, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 71, 87, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Glow under the position line
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const x = scaleX(visible[i].time);
        const y = scaleY(visible[i].position);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Actual position line
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const x = scaleX(visible[i].time);
        const y = scaleY(visible[i].position);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Current value marker + readouts
      const last = visible[visible.length - 1];
      const lastPx = scaleX(last.time);
      const lastPy = scaleY(last.position);

      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(lastPx, lastPy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(last.position.toFixed(2) + 'm', lastPx + 8, lastPy - 2);

      const err = Math.abs(last.error);
      ctx.fillStyle = err > 0.2 ? '#ff4757' : '#00ff88';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('err: ' + err.toFixed(2) + 'm', lastPx - 4, lastPy + 8);
    };

    drawRef.current = draw;
    draw();
  }, [history, targetAltitude]);

  // Size the canvas to its container and repaint on resize (set up once).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRef.current();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="error-graph">
      <canvas ref={canvasRef} />
    </div>
  );
}
