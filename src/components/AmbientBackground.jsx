import React from 'react';

/**
 * Static ambient backdrop: a soft olive aura, a faint grid and a fade into the
 * canvas. Pure CSS — no animation-frame loop running while the app idles in
 * the tray. The aura's slow drift is skipped under prefers-reduced-motion.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.045]" />
      <div className="absolute -top-[340px] left-1/2 h-[760px] w-[1200px] animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(180,187,130,0.17),rgba(180,187,130,0.05)_55%,transparent)] blur-2xl motion-reduce:animate-none" />
      <div className="absolute -right-[180px] top-[45%] h-[520px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(128,135,79,0.09),transparent)] blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[#0a0b09]" />
    </div>
  );
}
