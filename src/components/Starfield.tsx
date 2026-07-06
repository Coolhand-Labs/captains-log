import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/**
 * Celebratory starfield for the reward screen. Purely decorative
 * (aria-hidden); static when the user prefers reduced motion.
 */
export function Starfield(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 0.6 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * star.speed * 2 + star.phase);
        ctx.globalAlpha = reducedMotion ? 0.8 : twinkle;
        ctx.fillStyle = '#e8ecf8';
        const y = reducedMotion ? star.y : (star.y + t * star.speed * 0.01) % 1;
        ctx.beginPath();
        ctx.arc(star.x * canvas.width, y * canvas.height, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reducedMotion) {
        t += 0.016;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} class="cl-starfield" aria-hidden="true" />;
}
