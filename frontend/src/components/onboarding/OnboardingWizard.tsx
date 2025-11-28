import React, { useState } from 'react';
import { StepConnect } from './StepConnect';
import { StepPermissions } from './StepPermissions';
import { StepMicCheck } from './StepMicCheck';
import { StepTrigger } from './StepTrigger';
import { StepTutorial } from './StepTutorial';
import { StepSuccess } from './StepSuccess';
import { useSettings } from '../../hooks/useSettings';

type Step = 'connect' | 'permissions' | 'mic-check' | 'trigger' | 'tutorial' | 'success';

export const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('connect');
  const { markOnboardingComplete } = useSettings();

  const steps: Step[] = ['connect', 'permissions', 'mic-check', 'trigger', 'tutorial', 'success'];
  const currentIndex = steps.indexOf(currentStep);

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    markOnboardingComplete();
    window.location.reload();
  };

  // Progress bar logic (Success step hides progress bar)
  const progressSteps = [
    { id: 'connect', label: 'Connect' },
    { id: 'permissions', label: 'Perms' },
    { id: 'setup', label: 'Set Up' },
    { id: 'tutorial', label: 'Learn' }
  ];

  const getActiveProgressIndex = () => {
    if (currentStep === 'connect') return 0;
    if (currentStep === 'permissions') return 1;
    if (currentStep === 'mic-check' || currentStep === 'trigger') return 2;
    if (currentStep === 'tutorial') return 3;
    return 4; // Success
  };

  const activeProgressIndex = getActiveProgressIndex();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#000] text-white font-sans overflow-hidden p-8">
      {/* Main Modal Container */}
      <div className="relative w-[960px] h-[640px] bg-[#050505] border border-white/10 rounded-3xl shadow-[0_0_120px_-30px_rgba(16,185,129,0.05)] flex overflow-hidden">
        
        {currentStep === 'success' ? (
          <StepSuccess onNext={handleFinish} />
        ) : (
          <>
            {/* Left Panel - Interactive */}
            <div className="w-[42%] p-12 flex flex-col border-r border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#050505] relative z-10">
              
              {/* Progress Header */}
              <div className="flex items-center gap-3 mb-12 opacity-80">
                {progressSteps.map((step, idx) => {
                  const isActive = idx === activeProgressIndex;
                  const isCompleted = idx < activeProgressIndex;
                  
                  return (
                    <React.Fragment key={step.id}>
                      <div className={`flex items-center gap-2 transition-colors duration-300 ${isActive ? 'text-white' : isCompleted ? 'text-emerald-500' : 'text-[#444]'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full bg-current ${isActive ? 'shadow-[0_0_0_3px_rgba(16,185,129,0.2)] bg-emerald-500' : ''}`} />
                        {(isActive || isCompleted) && (
                          <span className="text-[10px] font-bold uppercase tracking-widest">{step.label}</span>
                        )}
                      </div>
                      {idx < progressSteps.length - 1 && (
                        <div className={`h-[1px] w-6 ${idx < activeProgressIndex ? 'bg-emerald-500/30' : 'bg-[#222]'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step Content */}
              <div className="flex-1 flex flex-col relative">
                {currentStep === 'connect' && <StepConnect onNext={handleNext} />}
                {currentStep === 'permissions' && <StepPermissions onNext={handleNext} />}
                {currentStep === 'mic-check' && <StepMicCheck onNext={handleNext} />}
                {currentStep === 'trigger' && <StepTrigger onNext={handleNext} />}
                {currentStep === 'tutorial' && <StepTutorial onNext={handleNext} />}
              </div>

            </div>

            {/* Right Panel - Visuals */}
            <div className="w-[58%] bg-[#020202] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-40 pointer-events-none" 
                   style={{ 
                     backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.15) 1px, transparent 1px)',
                     backgroundSize: '40px 40px',
                     maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                   }} 
              />
              
              <div className="relative w-full h-full flex items-center justify-center p-12">
                 {currentStep === 'connect' && <StepConnect.Visual />}
                 {currentStep === 'permissions' && <StepPermissions.Visual />}
                 {currentStep === 'mic-check' && <StepMicCheck.Visual />}
                 {currentStep === 'trigger' && <StepTrigger.Visual />}
                 {currentStep === 'tutorial' && <StepTutorial.Visual />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
