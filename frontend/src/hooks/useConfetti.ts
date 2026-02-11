import { useCallback, useRef } from 'react';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
  '#5f27cd', '#00d2d3', '#1dd1a1', '#ff6b6b', '#c8d6e5'
];

const SHAPES = ['square', 'circle', 'triangle'];

export const useConfetti = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animationRef = useRef<number | null>(null);

  const createCanvas = useCallback(() => {
    if (canvasRef.current) return canvasRef.current;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    document.body.appendChild(canvas);
    canvasRef.current = canvas;
    
    return canvas;
  }, []);

  const createParticle = useCallback((x: number, y: number): ConfettiParticle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 15 + 5;
    
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    };
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gravity = 0.3;
    const friction = 0.98;
    const fadeSpeed = 0.008;

    particlesRef.current = particlesRef.current.filter(particle => {
      particle.vy += gravity;
      particle.vx *= friction;
      particle.vy *= friction;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;
      particle.opacity -= fadeSpeed;

      if (particle.opacity <= 0 || particle.y > canvas.height + 50) {
        return false;
      }

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.rotation * Math.PI) / 180);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;

      // Draw shape
      const halfSize = particle.size / 2;
      ctx.beginPath();
      if (Math.random() > 0.5) {
        // Square
        ctx.fillRect(-halfSize, -halfSize, particle.size, particle.size);
      } else {
        // Circle
        ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return true;
    });

    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Cleanup canvas when done
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    }
  }, []);

  const fire = useCallback((options?: { 
    x?: number; 
    y?: number; 
    particleCount?: number;
    spread?: number;
  }) => {
    const canvas = createCanvas();
    
    const centerX = options?.x ?? canvas.width / 2;
    const centerY = options?.y ?? canvas.height / 3;
    const particleCount = options?.particleCount ?? 150;
    const spread = options?.spread ?? 100;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const x = centerX + (Math.random() - 0.5) * spread;
      const y = centerY + (Math.random() - 0.5) * spread;
      particlesRef.current.push(createParticle(x, y));
    }

    // Start animation if not already running
    if (!animationRef.current) {
      animate();
    }
  }, [createCanvas, createParticle, animate]);

  const burst = useCallback(() => {
    const canvas = createCanvas();
    
    // Fire from multiple positions for a grand celebration
    const positions = [
      { x: canvas.width * 0.25, y: canvas.height * 0.4 },
      { x: canvas.width * 0.5, y: canvas.height * 0.3 },
      { x: canvas.width * 0.75, y: canvas.height * 0.4 },
    ];

    positions.forEach((pos, index) => {
      setTimeout(() => {
        fire({ x: pos.x, y: pos.y, particleCount: 80 });
      }, index * 150);
    });
  }, [createCanvas, fire]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    particlesRef.current = [];
    if (canvasRef.current) {
      document.body.removeChild(canvasRef.current);
      canvasRef.current = null;
    }
  }, []);

  return { fire, burst, stop };
};

export default useConfetti;
