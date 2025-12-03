import React, { useState, useEffect } from 'react';
import { AudioVisualizer } from '../AudioVisualizer';

interface StepProps {
  onNext: () => void;
  onPrev?: () => void;
}

const MicCheckVisual: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    
    const startMic = async () => {
      try {
        // Stop previous stream before starting new one
        stream?.getTracks().forEach(t => t.stop());
        
        const audioConstraints = selectedDeviceId === 'default' 
          ? true 
          : { deviceId: { exact: selectedDeviceId } };
        
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          audio: audioConstraints 
        });
        currentStream = newStream;
        setStream(newStream);
        
        const devs = await navigator.mediaDevices.enumerateDevices();
        setDevices(devs.filter(d => d.kind === 'audioinput'));
      } catch (err) {
        console.error("Mic Access Error", err);
      }
    };
    startMic();
    return () => {
      currentStream?.getTracks().forEach(t => t.stop());
    };
  }, [selectedDeviceId]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    // Stream update handled by effect
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Main Card */}
      <div className="w-80 bg-white rounded-2xl p-8 text-black shadow-2xl">
        <h3 className="text-lg font-bold mb-4">Do you see moving bars?</h3>
        
        <div className="h-16 bg-white rounded-lg flex items-center justify-center mb-6 overflow-hidden">
          {stream && <AudioVisualizer stream={stream} isRecording={true} barColor="#000000" />}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsMicModalOpen(true)}
            className="flex-1 py-2 bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            Change Mic
          </button>
        </div>
      </div>

      {/* Mic Selection Modal Overlay */}
      {isMicModalOpen && (
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-20 animate-fadeIn">
          <div className="w-80 bg-white border border-gray-200 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-sm">Select Input</h3>
              <button 
                onClick={() => setIsMicModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 cursor-pointer"
              >✕</button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {devices.map(device => (
                <div 
                  key={device.deviceId}
                  onClick={() => handleDeviceChange(device.deviceId)}
                  className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${
                    device.deviceId === selectedDeviceId 
                      ? 'bg-emerald-500/10 border border-emerald-500/50' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className="text-xs text-gray-800 truncate pr-4">
                    {device.label || `Microphone ${device.deviceId.slice(0,4)}`}
                  </span>
                  {device.deviceId === selectedDeviceId && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StepMicCheck: React.FC<StepProps> & { Visual: React.FC } = ({ onNext, onPrev }) => {
  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4 text-gray-900">
          Signal<br/>Check
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed mb-8">
          Speak naturally to verify the audio input level is adequate for transcription.
        </p>
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        {onPrev && (
          <button
            onClick={onPrev}
            className="px-6 py-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:text-emerald-600 hover:border-emerald-500 transition-all cursor-pointer"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
        >
          Looks Good
        </button>
      </div>
    </div>
  );
};

StepMicCheck.Visual = MicCheckVisual;
