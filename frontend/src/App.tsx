import React, { useEffect } from 'react';
import { RecorderOverlay } from './components/RecorderOverlay';

const App: React.FC = () => {
  useEffect(() => {
    const background = 'transparent';

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
