import React from 'react';
import { useAppState, useAppMode } from '../core/AppStateManager';
import SingleModeView from './SingleModeView';
import ComparisonModeView from './ComparisonModeView';

const ModeContainer = () => {
  const mode = useAppMode();
  const { state } = useAppState();
  
  console.log(`ModeContainer: Rendering ${mode} mode`);

  // Route to appropriate mode
  switch (mode) {
    case 'comparison':
      return <ComparisonModeView />;
    case 'single':
    default:
      return <SingleModeView />;
  }
};

export default ModeContainer;