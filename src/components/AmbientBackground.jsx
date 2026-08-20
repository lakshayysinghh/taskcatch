import React, { useEffect, useRef } from 'react';

export function AmbientBackground() {
  const layerRef = useRef(null);

  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let animId;

    const handleMouseMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = nx * 24;
      targetY = ny * 24;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const loop = () => {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;

      if (layerRef.current) {
        layerRef.current.style.transform = `translate3d(${-curX}px, ${-curY}px, 0)`;
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="fixed inset-[-10%] z-0 pointer-events-none transition-transform ease-out will-change-transform"
    >
      {/* Glow Blob 1: Top-Left */}
      <div
        className="absolute rounded-full blur-[120px] animate-drift-1"
        style={{
          width: '620px',
          height: '620px',
          top: '-180px',
          left: '-140px',
          background: 'radial-gradient(circle, rgba(124,132,80,0.55), transparent 70%)',
        }}
      />

      {/* Glow Blob 2: Bottom-Right */}
      <div
        className="absolute rounded-full blur-[120px] animate-drift-2"
        style={{
          width: '560px',
          height: '560px',
          bottom: '-200px',
          right: '-100px',
          background: 'radial-gradient(circle, rgba(84,90,52,0.55), transparent 70%)',
        }}
      />

      {/* Glow Blob 3: Center Ambient */}
      <div
        className="absolute rounded-full blur-[120px] animate-drift-3"
        style={{
          width: '480px',
          height: '480px',
          top: '30%',
          left: '45%',
          background: 'radial-gradient(circle, rgba(168,173,122,0.28), transparent 70%)',
        }}
      />
    </div>
  );
}
