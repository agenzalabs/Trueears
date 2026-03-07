import React, { useEffect } from 'react';
import { RecorderOverlay } from './components/RecorderOverlay';

const App: React.FC = () => {
  useEffect(() => {
    const isLinux = navigator.userAgent.toLowerCase().includes('linux');
    const background = isLinux ? '#0b0f14' : 'transparent';

    document.documentElement.style.background = background;
    document.body.style.background = background;
    document.getElementById('root')!.style.background = background;
  }, []);

  return (
    <>
      {/* The Overlay Component is the only thing we render */}
      <RecorderOverlay />
    </>
  );
};

export default App;
