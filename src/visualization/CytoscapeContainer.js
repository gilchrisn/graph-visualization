// Fixed CytoscapeContainer.js with proper overflow handling

import React, { useRef, useEffect, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import fcose from 'cytoscape-fcose';
import { useVisualizationState } from '../core/AppStateManager';
import VisualizationEngine from '../core/VisualizationEngine';
import { 
  cytoscapeStylesheet, 
  layoutOptions, 
  setupCytoscapeEvents, 
  initializeCytoscape 
} from '../utils/cytoscapeConfig';
import { transformToCytoscapeElements } from '../utils/dataTransformers';
import { usePPRvizFisheye } from '../utils/structureAwareFisheye';

// Register Cytoscape extensions
initializeCytoscape(cytoscape, coseBilkent, fcose);

const CytoscapeContainer = ({ 
  elements = null,
  onNodeClick = null,
  onSupernodeNavigation = null,
  algorithm = null,
  style = { width: '100%', height: '600px' },
  className = ''
}) => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const { cytoscapeElements, layout, selectedNode } = useVisualizationState();
  
  // Use elements prop if provided, otherwise use from state
  const actualElements = elements || cytoscapeElements;

  // Fisheye state management
  const [fisheyeEnabled, setFisheyeEnabled] = React.useState(false);
  const [magnificationFactor, setMagnificationFactor] = React.useState(3.0);
  const [fisheyeStatus, setFisheyeStatus] = React.useState('Disabled');

  // Structure-aware fisheye hook
  const {
    initializeFisheye,
    applyFisheyeAt,
    resetFisheye,
    isFisheyeActive,
    lastError
  } = usePPRvizFisheye();

  // Convert raw data to Cytoscape elements if needed
  const processedElements = React.useMemo(() => {
    if (!actualElements || actualElements.length === 0) {
      return [];
    }

    // Check if elements are already in Cytoscape format
    if (actualElements[0] && actualElements[0].data) {
      return actualElements;
    }

    // Transform raw data to Cytoscape elements
    return transformToCytoscapeElements({ nodes: actualElements, edges: [] });
  }, [actualElements]);

  // Handle mouse move for fisheye
  const handleMouseMove = useCallback((event) => {
    if (!fisheyeEnabled || !isFisheyeActive) return;
    
    const renderedPosition = event.renderedPosition;
    if (renderedPosition) {
      const transformedElements = applyFisheyeAt(
        renderedPosition.x,
        renderedPosition.y,
        magnificationFactor
      );
      
      if (transformedElements) {
        setFisheyeStatus(`Fisheye applied at (${renderedPosition.x.toFixed(1)}, ${renderedPosition.y.toFixed(1)})`);
        
        // Apply fisheye transformation through VisualizationEngine
        VisualizationEngine.applyFisheye(transformedElements);
      }
    }
  }, [fisheyeEnabled, isFisheyeActive, applyFisheyeAt, magnificationFactor]);

  // Enhanced node click handler
  const handleNodeClickInternal = useCallback((event) => {
    const clickedNode = event.target;
    const nodeData = clickedNode.data();
    
    console.log(`Node clicked:`, nodeData);

    // Call external node click handler if provided
    if (onNodeClick) {
      onNodeClick(nodeData);
    }

    // Handle fisheye focus on click
    if (fisheyeEnabled && isFisheyeActive) {
      const position = clickedNode.renderedPosition();
      const transformedElements = applyFisheyeAt(
        position.x, 
        position.y, 
        magnificationFactor
      );
      
      if (transformedElements) {
        VisualizationEngine.applyFisheye(transformedElements);
        setFisheyeStatus(`Focused on node ${nodeData.id}`);
      }
    }

    // Handle supernode navigation
    if (nodeData.type === 'supernode' && onSupernodeNavigation) {
      // Add a small delay to allow user to see selection
      setTimeout(() => {
        if (window.confirm(`Navigate to supernode ${nodeData.id}?`)) {
          onSupernodeNavigation(nodeData.id);
        }
      }, 100);
    }
  }, [onNodeClick, onSupernodeNavigation, fisheyeEnabled, isFisheyeActive, applyFisheyeAt, magnificationFactor]);

  // Toggle fisheye
  const toggleFisheye = useCallback(() => {
    if (!fisheyeEnabled) {
      if (processedElements.length === 0) {
        setFisheyeStatus('No elements loaded');
        return;
      }

      setFisheyeStatus('Initializing structure-aware fisheye...');
      
      const initSuccess = initializeFisheye(processedElements);
      
      if (initSuccess) {
        setFisheyeEnabled(true);
        setFisheyeStatus('Structure-aware fisheye enabled');
      } else {
        setFisheyeStatus(`Failed to initialize: ${lastError || 'Unknown error'}`);
      }
    } else {
      setFisheyeStatus('Disabling fisheye...');
      
      const restoredElements = resetFisheye();
      if (restoredElements && restoredElements.length > 0) {
        // The elements will be restored through the visualization engine
        setFisheyeStatus('Fisheye disabled - original layout restored');
      }
      
      setFisheyeEnabled(false);
    }
  }, [fisheyeEnabled, processedElements, initializeFisheye, resetFisheye, lastError]);

  // Initialize VisualizationEngine when Cytoscape is ready
  const handleCytoscapeReady = useCallback((cy) => {
    cyRef.current = cy;
    
    // Initialize VisualizationEngine
    VisualizationEngine.initialize(
      cy,
      null, // layoutManager - can be added later
      null, // interactionHandler - can be added later  
      null  // elementTransformer - uses default
    );
    
    console.log('Cytoscape ready with', cy.elements().length, 'elements');
    
    // Setup events with enhanced handlers
    setupCytoscapeEvents(
      cyRef, 
      handleNodeClickInternal,
      null, // onNodeHover - can be added later
      fisheyeEnabled ? handleMouseMove : null
    );

    // FIXED: Ensure the graph fits within the container after initialization
    setTimeout(() => {
      if (cy && cy.elements().length > 0) {
        cy.fit(20); // Add padding to ensure elements are visible
        cy.center();
      }
    }, 100);
  }, [handleNodeClickInternal, fisheyeEnabled, handleMouseMove]);

  // Update events when fisheye state changes
  useEffect(() => {
    if (cyRef.current) {
      setupCytoscapeEvents(
        cyRef,
        handleNodeClickInternal,
        null,
        fisheyeEnabled ? handleMouseMove : null
      );
    }
  }, [fisheyeEnabled, handleNodeClickInternal, handleMouseMove]);

  // FIXED: Fit layout when elements change with proper container sizing
  useEffect(() => {
    if (cyRef.current && processedElements.length > 0) {
      setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.fit(30); // Increased padding for better visibility
          cyRef.current.center();
          
          // Force a resize to ensure proper container bounds
          cyRef.current.resize();
        }
      }, 200); // Increased timeout to ensure container is fully rendered
    }
  }, [processedElements.length]);

  // FIXED: Handle container resize for comparison mode
  useEffect(() => {
    const handleResize = () => {
      if (cyRef.current) {
        setTimeout(() => {
          cyRef.current.resize();
          if (cyRef.current.elements().length > 0) {
            cyRef.current.fit(30);
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FIXED: Show fisheye controls only in single mode (not in comparison mode)
  const showFisheyeControls = !algorithm; // algorithm prop is passed only in comparison mode

  return (
    <div 
      ref={containerRef}
      className={`cytoscape-container ${className}`} 
      style={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden' // FIXED: Prevent container overflow
      }}
    >
      {/* FIXED: Fisheye Controls - only show in single mode */}
      {showFisheyeControls && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
          <div className="fisheye-controls">
            <button
              onClick={toggleFisheye}
              disabled={processedElements.length === 0}
              style={{
                padding: '5px 10px',
                border: 'none',
                borderRadius: '3px',
                background: fisheyeEnabled ? '#dc3545' : '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {fisheyeEnabled ? 'Disable' : 'Enable'} Fisheye
            </button>
            
            {fisheyeEnabled && (
              <div style={{ marginTop: '5px', fontSize: '11px' }}>
                <label>
                  Mag: {magnificationFactor}x
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={magnificationFactor}
                    onChange={(e) => setMagnificationFactor(parseFloat(e.target.value))}
                    style={{ width: '60px', marginLeft: '5px' }}
                  />
                </label>
              </div>
            )}
            
            {fisheyeStatus && (
              <div style={{ 
                marginTop: '5px', 
                fontSize: '10px', 
                color: lastError ? '#dc3545' : '#6c757d',
                maxWidth: '150px',
                wordWrap: 'break-word'
              }}>
                {lastError ? `Error: ${lastError}` : fisheyeStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIXED: Cytoscape Component with proper container constraints */}
      <CytoscapeComponent
        elements={processedElements}
        stylesheet={cytoscapeStylesheet}
        layout={layoutOptions[layout] || layoutOptions.preset}
        style={{
          width: '100%',
          height: '100%',
          ...style, // Allow style override but maintain size constraints
          cursor: fisheyeEnabled ? 'crosshair' : 'default',
          display: 'block' // FIXED: Ensure block display for proper sizing
        }}
        cy={handleCytoscapeReady}
        // FIXED: Add Cytoscape-specific options for better container handling
        autoungrabify={false}
        autolock={false}
        autounselectify={false}
        boxSelectionEnabled={false}
        panningEnabled={true}
        userPanningEnabled={true}
        zoomingEnabled={true}
        userZoomingEnabled={true}
        wheelSensitivity={0.1}
      />

      {/* Element Count Indicator */}
      {processedElements.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '3px',
          fontSize: '12px',
          zIndex: 100
        }}>
          {processedElements.filter(el => !el.data.source).length} nodes, {' '}
          {processedElements.filter(el => el.data.source).length} edges
        </div>
      )}

      {/* FIXED: Debug info for comparison mode */}
      {algorithm && processedElements.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '5px',
          border: '1px solid #ddd',
          textAlign: 'center',
          fontSize: '14px',
          color: '#666'
        }}>
          <div>No visualization data loaded</div>
          <small className="text-muted">Algorithm: {algorithm}</small>
        </div>
      )}
    </div>
  );
};

export default CytoscapeContainer;