import React, { useEffect, useState } from 'react';
import { StepConnect } from './StepConnect';
import { StepLanguage } from './StepLanguage';
import { StepPermissions } from './StepPermissions';
import { StepMicCheck } from './StepMicCheck';
import { StepTrigger } from './StepTrigger';
import { StepTutorial } from './StepTutorial';
import { StepSignIn } from './StepSignIn';
import { StepSuccess } from './StepSuccess';
import { useSettings } from '../../hooks/useSettings';
import { tauriAPI } from '../../utils/tauriApi';

type Step =
  | 'signin'
  | 'connect'
  | 'language'
  | 'permissions'
  | 'mic-check'
  | 'trigger'
  | 'tutorial'
  | 'success';

const ONBOARDING_STEPS: Step[] = [
  'signin',
  'connect',
  'language',
  'permissions',
  'mic-check',
  'trigger',
  'tutorial',
  'success',
];

// Persisted resume point so closing the app mid-onboarding doesn't restart from step 1.
const ONBOARDING_STEP_STORAGE_KEY = 'Trueears_ONBOARDING_STEP';

const isValidStep = (value: string | null | undefined): value is Step =>
  value != null && (ONBOARDING_STEPS as string[]).includes(value);

export interface OnboardingWizardProps {
  initialStep?: Step;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ initialStep }) => {
  // A resume run is a fresh onboarding (no explicit step requested). When the caller
  // asks for a specific step (e.g. 'permissions' after a later permission revocation)
  // we honour it and skip the resume/persist logic.
  const shouldResume = initialStep == null;
  const [currentStep, setCurrentStep] = useState<Step>(initialStep ?? 'signin');
  const [isHydrated, setIsHydrated] = useState(!shouldResume);
  const [triggerActiveKeys, setTriggerActiveKeys] = useState<Set<string>>(() => new Set());
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [tutorialActiveTab, setTutorialActiveTab] = useState(0);
  const { markOnboardingComplete } = useSettings();

  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);

  useEffect(() => {
    if (currentStep === 'trigger') {
      setTriggerActiveKeys(new Set());
      setTriggerSuccess(false);
    }

    if (currentStep === 'tutorial') {
      setTutorialActiveTab(0);
    }
  }, [currentStep]);

  // Restore a persisted resume point on mount (fresh onboarding only).
  useEffect(() => {
    if (!shouldResume) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await tauriAPI.getStoreValue(ONBOARDING_STEP_STORAGE_KEY);
        if (!cancelled && isValidStep(saved)) {
          setCurrentStep(saved);
        }
      } catch (err) {
        console.error('[OnboardingWizard] Failed to restore onboarding step:', err);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldResume]);

  // Persist progress as the user advances so it survives an app restart.
  useEffect(() => {
    if (!shouldResume || !isHydrated) return;
    void tauriAPI
      .setStoreValue(ONBOARDING_STEP_STORAGE_KEY, currentStep)
      .catch((err) => {
        console.error('[OnboardingWizard] Failed to persist onboarding step:', err);
      });
  }, [shouldResume, isHydrated, currentStep]);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex + 1]);
      return;
    }

    void handleFinish();
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex - 1]);
    }
  };

  const handleFinish = async () => {
    try {
      // Persist completion BEFORE reloading. Previously this wasn't awaited, so the
      // reload could race the async store write and re-show onboarding from step 1.
      await markOnboardingComplete();
      if (shouldResume) {
        await tauriAPI.setStoreValue(ONBOARDING_STEP_STORAGE_KEY, '');
      }
    } catch (err) {
      console.error('[OnboardingWizard] Failed to finalize onboarding:', err);
    } finally {
      window.location.reload();
    }
  };

  const progressSteps = [
    { id: 'signin', label: 'Account' },
    { id: 'connect', label: 'Connect' },
    { id: 'language', label: 'Language' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'mic-check', label: 'Microphone' },
    { id: 'trigger', label: 'Shortcut' },
    { id: 'tutorial', label: 'Tutorial' },
  ];

  const getActiveProgressIndex = () => {
    if (currentStep === 'signin') return 0;
    if (currentStep === 'connect') return 1;
    if (currentStep === 'language') return 2;
    if (currentStep === 'permissions') return 3;
    if (currentStep === 'mic-check') return 4;
    if (currentStep === 'trigger') return 5;
    if (currentStep === 'tutorial') return 6;
    return 7;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'connect':
        return <StepConnect onNext={handleNext} />;
      case 'language':
        return <StepLanguage onNext={handleNext} onPrev={handlePrev} />;
      case 'permissions':
        return <StepPermissions onNext={handleNext} onPrev={handlePrev} />;
      case 'mic-check':
        return <StepMicCheck onNext={handleNext} onPrev={handlePrev} />;
      case 'trigger':
        return (
          <StepTrigger
            onNext={handleNext}
            onPrev={handlePrev}
            setActiveKeys={setTriggerActiveKeys}
            success={triggerSuccess}
            setSuccess={setTriggerSuccess}
          />
        );
      case 'tutorial':
        return (
          <StepTutorial
            onNext={handleNext}
            onPrev={handlePrev}
            activeTab={tutorialActiveTab}
            onTabChange={setTutorialActiveTab}
          />
        );
      case 'signin':
        return <StepSignIn onNext={handleNext} onPrev={handlePrev} />;
      default:
        return null;
    }
  };

  const renderStepVisual = () => {
    switch (currentStep) {
      case 'connect':
        return <StepConnect.Visual />;
      case 'language':
        return <StepLanguage.Visual />;
      case 'permissions':
        return <StepPermissions.Visual />;
      case 'mic-check':
        return <StepMicCheck.Visual />;
      case 'trigger':
        return <StepTrigger.Visual activeKeys={triggerActiveKeys} />;
      case 'tutorial':
        return (
          <StepTutorial.Visual
            activeTab={tutorialActiveTab}
            onTabChange={setTutorialActiveTab}
          />
        );
      case 'signin':
        return <StepSignIn.Visual />;
      default:
        return null;
    }
  };

  const activeProgressIndex = getActiveProgressIndex();

  // Avoid flashing step 1 before the persisted resume point loads.
  if (!isHydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-gray-800 font-sans overflow-hidden p-8">
      <div className="relative w-[960px] h-[640px] bg-[#f8fafc] border border-gray-200 rounded-3xl shadow-[0_0_120px_-30px_rgba(16,185,129,0.05)] flex overflow-hidden">
        {currentStep === 'success' ? (
          <StepSuccess onNext={handleFinish} />
        ) : (
          <>
            <div className="w-[42%] p-12 flex flex-col border-r border-gray-100 bg-white relative z-10">
              <div className="flex items-center w-full justify-between mb-12">
                {progressSteps.map((step, index) => {
                  const isActive = index === activeProgressIndex;
                  const isCompleted = index < activeProgressIndex;

                  return (
                    <React.Fragment key={step.id}>
                      <div
                        className={`flex items-center gap-2 transition-colors duration-300 ${
                          isActive
                            ? 'text-gray-900'
                            : isCompleted
                              ? 'text-emerald-600'
                              : 'text-gray-400'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full bg-current ${
                            isActive
                              ? 'shadow-[0_0_0_3px_rgba(16,185,129,0.2)] bg-emerald-500'
                              : ''
                          }`}
                        />
                        {isActive ? (
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {step.label}
                          </span>
                        ) : null}
                      </div>
                      {index < progressSteps.length - 1 ? (
                        <div
                          className={`h-px flex-1 mx-2 ${
                            index < activeProgressIndex ? 'bg-emerald-500/30' : 'bg-gray-200'
                          }`}
                        />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="flex-1 flex flex-col relative">{renderStepContent()}</div>
            </div>

            <div className="w-[58%] bg-[#f8fafc] relative overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.15) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                  maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
                }}
              />

              <div className="relative w-full h-full flex items-center justify-center p-12">
                {renderStepVisual()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
