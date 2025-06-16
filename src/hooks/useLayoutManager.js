import { useCallback, useEffect } from 'react';
import { layoutOptions } from '../utils/cytoscapeConfig';

const useLayoutManager = (cyRef, elements, currentLayout) => {
  // Safe function to apply layout
  const applyLayout = useCallback((layoutName) => {
    // Check if Cytoscape instance exists
    if (!cyRef.current) {
      console.warn('Cytoscape instance not available');
      return;
    }

    // Check if we have elements to layout
    if (!elements || elements.length === 0) {
      console.warn('No elements to layout');
      return;
    }

    try {
      // Double-check that Cytoscape has the elements loaded
      const cyElements = cyRef.current.elements();
      if (cyElements.length === 0) {
        console.warn('Cytoscape elements not loaded yet, retrying...');
        // Retry after a short delay
        setTimeout(() => applyLayout(layoutName), 50);
        return;
      }

      // Get the layout configuration
      const layoutConfig = layoutOptions[layoutName] || layoutOptions.preset;
      
      // Apply the layout safely
      const layout = cyRef.current.layout(layoutConfig);
      layout.run();
      
      console.log(`Layout '${layoutName}' applied successfully`);
    } catch (error) {
      console.error('Layout application failed:', error);
    }
  }, [cyRef, elements]);

  // Automatically apply layout when elements change
  useEffect(() => {
    if (elements.length > 0) {
      // Wait a bit for Cytoscape to fully load the elements
      const timer = setTimeout(() => {
        applyLayout(currentLayout);
      }, 150); // Slightly longer delay for safety

      // Cleanup timer if component unmounts or dependencies change
      return () => clearTimeout(timer);
    }
  }, [elements.length, currentLayout, applyLayout]);

  // Return the safe apply function for manual use
  return applyLayout;
};

export default useLayoutManager;