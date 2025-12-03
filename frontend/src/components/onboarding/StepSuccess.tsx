import React, { useEffect, useRef } from 'react';

interface StepProps {
  onNext: () => void;
}

const ConfettiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600; // Right panel width roughly
    canvas.height = 640;

    const colors = ['#3b82f6', '#ef4444', '#eab308', '#10b981']; // Blue, Red, Yellow, Green
    const pieces: any[] = [];

    // Spawn large confetti
    for (let i = 0; i < 50; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height, // Start above
        w: Math.random() * 20 + 10, // Width 10-30px
        h: Math.random() * 30 + 15, // Height 15-45px
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2,
        spin: Math.random() * 0.1 - 0.05
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      pieces.forEach(p => {
        p.y += p.speed;
        p.angle += p.spin;
        
        if (p.y > canvas.height) {
          p.y = -50; // Loop
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />;
};

export const StepSuccess: React.FC<StepProps> = ({ onNext }) => {
  return (
    <div className="h-full w-full flex relative">
      
      {/* Left Panel (Interactive) */}
      <div className="w-[42%] p-12 flex flex-col border-r border-gray-100 bg-white relative z-10">
        {/* Fake Nav for consistency */}
        <div className="flex gap-3 mb-12 opacity-40">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
           <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Complete</div>
        </div>

        <div className="flex-1">
          <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-600 mb-6 tracking-wide">
            SETUP COMPLETE
          </div>
          
          <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-6 text-gray-900">
            You've unlocked<br/>
            Scribe <span className="text-emerald-600">Pro</span> 🎉
          </h1>

          <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">
            Enjoy unlimited access to context-aware dictation.
          </p>

          <ul className="space-y-3 text-sm text-gray-500 font-medium">
            <li className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Unlimited LPU™ Inference
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              App-Specific Formatting
            </li>
            <li className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Global Hotkey Access
            </li>
          </ul>
        </div>

        <div className="mt-auto pt-8">
          <button
            onClick={onNext}
            className="w-full py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
          >
            Enter Scribe
          </button>
        </div>
      </div>

      {/* Right Panel (Visual) */}
      <div className="w-[58%] bg-[#f8fafc] relative overflow-hidden flex items-center justify-center">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" 
             style={{ 
               backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.15) 1px, transparent 1px)',
               backgroundSize: '40px 40px',
               maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
             }} 
        />
        
        <ConfettiCanvas />

        {/* Logo Card */}
        <div className="relative z-10 flex items-center gap-4 animate-[scaleIn_0.5s_cubic-bezier(0.2,0.8,0.2,1)]">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
             <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
             </svg>
          </div>
          <div className="text-5xl font-['Syne'] font-extrabold text-gray-800 tracking-tighter">
            Scribe <span className="bg-emerald-500 text-black px-2 rounded-lg text-3xl align-middle ml-1">PRO</span>
          </div>
        </div>

      </div>

    </div>
  );
};