import { layoutOptions } from '../utils/cytoscapeConfig';

class LayoutManager {
  constructor() {
    this.cytoscapeInstance = null;
    this.currentLayout = 'preset';
    this.layoutHistory = [];
    this.isApplying = false;
  }

  /**
   * Initialize layout manager with Cytoscape instance
   */
  initialize(cytoscapeInstance) {
    this.cytoscapeInstance = cytoscapeInstance;
    console.log('LayoutManager initialized');
  }

  /**
   * Apply layout to the visualization
   */
  async applyLayout(layoutName = 'preset', options = {}) {
    if (!this.cytoscapeInstance || this.isApplying) {
      console.warn('LayoutManager: Cannot apply layout - instance not ready or already applying');
      return false;
    }

    try {
      this.isApplying = true;
      
      // Check if we have elements to layout
      const elements = this.cytoscapeInstance.elements();
      if (elements.length === 0) {
        console.warn('LayoutManager: No elements to layout');
        return false;
      }

      // Get layout configuration
      const layoutConfig = layoutOptions[layoutName] || layoutOptions.preset;
      const finalConfig = { ...layoutConfig, ...options };
      
      // Store current layout in history
      this.layoutHistory.push({
        layout: this.currentLayout,
        timestamp: Date.now(),
        nodeCount: elements.nodes().length
      });
      
      // Keep only last 10 layouts in history
      if (this.layoutHistory.length > 10) {
        this.layoutHistory.shift();
      }

      console.log(`LayoutManager: Applying ${layoutName} layout to ${elements.length} elements`);
      
      // Apply the layout
      const layout = this.cytoscapeInstance.layout(finalConfig);
      
      return new Promise((resolve) => {
        layout.one('layoutstop', () => {
          this.currentLayout = layoutName;
          this.isApplying = false;
          console.log(`LayoutManager: Layout ${layoutName} applied successfully`);
          resolve(true);
        });
        
        layout.run();
      });
      
    } catch (error) {
      console.error('LayoutManager: Layout application failed:', error);
      this.isApplying = false;
      return false;
    }
  }

  /**
   * Get available layouts
   */
  getAvailableLayouts() {
    return Object.keys(layoutOptions).map(key => ({
      id: key,
      name: this.formatLayoutName(key),
      description: this.getLayoutDescription(key)
    }));
  }

  /**
   * Get current layout
   */
  getCurrentLayout() {
    return this.currentLayout;
  }

  /**
   * Get layout history
   */
  getLayoutHistory() {
    return [...this.layoutHistory];
  }

  /**
   * Fit layout to viewport
   */
  fit(padding = 50) {
    if (this.cytoscapeInstance) {
      this.cytoscapeInstance.fit(padding);
    }
  }

  /**
   * Center layout on specific node
   */
  centerOn(nodeId, zoom = null) {
    if (!this.cytoscapeInstance) return;
    
    const node = this.cytoscapeInstance.getElementById(nodeId);
    if (node.length > 0) {
      this.cytoscapeInstance.center(node);
      if (zoom) {
        this.cytoscapeInstance.zoom(zoom);
      }
    }
  }

  /**
   * Reset layout to original positions
   */
  resetToOriginal() {
    return this.applyLayout('preset');
  }

  /**
   * Apply layout with animation
   */
  async applyAnimatedLayout(layoutName, duration = 1000) {
    const layoutConfig = layoutOptions[layoutName] || layoutOptions.preset;
    
    return this.applyLayout(layoutName, {
      ...layoutConfig,
      animate: true,
      animationDuration: duration,
      animationEasing: 'ease-out-cubic'
    });
  }

  /**
   * Check if layout is currently being applied
   */
  isApplyingLayout() {
    return this.isApplying;
  }

  /**
   * Get layout performance statistics
   */
  getLayoutStats() {
    if (!this.cytoscapeInstance) {
      return { nodes: 0, edges: 0, lastLayout: null };
    }

    const elements = this.cytoscapeInstance.elements();
    return {
      nodes: elements.nodes().length,
      edges: elements.edges().length,
      currentLayout: this.currentLayout,
      layoutHistory: this.layoutHistory.length,
      lastApplied: this.layoutHistory[this.layoutHistory.length - 1]
    };
  }

  // Private helper methods
  formatLayoutName(layoutKey) {
    const names = {
      'preset': 'Preset (Use Coordinates)',
      'cose': 'COSE-Bilkent',
      'fcose': 'fCOSE',
      'grid': 'Grid Layout',
      'circle': 'Circle Layout',
      'breadthfirst': 'Breadth First',
      'concentric': 'Concentric'
    };
    
    return names[layoutKey] || layoutKey.charAt(0).toUpperCase() + layoutKey.slice(1);
  }

  getLayoutDescription(layoutKey) {
    const descriptions = {
      'preset': 'Uses existing node coordinates from the algorithm',
      'cose': 'Compound spring layout with good clustering',
      'fcose': 'Fast compound spring layout for large graphs',
      'grid': 'Arranges nodes in a grid pattern',
      'circle': 'Arranges nodes in a circle',
      'breadthfirst': 'Hierarchical layout from root nodes',
      'concentric': 'Concentric circles based on node metrics'
    };
    
    return descriptions[layoutKey] || 'Custom layout algorithm';
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.cytoscapeInstance = null;
    this.layoutHistory = [];
    this.isApplying = false;
    console.log('LayoutManager destroyed');
  }
}

export default LayoutManager;