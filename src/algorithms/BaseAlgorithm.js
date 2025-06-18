/**
 * Base class for all algorithm implementations
 * Defines the common interface that all algorithms must implement
 */
class BaseAlgorithm {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.category = config.category || 'general';
    this.supportsComparison = config.supportsComparison || false;
    this.fileRequirements = config.fileRequirements;
    this.parameterSchema = config.parameterSchema;
  }

  /**
   * Validate uploaded files for this algorithm
   * @param {Object} files - Object containing uploaded files
   * @returns {Object} - { valid: boolean, error?: string }
   */
  validateFiles(files) {
    throw new Error('validateFiles method must be implemented by subclass');
  }

  /**
   * Validate parameters for this algorithm
   * @param {Object} parameters - Parameter values to validate
   * @returns {Object} - { valid: boolean, error?: string }
   */
  validateParameters(parameters) {
    throw new Error('validateParameters method must be implemented by subclass');
  }

  /**
   * Get default parameters for this algorithm
   * @returns {Object} - Default parameter values
   */
  getDefaultParameters() {
    throw new Error('getDefaultParameters method must be implemented by subclass');
  }

  /**
   * Process the algorithm with given files and parameters
   * @param {Object} files - Input files
   * @param {Object} parameters - Algorithm parameters
   * @returns {Promise<Object>} - Processing result
   */
  async process(files, parameters) {
    throw new Error('process method must be implemented by subclass');
  }

  /**
   * Get parameter schema for UI generation
   * @returns {Array} - Array of parameter definitions
   */
  getParameterSchema() {
    return this.parameterSchema;
  }

  /**
   * Get file requirements for UI generation
   * @returns {Object} - File requirements definition
   */
  getFileRequirements() {
    return this.fileRequirements;
  }

  /**
   * Check if this algorithm supports comparison mode
   * @returns {boolean}
   */
  supportsComparisonMode() {
    return this.supportsComparison;
  }

  /**
   * Validate a specific parameter value
   * @param {string} paramId - Parameter identifier
   * @param {*} value - Value to validate
   * @returns {boolean} - True if valid
   */
  validateParameter(paramId, value) {
    const param = this.parameterSchema.find(p => p.id === paramId);
    if (!param) return false;
    
    if (param.validation && typeof param.validation === 'function') {
      return param.validation(value);
    }
    
    // Default validation based on parameter type
    switch (param.type) {
      case 'number':
        return typeof value === 'number' && 
               value >= (param.min || -Infinity) && 
               value <= (param.max || Infinity);
      
      case 'range':
        return typeof value === 'number' && 
               value >= param.min && 
               value <= param.max;
      
      case 'boolean':
        return typeof value === 'boolean';
      
      case 'select':
        return param.options && param.options.some(opt => opt.value === value);
      
      default:
        return true;
    }
  }

  /**
   * Get algorithm metadata
   * @returns {Object} - Algorithm metadata
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      supportsComparison: this.supportsComparison,
      parameterCount: this.parameterSchema.length,
      fileCount: this.fileRequirements.count
    };
  }

  /**
   * Get algorithm capabilities
   * @returns {Object} - Capabilities object
   */
  getCapabilities() {
    return {
      comparison: this.supportsComparison,
      realTimeUpdate: false, // Can be overridden by subclasses
      exportFormats: ['json'], // Can be extended by subclasses
      visualizationTypes: ['graph'], // Can be extended by subclasses
      maxFileSize: 100 * 1024 * 1024, // 100MB default
      supportedFormats: this.fileRequirements.extensions
    };
  }

  /**
   * Estimate processing time based on input
   * @param {Object} files - Input files
   * @param {Object} parameters - Algorithm parameters
   * @returns {number} - Estimated time in seconds
   */
  estimateProcessingTime(files, parameters) {
    // Default implementation - can be overridden by subclasses
    let totalSize = 0;
    Object.values(files).forEach(file => {
      if (file && file.size) {
        totalSize += file.size;
      }
    });
    
    // Rough estimate: 1 second per MB
    return Math.max(5, Math.ceil(totalSize / (1024 * 1024)));
  }

  /**
   * Get help text for this algorithm
   * @returns {string} - Help text
   */
  getHelpText() {
    let help = `${this.name}\n\n${this.description}\n\n`;
    
    help += 'Required Files:\n';
    this.fileRequirements.types.forEach(type => {
      help += `- ${type}: ${this.fileRequirements.descriptions[type]}\n`;
    });
    
    help += '\nParameters:\n';
    this.parameterSchema.forEach(param => {
      help += `- ${param.name}: ${param.description}\n`;
    });
    
    return help;
  }
}

export default BaseAlgorithm;