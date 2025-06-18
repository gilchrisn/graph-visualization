import { transformToCytoscapeElements } from '../utils/dataTransformers';

class VisualizationEngine {
  constructor() {
    this.cytoscapeInstance = null;
    this.currentElements = [];
    this.layoutManager = null;
    this.interactionHandler = null;
    this.elementTransformer = null;
  }

  /**
   * Initialize the visualization engine
   */
  initialize(cytoscapeInstance, layoutManager, interactionHandler, elementTransformer) {
    this.cytoscapeInstance = cytoscapeInstance;
    this.layoutManager = layoutManager;
    this.interactionHandler = interactionHandler;
    this.elementTransformer = elementTransformer || this.defaultElementTransformer;
    
    console.log('VisualizationEngine initialized');
  }

  /**
   * Render data to the visualization
   */
  async renderData(data, layoutName = 'preset') {
    try {
      if (!data || (!data.nodes && !data.elements)) {
        console.warn('No data provided to render');
        return;
      }

      // Transform data to Cytoscape elements
      let elements;
      if (data.elements) {
        // Already in element format
        elements = data.elements;
      } else {
        // Transform from raw data
        elements = this.elementTransformer.transform(data);
      }

      this.currentElements = elements;

      // Update Cytoscape instance
      if (this.cytoscapeInstance) {
        this.cytoscapeInstance.elements().remove();
        this.cytoscapeInstance.add(elements);
        
        // Apply layout
        if (this.layoutManager) {
          await this.layoutManager.applyLayout(layoutName);
        }
        
        // Setup interactions
        if (this.interactionHandler) {
          this.interactionHandler.setupEvents();
        }
      }

      console.log(`VisualizationEngine: Rendered ${elements.length} elements with ${layoutName} layout`);
      return elements;
      
    } catch (error) {
      console.error('VisualizationEngine.renderData failed:', error);
      throw error;
    }
  }

  /**
   * Update visualization with new data
   */
  async updateData(data, options = {}) {
    const { animate = false, layout = 'preset' } = options;
    
    try {
      // Transform and render
      const elements = await this.renderData(data, layout);
      
      // Handle animation if requested
      if (animate && this.cytoscapeInstance) {
        this.cytoscapeInstance.animate({
          fit: {
            padding: 50
          }
        }, {
          duration: 500
        });
      }
      
      return elements;
    } catch (error) {
      console.error('VisualizationEngine.updateData failed:', error);
      throw error;
    }
  }

  /**
   * Apply fisheye transformation
   */
  applyFisheye(fisheyeElements) {
    try {
      if (!this.cytoscapeInstance || !fisheyeElements) {
        return;
      }

      this.cytoscapeInstance.batch(() => {
        fisheyeElements.forEach(element => {
          if (element.position && element.data && element.data.id) {
            const cyElement = this.cytoscapeInstance.getElementById(element.data.id);
            if (cyElement.length > 0) {
              cyElement.position(element.position);
            }
          }
        });
      });
      
    } catch (error) {
      console.error('VisualizationEngine.applyFisheye failed:', error);
    }
  }

  /**
   * Get current visualization state
   */
  getState() {
    return {
      elements: this.currentElements,
      zoom: this.cytoscapeInstance?.zoom(),
      pan: this.cytoscapeInstance?.pan(),
      bounds: this.cytoscapeInstance?.elements().boundingBox()
    };
  }

  /**
   * Set visualization state
   */
  setState(state) {
    try {
      if (!this.cytoscapeInstance) return;
      
      if (state.zoom) {
        this.cytoscapeInstance.zoom(state.zoom);
      }
      
      if (state.pan) {
        this.cytoscapeInstance.pan(state.pan);
      }
      
      if (state.elements) {
        this.currentElements = state.elements;
        this.cytoscapeInstance.elements().remove();
        this.cytoscapeInstance.add(state.elements);
      }
      
    } catch (error) {
      console.error('VisualizationEngine.setState failed:', error);
    }
  }

  /**
   * Fit visualization to viewport
   */
  fit(padding = 50) {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.fit(padding);
    }
  }

  /**
   * Center visualization on specific node
   */
  centerOn(nodeId) {
    if (this.cytoscapeInstance) {
      const node = this.cytoscapeInstance.getElementById(nodeId);
      if (node.length > 0) {
        this.cytoscapeInstance.center(node);
      }
    }
  }

  /**
   * Highlight specific elements
   */
  highlightElements(elementIds, className = 'highlighted') {
    if (!this.cytoscapeInstance) return;
    
    // Remove existing highlights
    this.cytoscapeInstance.elements().removeClass(className);
    
    // Add new highlights
    elementIds.forEach(id => {
      const element = this.cytoscapeInstance.getElementById(id);
      if (element.length > 0) {
        element.addClass(className);
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
   * Export current visualization
   */
  export(format = 'png', options = {}) {
    if (!this.cytoscapeInstance) {
      throw new Error('No Cytoscape instance available for export');
    }
    
    const defaultOptions = {
      output: 'blob',
      bg: '#ffffff',
      full: true,
      scale: 2
    };
    
    return this.cytoscapeInstance[format]({ ...defaultOptions, ...options });
  }

  /**
   * Get statistics about current visualization
   */
  getStatistics() {
    if (!this.cytoscapeInstance) {
      return { nodes: 0, edges: 0, clusters: 0 };
    }
    
    const nodes = this.cytoscapeInstance.nodes();
    const edges = this.cytoscapeInstance.edges();
    const supernodes = nodes.filter('[type = "supernode"]');
    const leafNodes = nodes.filter('[type = "leaf"]');
    
    return {
      totalElements: this.cytoscapeInstance.elements().length,
      nodes: nodes.length,
      edges: edges.length,
      supernodes: supernodes.length,
      leafNodes: leafNodes.length,
      zoom: this.cytoscapeInstance.zoom(),
      pan: this.cytoscapeInstance.pan()
    };
  }

  /**
   * Default element transformer (fallback)
   */
  defaultElementTransformer = {
    transform: (data) => {
      return transformToCytoscapeElements(data);
    }
  };

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.interactionHandler) {
      this.interactionHandler.cleanup();
    }
    
    this.cytoscapeInstance = null;
    this.currentElements = [];
    this.layoutManager = null;
    this.interactionHandler = null;
    this.elementTransformer = null;
    
    console.log('VisualizationEngine destroyed');
  }
}

// Export singleton instance
export default new VisualizationEngine();