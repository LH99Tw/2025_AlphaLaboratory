import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

interface NeuralFieldProps {
  intensity?: number;
  className?: string;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const CanvasWrapper = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: -2;
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  filter: blur(0.4px) saturate(120%);
  mix-blend-mode: screen;
  opacity: 0.6;
`;

export const NeuralField: React.FC<NeuralFieldProps> = ({ intensity = 0.8, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      return;
    }

    const dpi = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpi;
      canvas.height = height * dpi;
      ctx.scale(dpi, dpi);
    };

    resize();

    const nodeCount = Math.floor((width * height) / 12000 * intensity + 24);
    const nodes: Node[] = Array.from({ length: nodeCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0.08)');
      gradient.addColorStop(0.5, 'rgba(138, 180, 248, 0.05)');
      gradient.addColorStop(1, 'rgba(16, 24, 56, 0.08)');

      nodes.forEach((node, index) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) {
          node.vx *= -1;
        }
        if (node.y < 0 || node.y > height) {
          node.vy *= -1;
        }

        for (let i = index + 1; i < nodes.length; i++) {
          const other = nodes[i];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.6 * intensity;
            ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      });

      nodes.forEach((node) => {
        const radius = 1.5 + Math.random() * 1.5;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = window.requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
      nodes.forEach((node) => {
        node.x = Math.random() * width;
        node.y = Math.random() * height;
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity]);

  return (
    <CanvasWrapper className={className}>
      <Canvas ref={canvasRef} />
    </CanvasWrapper>
  );
};
