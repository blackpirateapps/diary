import React, { useState, useEffect, useRef } from 'react';
import { X, Play, CheckCircle2 } from 'lucide-react';
import { db } from '../db';

const MeditationPage = ({ navigate }) => {
  const [phase, setPhase] = useState('select'); // select, active, complete
  const [targetDuration, setTargetDuration] = useState(0); // in seconds
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  // Ref to track actual start time for accurate logging
  const startTimeRef = useRef(null);

  // Timer Logic
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Timer finished naturally
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startSession = (minutes) => {
    const seconds = minutes * 60;
    setTargetDuration(seconds);
    setTimeLeft(seconds);
    setPhase('active');
    setIsActive(true);
    startTimeRef.current = Date.now();
  };

  const handleFinish = async () => {
    setIsActive(false);
    setPhase('complete');
    
    // Calculate actual duration (in case they stopped early, or exact timing)
    const endTime = Date.now();
    const actualDurationSeconds = Math.round((endTime - startTimeRef.current) / 1000);
    
    // Only save if they meditated for at least 10 seconds
    if (actualDurationSeconds > 10) {
      try {
        await db.meditation_sessions.add({
          startTime: startTimeRef.current,
          duration: actualDurationSeconds
        });
      } catch (error) {
        console.error("Failed to save session", error);
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col relative overflow-hidden animate-fadeIn">
      
      {/* Background Ambience (Visual Only) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header / Exit */}
      <div className="relative z-10 p-6 flex justify-between items-center">
        <h1 className="text-xl font-medium tracking-wide text-gray-200">Breathe</h1>
        <button 
          onClick={() => navigate('more')} 
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">
        
        {/* PHASE 1: SELECTION */}
        {phase === 'select' && (
          <div className="w-full max-w-sm space-y-8 animate-slideUp">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-light">Choose Duration</h2>
              <p className="text-gray-400">Take a moment to center yourself.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[5, 10, 15].map((min) => (
                <button
                  key={min}
                  onClick={() => startSession(min)}
                  className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 p-6 rounded-2xl transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-medium">{min} Minutes</span>
                    <Play size={20} className="text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 2: ACTIVE TIMER */}
        {phase === 'active' && (
          <div className="flex flex-col items-center justify-center w-full h-full space-y-12">
            
            {/* Breathing Animation Circle */}
            <div className="relative flex items-center justify-center">
              {/* Outer Glows */}
              <div className="absolute w-64 h-64 bg-purple-500/30 rounded-full blur-2xl animate-breathing-slow"></div>
              <div className="absolute w-48 h-48 bg-blue-500/30 rounded-full blur-xl animate-breathing-delayed"></div>
              
              {/* Core Circle */}
              <div className="w-40 h-40 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center shadow-2xl relative z-10">
                <span className="text-4xl font-light tracking-widest font-mono">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-gray-400 text-sm tracking-widest uppercase animate-pulse">
                Inhale ... Exhale
              </p>
              
              <button 
                onClick={handleFinish}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: COMPLETE */}
        {phase === 'complete' && (
          <div className="text-center space-y-6 animate-scaleIn">
            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={40} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Session Complete</h2>
              <p className="text-gray-400">Your mind is clearer now.</p>
            </div>

            <button 
              onClick={() => navigate('more')}
              className="w-full max-w-xs bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Return to Journal
            </button>
          </div>
        )}

      </div>

      {/* CSS for Breathing Animation */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 0.2; }
        }
        .animate-breathing-slow {
          animation: breathe 8s infinite ease-in-out;
        }
        .animate-breathing-delayed {
          animation: breathe 8s infinite ease-in-out;
          animation-delay: 4s;
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MeditationPage;