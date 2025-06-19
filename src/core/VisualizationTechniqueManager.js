/**
 * Visualization Technique Management System
 * Decouples visualization techniques from components
 */
class VisualizationTechniqueManager {
  constructor() {
    this.techniques = new Map();
    this.activeTechniques = new Set();
    this.initializeBuiltInTechniques();
  }

  /**
   * Initialize built-in visualization techniques
   */
  initializeBuiltInTechniques() {
    // Standard layout technique (no transformation)
    this.register({
      id: 'standard',
      name: 'Standard Layout',
      description: 'No visual transformation applied',
      category: 'layout',
      requirements: ['cytoscapeElements'],
      parameters: [],
      apply: (elements, params) => elements,
      reset: (elements) => elements,
      isActive: false
    });

    // Fisheye technique
    this.register({
      id: 'fisheye',
      name: 'Structure-Aware Fisheye',
      description: 'Focus+context technique with structure preservation',
      category: 'focus',
      requirements: ['cytoscapeElements', 'focusPoint'],
      parameters: [
        {
          id: 'magnification',
          name: 'Magnification Factor',
          type: 'range',
          min: 1,
          max: 8,
          step: 0.5,
          default: 3.0
        },
        {
          id: 'focusRadius',
          name: 'Focus Radius',
          type: 'number',
          min: 50,
          max: 300,
          default: 100
        }
      ],
      apply: null, // Will be set during initialization
      reset: null,
      isActive: false
    });
  }

  /**
   * Register a new visualization technique
   */
  register(technique) {
    if (!this.validateTechnique(technique)) {
      throw new Error(`Invalid technique configuration: ${technique.id}`);
    }
    
    this.techniques.set(technique.id, {
      ...technique,
      isActive: false,
      appliedElements: null
    });
    
    console.log(`Visualization technique registered: ${technique.id}`);
  }

  /**
   * Get technique by ID
   */
  getTechnique(id) {
    const technique = this.techniques.get(id);
    if (!technique) {
      throw new Error(`Technique not found: ${id}`);
    }
    return technique;
  }

  /**
   * Get all available techniques
   */
  getAllTechniques() {
    return Array.from(this.techniques.values());
  }

  /**
   * Get techniques by category
   */
  getTechniquesByCategory(category) {
    return Array.from(this.techniques.values())
      .filter(technique => technique.category === category);
  }

  /**
   * Apply a technique to elements
   */
  async applyTechnique(techniqueId, elements, parameters = {}) {
    const technique = this.getTechnique(techniqueId);
    
    if (!technique.apply) {
      throw new Error(`Technique ${techniqueId} has no apply function`);
    }

    // Validate requirements
    if (!this.validateRequirements(technique, { elements, parameters })) {
      throw new Error(`Requirements not met for technique ${techniqueId}`);
    }

    try {
      // Merge parameters with defaults
      const finalParameters = this.mergeParameters(technique, parameters);
      
      // Apply the technique
      const transformedElements = await technique.apply(elements, finalParameters);
      
      // Update technique state
      technique.isActive = true;
      technique.appliedElements = transformedElements;
      this.activeTechniques.add(techniqueId);
      
      console.log(`Applied technique: ${techniqueId}`);
      return transformedElements;
      
    } catch (error) {
      console.error(`Error applying technique ${techniqueId}:`, error);
      throw error;
    }
  }

  /**
   * Reset a technique
   */
  async resetTechnique(techniqueId, originalElements) {
    const technique = this.getTechnique(techniqueId);
    
    if (!technique.isActive) {
      return originalElements;
    }

    try {
      let restoredElements = originalElements;
      
      if (technique.reset) {
        restoredElements = await technique.reset(originalElements);
      }
      
      // Update technique state
      technique.isActive = false;
      technique.appliedElements = null;
      this.activeTechniques.delete(techniqueId);
      
      console.log(`Reset technique: ${techniqueId}`);
      return restoredElements;
      
    } catch (error) {
      console.error(`Error resetting technique ${techniqueId}:`, error);
      throw error;
    }
  }

  /**
   * Reset all active techniques
   */
  async resetAllTechniques(originalElements) {
    const activeIds = Array.from(this.activeTechniques);
    let currentElements = originalElements;
    
    for (const techniqueId of activeIds) {
      currentElements = await this.resetTechnique(techniqueId, currentElements);
    }
    
    return currentElements;
  }

  /**
   * Check if technique is active
   */
  isTechniqueActive(techniqueId) {
    const technique = this.techniques.get(techniqueId);
    return technique ? technique.isActive : false;
  }

  /**
   * Get active techniques
   */
  getActiveTechniques() {
    return Array.from(this.activeTechniques).map(id => this.getTechnique(id));
  }

  /**
   * Set technique implementation (for dynamic loading)
   */
  setTechniqueImplementation(techniqueId, applyFn, resetFn) {
    const technique = this.getTechnique(techniqueId);
    technique.apply = applyFn;
    technique.reset = resetFn;
  }

  /**
   * Create technique controls for UI
   */
  createTechniqueControls(techniqueId) {
    const technique = this.getTechnique(techniqueId);
    
    return {
      id: technique.id,
      name: technique.name,
      description: technique.description,
      isActive: technique.isActive,
      parameters: technique.parameters.map(param => ({
        ...param,
        currentValue: param.default
      })),
      actions: {
        apply: (elements, params) => this.applyTechnique(techniqueId, elements, params),
        reset: (originalElements) => this.resetTechnique(techniqueId, originalElements),
        toggle: (elements, originalElements, params) => {
          return technique.isActive 
            ? this.resetTechnique(techniqueId, originalElements)
            : this.applyTechnique(techniqueId, elements, params);
        }
      }
    };
  }

  /**
   * Get technique requirements
   */
  getTechniqueRequirements(techniqueId) {
    const technique = this.getTechnique(techniqueId);
    return technique.requirements;
  }

  // Private methods
  validateTechnique(technique) {
    const required = ['id', 'name', 'description', 'category', 'requirements'];
    return required.every(field => technique[field] !== undefined);
  }

  validateRequirements(technique, context) {
    return technique.requirements.every(requirement => {
      switch (requirement) {
        case 'cytoscapeElements':
          return context.elements && Array.isArray(context.elements);
        case 'focusPoint':
          return context.parameters.focusPoint || context.parameters.x !== undefined;
        default:
          return true;
      }
    });
  }

  mergeParameters(technique, userParameters) {
    const merged = {};
    
    technique.parameters.forEach(param => {
      merged[param.id] = userParameters[param.id] !== undefined 
        ? userParameters[param.id] 
        : param.default;
    });
    
    // Add any additional user parameters
    Object.keys(userParameters).forEach(key => {
      if (!merged.hasOwnProperty(key)) {
        merged[key] = userParameters[key];
      }
    });
    
    return merged;
  }
}

// Export singleton instance
export default new VisualizationTechniqueManager();