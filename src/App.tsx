import React from 'react';
import { RecorderOverlay } from './components/RecorderOverlay';

const App: React.FC = () => {
  return (
    <>
      {/* The Overlay Component is the only thing we render */}
      <RecorderOverlay />
    </>
  );
};

export default App;