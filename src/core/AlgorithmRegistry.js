import GraphTypeManager from './GraphTypeManager';

class AlgorithmRegistry {
  constructor() {
    this.algorithms = new Map();
    this.initializeBuiltInAlgorithms();
  }

  /**
   * Register an algorithm
   */
  register(algorithm) {
    if (!this.validateAlgorithm(algorithm)) {
      throw new Error(`Invalid algorithm configuration: ${algorithm.id}`);
    }
    
    this.algorithms.set(algorithm.id, algorithm);
    console.log(`Algorithm registered: ${algorithm.id}`);
  }

  /**
   * Get algorithm by ID
   */
  getAlgorithm(id) {
    const algorithm = this.algorithms.get(id);
    if (!algorithm) {
      throw new Error(`Algorithm not found: ${id}`);
    }
    return algorithm;
  }

  /**
   * Get all available algorithms
   */
  getAllAlgorithms() {
    return Array.from(this.algorithms.values());
  }

  /**
   * Get algorithms by graph type
   */
  getAlgorithmsByGraphType(graphTypeId) {
    try {
      return GraphTypeManager.getAlgorithmsForGraphType(graphTypeId);
    } catch (error) {
      console.warn(`No algorithms found for graph type: ${graphTypeId}`);
      return [];
    }
  }

  /**
   * Get algorithms that support comparison (have more than one algorithm for same graph type)
   */
  getComparisonAlgorithms() {
    const comparableAlgorithms = [];
    
    // Get all graph types
    const graphTypes = GraphTypeManager.getAllGraphTypes();
    
    for (const graphType of graphTypes) {
      const algorithms = GraphTypeManager.getAlgorithmsForGraphType(graphType.id);
      
      // If there are multiple algorithms for this graph type, they can be compared
      if (algorithms.length > 1) {
        algorithms.forEach(algorithmId => {
          const algorithm = this.algorithms.get(algorithmId);
          if (algorithm) {
            comparableAlgorithms.push({
              ...algorithm,
              graphType: graphType.id,
              graphTypeName: graphType.name
            });
          }
        });
      }
    }
    
    return comparableAlgorithms;
  }

  /**
   * Get available comparison pairs
   */
  getComparisonPairs() {
    const pairs = [];
    const graphTypes = GraphTypeManager.getAllGraphTypes();
    
    for (const graphType of graphTypes) {
      const graphTypePairs = GraphTypeManager.getComparisonPairs(graphType.id);
      
      for (const pair of graphTypePairs) {
        const algorithm1 = this.algorithms.get(pair.algorithm1);
        const algorithm2 = this.algorithms.get(pair.algorithm2);
        
        if (algorithm1 && algorithm2) {
          pairs.push({
            algorithm1: algorithm1,
            algorithm2: algorithm2,
            graphType: graphType.id,
            graphTypeName: graphType.name,
            pairId: `${pair.algorithm1}_vs_${pair.algorithm2}`
          });
        }
      }
    }
    
    return pairs;
  }

  /**
   * Check if two algorithms are compatible for comparison
   */
  areAlgorithmsCompatible(algorithm1Id, algorithm2Id) {
    return GraphTypeManager.areAlgorithmsCompatible(algorithm1Id, algorithm2Id);
  }

  /**
   * Get graph type for an algorithm
   */
  getGraphTypeForAlgorithm(algorithmId) {
    try {
      return GraphTypeManager.getGraphTypeByAlgorithm(algorithmId);
    } catch (error) {
      console.warn(`Could not determine graph type for algorithm: ${algorithmId}`);
      return null;
    }
  }

  /**
   * Validate file requirements for an algorithm
   */
  validateFiles(algorithmId, files) {
    const algorithm = this.getAlgorithm(algorithmId);
    return algorithm.validateFiles(files);
  }

  /**
   * Validate parameters for an algorithm
   */
  validateParameters(algorithmId, parameters) {
    const algorithm = this.getAlgorithm(algorithmId);
    return algorithm.validateParameters(parameters);
  }

  /**
   * Get parameter schema for UI generation
   */
  getParameterSchema(algorithmId) {
    const algorithm = this.getAlgorithm(algorithmId);
    return algorithm.parameterSchema;
  }

  /**
   * Get default parameters for an algorithm
   */
  getDefaultParameters(algorithmId) {
    const algorithm = this.getAlgorithm(algorithmId);
    return algorithm.getDefaultParameters();
  }

  /**
   * Check if algorithm supports comparison mode (has compatible algorithms)
   */
  supportsComparison(algorithmId) {
    const graphType = this.getGraphTypeForAlgorithm(algorithmId);
    if (!graphType) return false;
    
    const algorithms = GraphTypeManager.getAlgorithmsForGraphType(graphType.id);
    return algorithms.length > 1; // Can compare if there are multiple algorithms for same graph type
  }

  // Private methods
  validateAlgorithm(algorithm) {
    const required = ['id', 'name', 'fileRequirements', 'parameterSchema', 'validateFiles', 'validateParameters', 'getDefaultParameters'];
    return required.every(field => algorithm[field] !== undefined);
  }

  initializeBuiltInAlgorithms() {
    // Register Homogeneous Algorithm
    this.register({
      id: 'homogeneous',
      name: 'Homogeneous Graph Processing',
      description: 'Traditional graph processing with edge list and attributes',
      category: 'traditional',
      
      fileRequirements: {
        count: 2,
        types: ['edgeList', 'attributes'],
        extensions: ['.txt', '.csv'],
        descriptions: {
          edgeList: 'Space-separated node pairs, each on a new line',
          attributes: 'Contains node and edge counts'
        }
      },
      
      parameterSchema: [
        {
          id: 'k',
          name: 'Cluster Size (k)',
          type: 'number',
          min: 1,
          max: 1000,
          default: 25,
          description: 'Maximum number of nodes in a supernode',
          validation: (value) => Number.isInteger(value) && value > 0
        }
      ],
      
      validateFiles: (files) => {
        if (!files.edgeListFile || !files.attributesFile) {
          return {
            valid: false,
            error: 'Both edge list and attributes files are required'
          };
        }
        return { valid: true };
      },
      
      validateParameters: (params) => {
        if (!params.k || params.k < 1) {
          return {
            valid: false,
            error: 'Cluster size (k) must be a positive integer'
          };
        }
        return { valid: true };
      },

      getDefaultParameters: () => ({ k: 25 })
    });

    // Register Heterogeneous Algorithm
    this.register({
      id: 'heterogeneous',
      name: 'Heterogeneous Graph Processing',
      description: 'Multi-type network processing with specialized files',
      category: 'advanced',
      
      fileRequirements: {
        count: 4,
        types: ['info', 'link', 'node', 'meta'],
        extensions: ['.dat'],
        naming: 'datasetName_type.dat',
        descriptions: {
          info: 'Graph information and metadata',
          link: 'Edge/link information',
          node: 'Node information and attributes',
          meta: 'Meta-path information'
        }
      },
      
      parameterSchema: [
        {
          id: 'k',
          name: 'Cluster Size (k)',
          type: 'number',
          min: 1,
          max: 1000,
          default: 25,
          description: 'Maximum number of nodes in a supernode',
          validation: (value) => Number.isInteger(value) && value > 0
        }
      ],
      
      validateFiles: (files) => {
        const required = ['infoFile', 'linkFile', 'nodeFile', 'metaFile'];
        const missing = required.filter(type => !files[type]);
        
        if (missing.length > 0) {
          return {
            valid: false,
            error: `Missing required files: ${missing.join(', ')}`
          };
        }
        
        // Validate naming convention if files are provided
        if (files.infoFile) {
          const infoFileName = files.infoFile.name;
          const datasetName = infoFileName.replace('_info.dat', '');
          
          const expectedNames = {
            infoFile: `${datasetName}_info.dat`,
            linkFile: `${datasetName}_link.dat`,
            nodeFile: `${datasetName}_node.dat`,
            metaFile: `${datasetName}_meta.dat`
          };
          
          for (const [type, expectedName] of Object.entries(expectedNames)) {
            if (files[type] && files[type].name !== expectedName) {
              return {
                valid: false,
                error: `File naming mismatch for ${type}. Expected: ${expectedName}, got: ${files[type].name}`
              };
            }
          }
        }
        
        return { valid: true };
      },
      
      validateParameters: (params) => {
        if (!params.k || params.k < 1) {
          return {
            valid: false,
            error: 'Cluster size (k) must be a positive integer'
          };
        }
        return { valid: true };
      },

      getDefaultParameters: () => ({ k: 25 })
    });

    // Register SCAR Algorithm
    this.register({
      id: 'scar',
      name: 'SCAR Algorithm',
      description: 'SCAR algorithm with advanced parameters',
      category: 'advanced',
      
      fileRequirements: {
        count: 4,
        types: ['info', 'link', 'node', 'meta'],
        extensions: ['.dat'],
        naming: 'datasetName_type.dat',
        descriptions: {
          info: 'Graph information and metadata',
          link: 'Edge/link information',
          node: 'Node information and attributes',
          meta: 'Meta-path information'
        }
      },
      
      parameterSchema: [
        {
          id: 'k',
          name: 'Cluster Size (k)',
          type: 'number',
          min: 1,
          max: 1000,
          default: 25,
          description: 'Maximum number of nodes in a supernode',
          validation: (value) => Number.isInteger(value) && value > 0
        },
        {
          id: 'nk',
          name: 'NK Parameter',
          type: 'number',
          min: 1,
          max: 100,
          default: 10,
          description: 'SCAR NK parameter for clustering',
          validation: (value) => Number.isInteger(value) && value > 0
        },
        {
          id: 'th',
          name: 'Threshold',
          type: 'range',
          min: 0,
          max: 1,
          step: 0.1,
          default: 0.5,
          description: 'SCAR threshold parameter (0.0 - 1.0)',
          validation: (value) => typeof value === 'number' && value >= 0 && value <= 1
        }
      ],
      
      validateFiles: (files) => {
        // Same validation as heterogeneous
        const required = ['infoFile', 'linkFile', 'nodeFile', 'metaFile'];
        const missing = required.filter(type => !files[type]);
        
        if (missing.length > 0) {
          return {
            valid: false,
            error: `Missing required files: ${missing.join(', ')}`
          };
        }
        
        return { valid: true };
      },
      
      validateParameters: (params) => {
        if (!params.k || params.k < 1) {
          return {
            valid: false,
            error: 'Cluster size (k) must be a positive integer'
          };
        }
        
        if (!params.nk || params.nk < 1) {
          return {
            valid: false,
            error: 'NK parameter must be a positive integer'
          };
        }
        
        if (params.th === undefined || params.th < 0 || params.th > 1) {
          return {
            valid: false,
            error: 'Threshold must be between 0.0 and 1.0'
          };
        }
        
        return { valid: true };
      },

      getDefaultParameters: () => ({ k: 25, nk: 10, th: 0.5 })
    });
  }
}

// Export singleton instance
export default new AlgorithmRegistry();