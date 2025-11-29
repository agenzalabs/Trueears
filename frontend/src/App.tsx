import React, { useEffect } from 'react';
import { RecorderOverlay } from './components/RecorderOverlay';

const App: React.FC = () => {
  useEffect(() => {
    // Force transparent background for the overlay window
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.getElementById('root')!.style.background = 'transparent';
  }, []);

  return (
    <>
      {/* The Overlay Component is the only thing we render */}
      <RecorderOverlay />
    </>
  );
};

export default App;