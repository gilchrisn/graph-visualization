// src/visualization/InteractionHandler.js - User interactions (clicks, navigation)

class InteractionHandler {
  constructor() {
    this.cytoscapeInstance = null;
    this.handlers = {
      nodeClick: null,
      nodeHover: null,
      nodeRightClick: null,
      edgeClick: null,
      backgroundClick: null,
      zoom: null,
      pan: null
    };
    this.eventListeners = [];
  }

  /**
   * Initialize interaction handler
   */
  initialize(cytoscapeInstance, handlers = {}) {
    this.cytoscapeInstance = cytoscapeInstance;
    this.handlers = { ...this.handlers, ...handlers };
    
    this.setupEvents();
    console.log('InteractionHandler initialized');
  }

  /**
   * Setup all event listeners
   */
  setupEvents() {
    if (!this.cytoscapeInstance) return;

    const cy = this.cytoscapeInstance;
    
    // Remove existing listeners
    this.cleanup();

    // Node click events
    if (this.handlers.nodeClick) {
      const nodeClickHandler = (event) => {
        const node = event.target;
        const nodeData = node.data();
        
        console.log('Node clicked:', nodeData.id);
        this.handlers.nodeClick(nodeData, event);
      };
      
      cy.on('tap', 'node', nodeClickHandler);
      this.eventListeners.push({ type: 'tap', selector: 'node', handler: nodeClickHandler });
    }

    // Node hover events
    if (this.handlers.nodeHover) {
      const mouseoverHandler = (event) => {
        const node = event.target;
        node.addClass('hovered');
        this.handlers.nodeHover(node.data(), event, true);
      };
      
      const mouseoutHandler = (event) => {
        const node = event.target;
        node.removeClass('hovered');
        this.handlers.nodeHover(node.data(), event, false);
      };
      
      cy.on('mouseover', 'node', mouseoverHandler);
      cy.on('mouseout', 'node', mouseoutHandler);
      
      this.eventListeners.push({ type: 'mouseover', selector: 'node', handler: mouseoverHandler });
      this.eventListeners.push({ type: 'mouseout', selector: 'node', handler: mouseoutHandler });
    }

    // Node right-click events
    if (this.handlers.nodeRightClick) {
      const rightClickHandler = (event) => {
        event.preventDefault();
        const node = event.target;
        this.handlers.nodeRightClick(node.data(), event);
      };
      
      cy.on('cxttap', 'node', rightClickHandler);
      this.eventListeners.push({ type: 'cxttap', selector: 'node', handler: rightClickHandler });
    }

    // Edge click events
    if (this.handlers.edgeClick) {
      const edgeClickHandler = (event) => {
        const edge = event.target;
        const edgeData = edge.data();
        
        console.log('Edge clicked:', edgeData.id);
        this.handlers.edgeClick(edgeData, event);
      };
      
      cy.on('tap', 'edge', edgeClickHandler);
      this.eventListeners.push({ type: 'tap', selector: 'edge', handler: edgeClickHandler });
    }

    // Background click events
    if (this.handlers.backgroundClick) {
      const backgroundClickHandler = (event) => {
        if (event.target === cy) {
          console.log('Background clicked');
          this.handlers.backgroundClick(event);
        }
      };
      
      cy.on('tap', backgroundClickHandler);
      this.eventListeners.push({ type: 'tap', selector: null, handler: backgroundClickHandler });
    }

    // Zoom events
    if (this.handlers.zoom) {
      const zoomHandler = (event) => {
        const zoom = cy.zoom();
        const pan = cy.pan();
        this.handlers.zoom(zoom, pan, event);
      };
      
      cy.on('zoom', zoomHandler);
      this.eventListeners.push({ type: 'zoom', selector: null, handler: zoomHandler });
    }

    // Pan events
    if (this.handlers.pan) {
      const panHandler = (event) => {
        const zoom = cy.zoom();
        const pan = cy.pan();
        this.handlers.pan(zoom, pan, event);
      };
      
      cy.on('pan', panHandler);
      this.eventListeners.push({ type: 'pan', selector: null, handler: panHandler });
    }

    console.log(`InteractionHandler: Setup ${this.eventListeners.length} event listeners`);
  }

  /**
   * Update specific handler
   */
  updateHandler(handlerName, handlerFunction) {
    this.handlers[handlerName] = handlerFunction;
    this.setupEvents(); // Re-setup events with new handler
  }

  /**
   * Remove specific handler
   */
  removeHandler(handlerName) {
    this.handlers[handlerName] = null;
    this.setupEvents(); // Re-setup events without the handler
  }

  /**
   * Select node programmatically
   */
  selectNode(nodeId) {
    if (!this.cytoscapeInstance) return;
    
    // Deselect all nodes first
    this.cytoscapeInstance.nodes().deselect();
    
    // Select the target node
    const node = this.cytoscapeInstance.getElementById(nodeId);
    if (node.length > 0) {
      node.select();
      
      // Trigger node click handler if it exists
      if (this.handlers.nodeClick) {
        this.handlers.nodeClick(node.data(), { target: node });
      }
    }
  }

  /**
   * Highlight nodes
   */
  highlightNodes(nodeIds, className = 'highlighted') {
    if (!this.cytoscapeInstance) return;
    
    // Clear existing highlights
    this.cytoscapeInstance.nodes().removeClass(className);
    
    // Add highlights to specified nodes
    nodeIds.forEach(nodeId => {
      const node = this.cytoscapeInstance.getElementById(nodeId);
      if (node.length > 0) {
        node.addClass(className);
      }
    });
  }

  /**
   * Clear all highlights
   */
  clearHighlights(className = 'highlighted') {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.elements().removeClass(className);
    }
  }

  /**
   * Focus on specific node (center and zoom)
   */
  focusOnNode(nodeId, zoomLevel = 2) {
    if (!this.cytoscapeInstance) return;
    
    const node = this.cytoscapeInstance.getElementById(nodeId);
    if (node.length > 0) {
      this.cytoscapeInstance.animate({
        center: { eles: node },
        zoom: zoomLevel
      }, {
        duration: 500,
        easing: 'ease-out-cubic'
      });
    }
  }

  /**
   * Get node at position
   */
  getNodeAtPosition(x, y) {
    if (!this.cytoscapeInstance) return null;
    
    const elements = this.cytoscapeInstance.elementsAt({ x, y });
    const nodes = elements.filter('node');
    
    return nodes.length > 0 ? nodes[0] : null;
  }

  /**
   * Get nodes in area
   */
  getNodesInArea(x1, y1, x2, y2) {
    if (!this.cytoscapeInstance) return [];
    
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    return this.cytoscapeInstance.nodes().filter(node => {
      const pos = node.renderedPosition();
      return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
    });
  }

  /**
   * Enable box selection
   */
  enableBoxSelection() {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.boxSelectionEnabled(true);
    }
  }

  /**
   * Disable box selection
   */
  disableBoxSelection() {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.boxSelectionEnabled(false);
    }
  }

  /**
   * Set interaction mode
   */
  setInteractionMode(mode) {
    if (!this.cytoscapeInstance) return;
    
    const cy = this.cytoscapeInstance;
    
    switch (mode) {
      case 'pan':
        cy.panningEnabled(true);
        cy.zoomingEnabled(true);
        cy.boxSelectionEnabled(false);
        cy.autoungrabify(true);
        break;
        
      case 'select':
        cy.panningEnabled(false);
        cy.zoomingEnabled(false);
        cy.boxSelectionEnabled(true);
        cy.autoungrabify(true);
        break;
        
      case 'grab':
        cy.panningEnabled(true);
        cy.zoomingEnabled(true);
        cy.boxSelectionEnabled(false);
        cy.autoungrabify(false);
        break;
        
      default:
        // Default mode - all interactions enabled
        cy.panningEnabled(true);
        cy.zoomingEnabled(true);
        cy.boxSelectionEnabled(false);
        cy.autoungrabify(true);
    }
    
    console.log(`InteractionHandler: Set mode to ${mode}`);
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats() {
    return {
      activeHandlers: Object.keys(this.handlers).filter(key => this.handlers[key] !== null),
      eventListeners: this.eventListeners.length,
      selectedNodes: this.cytoscapeInstance ? this.cytoscapeInstance.nodes(':selected').length : 0,
      highlightedNodes: this.cytoscapeInstance ? this.cytoscapeInstance.nodes('.highlighted').length : 0
    };
  }

  /**
   * Cleanup all event listeners
   */
  cleanup() {
    if (this.cytoscapeInstance) {
      // Remove all previously registered listeners
      this.eventListeners.forEach(({ type, selector, handler }) => {
        if (selector) {
          this.cytoscapeInstance.removeListener(type, selector, handler);
        } else {
          this.cytoscapeInstance.removeListener(type, handler);
        }
      });
    }
    
    this.eventListeners = [];
  }

  /**
   * Destroy interaction handler
   */
  destroy() {
    this.cleanup();
    this.cytoscapeInstance = null;
    this.handlers = {};
    
    console.log('InteractionHandler destroyed');
  }
}

export default InteractionHandler;