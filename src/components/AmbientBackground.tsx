import React, { useEffect, useRef } from 'react';

interface AmbientBackgroundProps {
  subtle?: boolean;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ subtle = false }) => {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = nx * (subtle ? 16 : 24);
      targetY = ny * (subtle ? 16 : 24);
    };

    window.addEventListener('mousemove', handleMouseMove);

    function loop() {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      if (layerRef.current) {
        layerRef.current.style.transform = `translate(${-curX}px, ${-curY}px)`;
      }
      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [subtle]);

  const opacityClass = subtle ? 'opacity-40' : 'opacity-100';

  return (
    <div
      ref={layerRef}
      id="glowLayer"
      className={`fixed -inset-[10%] z-0 pointer-events-none transition-transform duration-400 ease-out ${opacityClass}`}
      aria-hidden="true"
    >
      {/* Glow 1: Top-Left Olive Radial Glow */}
      <div
        className="absolute rounded-full w-[620px] h-[620px] -top-[180px] -left-[140px] blur-[120px] animate-drift1"
        style={{
          background: 'radial-gradient(circle, rgba(124, 132, 80, 0.5), transparent 70%)',
        }}
      />

      {/* Glow 2: Bottom-Right Deep Olive Radial Glow */}
      <div
        className="absolute rounded-full w-[560px] h-[560px] -bottom-[200px] -right-[100px] blur-[120px] animate-drift2"
        style={{
          background: 'radial-gradient(circle, rgba(84, 90, 52, 0.5), transparent 70%)',
        }}
      />

      {/* Glow 3: Center-Right Muted Accent Glow */}
      <div
        className="absolute rounded-full w-[440px] h-[440px] top-[35%] right-[20%] blur-[140px] animate-drift3"
        style={{
          background: 'radial-gradient(circle, rgba(168, 173, 122, 0.2), transparent 70%)',
        }}
      />
    </div>
  );
};
