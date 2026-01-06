import React, { useState } from 'react';
import { StepConnect } from './StepConnect';
import { StepLanguage } from './StepLanguage';
import { StepPermissions } from './StepPermissions';
import { StepMicCheck } from './StepMicCheck';
import { StepTrigger } from './StepTrigger';
import { StepTutorial } from './StepTutorial';
import { StepSignIn } from './StepSignIn';
import { StepSuccess } from './StepSuccess';
import { useSettings } from '../../hooks/useSettings';

type Step = 'signin' | 'connect' | 'language' | 'permissions' | 'mic-check' | 'trigger' | 'tutorial' | 'success';

export interface OnboardingWizardProps {
  initialStep?: Step;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ initialStep = 'signin' }) => {
  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const { markOnboardingComplete } = useSettings();

  const steps: Step[] = ['signin', 'connect', 'language', 'permissions', 'mic-check', 'trigger', 'tutorial', 'success'];
  const currentIndex = steps.indexOf(currentStep);

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleFinish = () => {
    markOnboardingComplete();
    window.location.reload();
  };

  // Progress bar logic (Success step hides progress bar)
  const progressSteps = [
    { id: 'signin', label: 'Account' },
    { id: 'connect', label: 'Connect' },
    { id: 'language', label: 'Language' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'mic-check', label: 'Microphone' },
    { id: 'trigger', label: 'Shortcut' },
    { id: 'tutorial', label: 'Tutorial' }
  ];

  const getActiveProgressIndex = () => {
    if (currentStep === 'signin') return 0;
    if (currentStep === 'connect') return 1;
    if (currentStep === 'language') return 2;
    if (currentStep === 'permissions') return 3;
    if (currentStep === 'mic-check') return 4;
    if (currentStep === 'trigger') return 5;
    if (currentStep === 'tutorial') return 6;
    return 7; // Success
  };

  const activeProgressIndex = getActiveProgressIndex();

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-gray-800 font-sans overflow-hidden p-8">
      {/* Main Modal Container */}
      <div className="relative w-[960px] h-[640px] bg-[#f8fafc] border border-gray-200 rounded-3xl shadow-[0_0_120px_-30px_rgba(16,185,129,0.05)] flex overflow-hidden">

        {currentStep === 'success' ? (
          <StepSuccess onNext={handleFinish} />
        ) : (
          <>
            {/* Left Panel - Interactive */}
            <div className="w-[42%] p-12 flex flex-col border-r border-gray-100 bg-white relative z-10">

              {/* Progress Header */}
              <div className="flex items-center w-full justify-between mb-12">
                {progressSteps.map((step, idx) => {
                  const isActive = idx === activeProgressIndex;
                  const isCompleted = idx < activeProgressIndex;

                  return (
                    <React.Fragment key={step.id}>
                      <div className={`flex items-center gap-2 transition-colors duration-300 ${isActive ? 'text-gray-900' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full bg-current ${isActive ? 'shadow-[0_0_0_3px_rgba(16,185,129,0.2)] bg-emerald-500' : ''}`} />
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-widest">{step.label}</span>
                        )}
                      </div>
                      {idx < progressSteps.length - 1 && (
                        <div className={`h-px flex-1 mx-2 ${idx < activeProgressIndex ? 'bg-emerald-500/30' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step Content */}
              <div className="flex-1 flex flex-col relative">
                {currentStep === 'connect' && <StepConnect onNext={handleNext} />}
                {currentStep === 'language' && <StepLanguage onNext={handleNext} onPrev={handlePrev} />}
                {currentStep === 'permissions' && <StepPermissions onNext={handleNext} onPrev={handlePrev} />}
                {currentStep === 'mic-check' && <StepMicCheck onNext={handleNext} onPrev={handlePrev} />}
                {currentStep === 'trigger' && <StepTrigger onNext={handleNext} onPrev={handlePrev} />}
                {currentStep === 'tutorial' && <StepTutorial onNext={handleNext} onPrev={handlePrev} />}
                {currentStep === 'signin' && <StepSignIn onNext={handleNext} onPrev={handlePrev} />}
              </div>

            </div>

            {/* Right Panel - Visuals */}
            <div className="w-[58%] bg-[#f8fafc] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.15) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                  maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                }}
              />

              <div className="relative w-full h-full flex items-center justify-center p-12">
                {currentStep === 'connect' && <StepConnect.Visual />}
                {currentStep === 'language' && <StepLanguage.Visual />}
                {currentStep === 'permissions' && <StepPermissions.Visual />}
                {currentStep === 'mic-check' && <StepMicCheck.Visual />}
                {currentStep === 'trigger' && <StepTrigger.Visual />}
                {currentStep === 'tutorial' && <StepTutorial.Visual />}
                {currentStep === 'signin' && <StepSignIn.Visual />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
