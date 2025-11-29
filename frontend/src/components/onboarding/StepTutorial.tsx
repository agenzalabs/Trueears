import React, { useState, useEffect } from 'react';
import { tauriAPI } from '../../utils/tauriApi';

interface StepProps {
  onNext: () => void;
}

// Event for syncing (Quick solution for decoupled layout)
const TUTORIAL_EVENT = 'scribe-tutorial-change';

const TutorialVisual: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => setActiveTab(e.detail);
    window.addEventListener(TUTORIAL_EVENT as any, handleTabChange);
    return () => window.removeEventListener(TUTORIAL_EVENT as any, handleTabChange);
  }, []);

  const handleTabClick = (idx: number) => {
    setActiveTab(idx);
    window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT, { detail: idx }));
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      {/* Tabs */}
      <div className="absolute top-8 flex gap-8 z-20">
        {['Message', 'Email', 'Note'].map((label, i) => (
          <button
            key={label}
            onClick={() => handleTabClick(i)}
            className={`text-[11px] font-bold uppercase tracking-wider pb-2 border-b-2 transition-all duration-300
              ${activeTab === i ? 'text-emerald-500 border-emerald-500' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* App Container */}
      <div className="relative w-[380px] h-[280px]">
        
        {/* Slack */}
        <div className={`absolute inset-0 bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-500 ease-out
          ${activeTab === 0 ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
          <div className="h-8 bg-[#f4f4f5] border-b border-[#e4e4e7] flex items-center px-3 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <div className="p-5 font-sans h-full relative flex flex-col">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex-shrink-0" />
              <div className="bg-[#f4f4f5] p-3 rounded-r-xl rounded-bl-xl text-xs text-gray-800">
                Hey, is Flow working for you?
              </div>
            </div>
            <div className="mt-auto mb-2 border border-gray-300 rounded-lg p-2 flex items-center focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white">
              <input 
                type="text" 
                placeholder="Hold keys to speak..." 
                className="w-full text-xs text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                autoFocus={activeTab === 0}
              />
              <div className="w-4 h-4 rounded bg-gray-200 ml-2" />
            </div>
          </div>
        </div>

        {/* Gmail */}
        <div className={`absolute inset-0 bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-500 ease-out
          ${activeTab === 1 ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
          <div className="h-8 bg-[#f4f4f5] border-b border-[#e4e4e7] flex items-center px-3 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
          <div className="p-6 font-sans text-gray-800 flex flex-col h-full">
            <div className="border-b pb-2 mb-2 text-xs text-gray-500">To: <span className="font-bold text-black">Greg</span></div>
            <div className="border-b pb-2 mb-4 text-xs text-gray-500">Subject: <span className="font-bold text-black">Quick Update</span></div>
            <textarea 
              className="w-full h-full resize-none outline-none text-xs leading-relaxed text-gray-800 placeholder-gray-300"
              placeholder="Type or dictate your email here..."
              defaultValue={"Hey Greg,\n\nI just confirmed the deployment."}
              autoFocus={activeTab === 1}
            />
          </div>
        </div>

        {/* Notion */}
        <div className={`absolute inset-0 bg-[#191919] rounded-xl shadow-2xl overflow-hidden transition-all duration-500 ease-out
          ${activeTab === 2 ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
          <div className="h-8 bg-[#252525] border-b border-[#333] flex items-center px-3 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#444]" />
          </div>
          <div className="p-8 font-sans text-gray-300 h-full flex flex-col">
                              <div className="text-2xl font-bold text-white mb-4">Smart Formatting</div>            <textarea 
              className="w-full h-full resize-none outline-none bg-transparent text-sm text-gray-300 placeholder-gray-600 leading-relaxed"
              placeholder="Dictate a note..."
              defaultValue={"- AI Integration\n- Voice UI\n- Native Rust Backend"}
              autoFocus={activeTab === 2}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export const StepTutorial: React.FC<StepProps> & { Visual: React.FC } = ({ onNext }) => {
  const [activeTab, setActiveTab] = useState(0);

  const content = [
    { 
      title: <>Send a<br/>Message</>, 
      desc: "Hold down the keys, speak, and let go to insert spoken text into any app instantly.",
      windowTitle: "Tutorial - Slack"
    },
    { 
      title: <>Draft an<br/>Email</>, 
      desc: "Flow automatically punctuates, formats, and fixes mistakes as you speak.",
      windowTitle: "Tutorial - Gmail"
    },
    { 
      title: <>Whisper a<br/>Note</>, 
      desc: "Flow works even when you whisper. It auto-formats lists and bullets.",
      windowTitle: "Tutorial - Notion"
    }
  ];

  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => setActiveTab(e.detail);
    window.addEventListener(TUTORIAL_EVENT as any, handleTabChange);
    
    // Set initial title
    tauriAPI.setWindowTitle(content[0].windowTitle);

    return () => {
      window.removeEventListener(TUTORIAL_EVENT as any, handleTabChange);
      // Reset title on unmount
      tauriAPI.setWindowTitle("Scribe Settings");
    };
  }, []);

  // Effect to update title when tab changes
  useEffect(() => {
    console.log('[StepTutorial] Active tab changed to:', activeTab, 'Setting title:', content[activeTab].windowTitle);
    tauriAPI.setWindowTitle(content[activeTab].windowTitle);
    
    // Set store value for RecorderOverlay override
    const modeMap = ['tutorial-slack', 'tutorial-gmail', 'tutorial-notion'];
    tauriAPI.setStoreValue('SCRIBE_TUTORIAL_MODE', modeMap[activeTab]);
  }, [activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        tauriAPI.setStoreValue('SCRIBE_TUTORIAL_MODE', '');
    };
  }, []);

  const changeTab = (idx: number) => {
    setActiveTab(idx);
    window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT, { detail: idx }));
  };

  const handleNextStep = () => {
    if (activeTab < 2) {
      changeTab(activeTab + 1);
    } else {
      onNext();
    }
  };

  const handlePrevStep = () => {
    if (activeTab > 0) {
      changeTab(activeTab - 1);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4 min-h-[80px]">
          {content[activeTab].title}
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed mb-8 min-h-[60px]">
          {content[activeTab].desc}
        </p>
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        <button
          onClick={handlePrevStep}
          disabled={activeTab === 0}
          className="px-6 py-4 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Prev
        </button>
        <button
          onClick={handleNextStep}
          className="flex-1 py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider bg-white text-black hover:bg-emerald-100 shadow-lg transition-all"
        >
          {activeTab === 2 ? 'Finish Setup' : 'Next Tip'}
        </button>
      </div>
    </div>
  );
};

StepTutorial.Visual = TutorialVisual;
