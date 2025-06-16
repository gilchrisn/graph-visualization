// src/utils/cytoscapeConfig.js - Enhanced with fisheye support

/**
 * Enhanced stylesheet for Cytoscape with fisheye-specific styles
 */
export const cytoscapeStylesheet = [
  // Base node styles (reverted to original)
  {
    selector: 'node',
    style: {
      'background-color': '#3498db', // Brighter, more visible blue
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '1px', 
      'min-zoomed-font-size': '4px', // Hide text when zoomed out too far
      'color': '#000',
      'text-outline-color': '#222',
      'width': function(ele){ return ele.data('size') || 20; }, 
      'height': function(ele){ return ele.data('size') || 20; }
    }
  },
  
  // Supernode styles (simplified)
  {
    selector: 'node.supernode',
    style: {
      'background-color': '#007bff',
      'border-width': 0,
      'border-color': '#0056b3'
    }
  },
  
  // Leaf node styles (simplified)
  {
    selector: 'node.leaf',
    style: {
      'background-color': '#28a745'
    }
  },
  
  // Selected node styles (toned down)
  {
    selector: 'node:selected',
    style: {
      'background-color': '#ffc107', // Changed from red to yellow
      'border-width': 2,
      'border-color': '#ff6b6b'
    }
  },

  // Base edge styles (reverted to original)
  {
    selector: 'edge',
    style: {
      'width': 0.1,
      'line-color': '#adb5bd',
      'curve-style': 'bezier'
    }
  },

  // Highlighted edges (original style)
  {
    selector: 'edge.highlighted',
    style: {
      'width': 0.3,
      'line-color': '#dc3545'
    }
  }
];

/**
 * Enhanced layout options with fisheye considerations
 */
export const layoutOptions = {
  preset: {
    name: 'preset',
    fit: true,
    padding: 50,
    animate: false, // Disable animation for fisheye responsiveness
    animationDuration: 0
  },
  cose: {
    name: 'cose-bilkent',
    idealEdgeLength: 100,
    nodeOverlap: 20,
    refresh: 20,
    fit: true,
    padding: 50,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: 400000,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    tile: true,
    animate: false, // Disabled for fisheye compatibility
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10
  },
  fcose: {
    name: 'fcose',
    quality: 'default',
    randomize: false,
    fit: true,
    padding: 50,
    nodeDimensionsIncludeLabels: false,
    uniformNodeDimensions: false,
    packComponents: true,
    nodeRepulsion: 4500,
    idealEdgeLength: 50,
    edgeElasticity: 0.45,
    numIter: 2500,
    animate: false // Disabled for fisheye compatibility
  }
};

/**
 * Enhanced event handlers for Cytoscape with fisheye support
 * @param {Object} cyRef - Reference to Cytoscape instance
 * @param {Function} onNodeClick - Function to handle node click events
 * @param {Function} onNodeHover - Function to handle node hover events
 * @param {Function} onMouseMove - Function to handle mouse move events (for fisheye)
 */
export const setupCytoscapeEvents = (cyRef, onNodeClick, onNodeHover, onMouseMove) => {
  if (!cyRef.current) return;
  
  const cy = cyRef.current;
  
  // Remove existing event listeners
  cy.removeListener('tap');
  cy.removeListener('mouseover');
  cy.removeListener('mouseout');
  cy.removeListener('mousemove');
  cy.removeListener('cxttap'); // Right click
  cy.removeListener('zoom');
  cy.removeListener('pan');
  
  // Add enhanced event listeners
  if (onNodeClick) {
    cy.on('tap', 'node', onNodeClick);
  }
  
  if (onNodeHover) {
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      node.addClass('hovered');
      onNodeHover(event, true);
    });
    
    cy.on('mouseout', 'node', (event) => {
      const node = event.target;
      node.removeClass('hovered');
      onNodeHover(event, false);
    });
  }

  // ✨ NEW: Enhanced mouse move handling for fisheye
  if (onMouseMove) {
    cy.on('mousemove', (event) => {
      // Throttle mouse move events for performance
      if (!cy._lastMouseMove || Date.now() - cy._lastMouseMove > 16) { // ~60 FPS
        cy._lastMouseMove = Date.now();
        onMouseMove(event);
      }
    });
  }

  // ✨ NEW: Handle zoom/pan events to update fisheye
  cy.on('zoom pan', (event) => {
    // Notify that viewport changed (can be used to adjust fisheye)
    if (cy._onViewportChange) {
      cy._onViewportChange(event);
    }
  });

  // ✨ NEW: Right-click context menu placeholder
  cy.on('cxttap', 'node', (event) => {
    event.preventDefault();
    const node = event.target;
    console.log('Right-clicked node:', node.id());
    // Can be extended with context menu functionality
  });

  // ✨ NEW: Double-click to focus fisheye
  cy.on('dblclick', 'node', (event) => {
    const node = event.target;
    const position = node.renderedPosition();
    
    if (cy._onFisheyeFocus) {
      cy._onFisheyeFocus(position.x, position.y, node);
    }
  });
  
  // Return a cleanup function
  return () => {
    if (cy) {
      cy.removeListener('tap');
      cy.removeListener('mouseover');
      cy.removeListener('mouseout');
      cy.removeListener('mousemove');
      cy.removeListener('cxttap');
      cy.removeListener('zoom');
      cy.removeListener('pan');
      cy.removeListener('dblclick');
    }
  };
};

/**
 * Enhanced Cytoscape initialization with fisheye extensions
 * @param {Object} cytoscape - Cytoscape library
 * @param {Object} coseBilkent - Cose-Bilkent layout extension
 * @param {Object} fcose - FCose layout extension
 */
export const initializeCytoscape = (cytoscape, coseBilkent, fcose) => {
  if (coseBilkent) {
    cytoscape.use(coseBilkent);
  }
  
  if (fcose) {
    cytoscape.use(fcose);
  }

  // ✨ NEW: Add fisheye-specific extensions
  if (cytoscape) {
    // Custom extension for fisheye coordinate updates
    cytoscape('core', 'updateFisheyePositions', function(elements) {
      if (!elements || elements.length === 0) return this;
      
      this.batch(() => {
        elements.forEach(element => {
          if (element.position && element.data && element.data.id) {
            const cyElement = this.getElementById(element.data.id);
            if (cyElement.length > 0) {
              cyElement.position(element.position);
            }
          }
        });
      });
      
      return this;
    });

    // Custom extension for fisheye mode toggle
    cytoscape('core', 'setFisheyeMode', function(enabled) {
      if (enabled) {
        this.addClass('fisheye-mode');
        this.elements().addClass('fisheye-active');
      } else {
        this.removeClass('fisheye-mode');
        this.elements().removeClass('fisheye-active in-focus out-focus');
      }
      return this;
    });

    // Custom extension for focus highlighting
    cytoscape('core', 'updateFisheyeFocus', function(focusPoint, radius = 100) {
      this.elements().removeClass('in-focus out-focus');
      
      this.nodes().forEach(node => {
        const pos = node.renderedPosition();
        const distance = Math.sqrt(
          Math.pow(pos.x - focusPoint.x, 2) + Math.pow(pos.y - focusPoint.y, 2)
        );
        
        if (distance <= radius) {
          node.addClass('in-focus');
        } else {
          node.addClass('out-focus');
        }
      });
      
      return this;
    });
  }
};

/**
 * ✨ NEW: Fisheye-specific utility functions
 */
export const fisheyeUtils = {
  /**
   * Convert screen coordinates to Cytoscape coordinates
   */
  screenToGraphCoordinates: (cy, screenX, screenY) => {
    if (!cy) return { x: 0, y: 0 };
    
    const pan = cy.pan();
    const zoom = cy.zoom();
    const container = cy.container();
    const containerRect = container.getBoundingClientRect();
    
    return {
      x: (screenX - containerRect.left - pan.x) / zoom,
      y: (screenY - containerRect.top - pan.y) / zoom
    };
  },

  /**
   * Convert Cytoscape coordinates to screen coordinates
   */
  graphToScreenCoordinates: (cy, graphX, graphY) => {
    if (!cy) return { x: 0, y: 0 };
    
    const pan = cy.pan();
    const zoom = cy.zoom();
    const container = cy.container();
    const containerRect = container.getBoundingClientRect();
    
    return {
      x: graphX * zoom + pan.x + containerRect.left,
      y: graphY * zoom + pan.y + containerRect.top
    };
  },

  /**
   * Get nodes within a radius of a point
   */
  getNodesInRadius: (cy, centerX, centerY, radius) => {
    if (!cy) return [];
    
    return cy.nodes().filter(node => {
      const pos = node.position();
      const distance = Math.sqrt(
        Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
      );
      return distance <= radius;
    });
  },

  /**
   * Smoothly animate to new positions
   */
  animateToPositions: (cy, elements, duration = 300) => {
    if (!cy || !elements) return Promise.resolve();
    
    return new Promise((resolve) => {
      const animation = cy.elements().animate({
        position: function(ele) {
          const newElement = elements.find(el => el.data.id === ele.id());
          return newElement ? newElement.position : ele.position();
        }
      }, {
        duration: duration,
        easing: 'ease-out-cubic',
        complete: resolve
      });
    });
  }
};