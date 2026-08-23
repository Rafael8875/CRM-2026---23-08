import React from 'react';

export const SpaceBackground = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-task-dark">
      {/* Deep space gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-task-blue/5 via-task-dark to-task-dark" />
      
      {/* Dynamic Nebulas */}
      <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] animate-pulse duration-[15s]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-task-blue/5 rounded-full blur-[120px] animate-pulse delay-2000 duration-[12s]" />
      <div className="absolute top-[30%] right-[10%] w-[600px] h-[600px] bg-task-green/5 rounded-full blur-[100px] animate-pulse delay-5000 duration-[18s]" />
      
      {/* Stars Layer 1 (Static-ish) */}
      <div className="absolute inset-0">
        {[...Array(80)].map((_, i) => (
          <div
            key={`s1-${i}`}
            className="absolute bg-white rounded-full opacity-40"
            style={{
              width: Math.random() * 1.5 + 0.5 + 'px',
              height: Math.random() * 1.5 + 0.5 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
          />
        ))}
      </div>
      
      {/* Stars Layer 2 (Twinkling) */}
      <div className="absolute inset-0">
        {[...Array(40)].map((_, i) => (
          <div
            key={`s2-${i}`}
            className="absolute bg-white rounded-full animate-twinkle shadow-[0_0_5px_rgba(255,255,255,0.8)]"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 3 + 2 + 's',
            }}
          />
        ))}
      </div>
      
      {/* Stars Layer 3 (Tiny Twinkling) */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={`s3-${i}`}
            className="absolute bg-white rounded-full animate-twinkle opacity-30"
            style={{
              width: Math.random() * 1 + 0.2 + 'px',
              height: Math.random() * 1 + 0.2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 8 + 's',
              animationDuration: Math.random() * 5 + 3 + 's',
            }}
          />
        ))}
      </div>

      {/* Multiple Shooting Stars */}
      <div className="absolute top-[10%] left-[-5%] w-[180px] h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent rotate-[-30deg] animate-shooting-star" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[40%] right-[-5%] w-[150px] h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent rotate-[-45deg] animate-shooting-star" style={{ animationDelay: '7s' }} />
      <div className="absolute bottom-[20%] left-[10%] w-[200px] h-[1px] bg-gradient-to-r from-transparent via-task-blue/40 to-transparent rotate-[-20deg] animate-shooting-star" style={{ animationDelay: '12s' }} />
      
      {/* Cosmic Dust / Grain */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};
