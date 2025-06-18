import BaseAlgorithm from './BaseAlgorithm';

class HeterogeneousAlgorithm extends BaseAlgorithm {
  constructor() {
    super({
      id: 'heterogeneous',
      name: 'Heterogeneous Graph Processing',
      description: 'Multi-type network processing with specialized files',
      category: 'advanced',
      supportsComparison: true,
      
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
      ]
    });
  }

  validateFiles(files) {
    const required = ['infoFile', 'linkFile', 'nodeFile', 'metaFile'];
    const missing = required.filter(type => !files[type]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required files: ${missing.join(', ')}`
      };
    }

    // Validate file extensions
    for (const [fileType, file] of Object.entries(files)) {
      if (required.includes(fileType) && file) {
        if (!file.name.toLowerCase().endsWith('.dat')) {
          return {
            valid: false,
            error: `${fileType} must be a .dat file`
          };
        }
      }
    }

    // Validate naming convention if info file is provided
    if (files.infoFile) {
      const infoFileName = files.infoFile.name;
      const datasetName = infoFileName.replace('_info.dat', '');
      
      // Check if dataset name was extracted properly
      if (datasetName === infoFileName) {
        return {
          valid: false,
          error: 'Info file must follow naming convention: datasetName_info.dat'
        };
      }
      
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

    // Validate file sizes (max 500MB each for heterogeneous)
    const maxSize = 500 * 1024 * 1024; // 500MB
    for (const [fileType, file] of Object.entries(files)) {
      if (required.includes(fileType) && file && file.size > maxSize) {
        return {
          valid: false,
          error: `${fileType} is too large (max 500MB)`
        };
      }
    }

    return { valid: true };
  }

  validateParameters(parameters) {
    if (!parameters.k || parameters.k < 1) {
      return {
        valid: false,
        error: 'Cluster size (k) must be a positive integer'
      };
    }

    if (!Number.isInteger(parameters.k)) {
      return {
        valid: false,
        error: 'Cluster size (k) must be an integer'
      };
    }

    if (parameters.k > 1000) {
      return {
        valid: false,
        error: 'Cluster size (k) must not exceed 1000'
      };
    }

    return { valid: true };
  }

  getDefaultParameters() {
    return { k: 25 };
  }

  async process(files, parameters) {
    console.log('Processing heterogeneous algorithm with:', { files, parameters });
    
    // Validate inputs
    const fileValidation = this.validateFiles(files);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error);
    }

    const paramValidation = this.validateParameters(parameters);
    if (!paramValidation.valid) {
      throw new Error(paramValidation.error);
    }

    // Extract dataset name from info file
    const datasetName = files.infoFile.name.replace('_info.dat', '');

    // Return mock result structure
    return {
      success: true,
      algorithmId: this.id,
      datasetId: `${datasetName}_heterogeneous`,
      parameters: parameters,
      rootNode: 'c0_l3_0',
      nodeCount: 2000, // Would come from processing
      edgeCount: 8000, // Would come from processing
      nodeTypes: ['author', 'paper', 'venue'], // Example node types
      edgeTypes: ['writes', 'cites', 'published_in'], // Example edge types
      processingTime: this.estimateProcessingTime(files, parameters)
    };
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      realTimeUpdate: false, // Heterogeneous processing is more complex
      exportFormats: ['json', 'graphml', 'csv', 'gexf'],
      visualizationTypes: ['graph', 'hierarchy', 'bipartite'],
      maxFileSize: 500 * 1024 * 1024, // 500MB
      supportedFormats: ['.dat'],
      nodeTypes: true, // Supports multiple node types
      edgeTypes: true, // Supports multiple edge types
      metaPaths: true  // Supports meta-path analysis
    };
  }

  estimateProcessingTime(files, parameters) {
    // Heterogeneous processing is more complex
    let totalSize = 0;
    ['infoFile', 'linkFile', 'nodeFile', 'metaFile'].forEach(fileType => {
      if (files[fileType]) {
        totalSize += files[fileType].size;
      }
    });
    
    // Heterogeneous processing is slower due to complexity
    const baseTime = Math.ceil(totalSize / (1024 * 1024)); // 1MB per second
    const complexityFactor = 1 + Math.log10(parameters.k || 25) / 2;
    const heterogeneousComplexity = 2; // Additional complexity for heterogeneous processing
    
    return Math.max(10, Math.ceil(baseTime * complexityFactor * heterogeneousComplexity));
  }

  getOptimalParameters(fileStats) {
    // Suggest optimal parameters for heterogeneous networks
    const nodeCount = fileStats?.nodeCount || 2000;
    const nodeTypes = fileStats?.nodeTypes || 3;
    
    // For heterogeneous networks, k should account for node type diversity
    const suggestedK = Math.max(10, Math.min(150, Math.ceil(Math.sqrt(nodeCount / nodeTypes))));
    
    return {
      k: suggestedK,
      reasoning: `Suggested k=${suggestedK} for heterogeneous network with ${nodeTypes} node types and ${nodeCount} nodes`
    };
  }

  /**
   * Analyze heterogeneous network structure
   * @param {Object} files - Input files
   * @returns {Promise<Object>} - Network analysis
   */
  async analyzeNetworkStructure(files) {
    // This would analyze the network structure from the files
    // For now, return mock analysis
    return {
      nodeTypes: ['author', 'paper', 'venue'],
      edgeTypes: ['writes', 'cites', 'published_in'],
      nodeTypeCounts: {
        author: 5000,
        paper: 15000,
        venue: 500
      },
      edgeTypeCounts: {
        writes: 25000,
        cites: 50000,
        published_in: 15000
      },
      metaPaths: [
        'author-writes-paper',
        'paper-cites-paper',
        'paper-published_in-venue'
      ]
    };
  }

  /**
   * Get recommended meta-paths for this network
   * @param {Object} networkStructure - Network structure analysis
   * @returns {Array} - Recommended meta-paths
   */
  getRecommendedMetaPaths(networkStructure) {
    const { nodeTypes, edgeTypes } = networkStructure;
    
    // Generate common meta-path patterns
    const metaPaths = [];
    
    // Add simple paths
    nodeTypes.forEach(nodeType => {
      edgeTypes.forEach(edgeType => {
        metaPaths.push(`${nodeType}-${edgeType}`);
      });
    });
    
    // Add more complex paths (length 3)
    if (nodeTypes.includes('author') && nodeTypes.includes('paper')) {
      metaPaths.push('author-writes-paper-cites-paper');
      metaPaths.push('author-writes-paper-published_in-venue');
    }
    
    return metaPaths.slice(0, 10); // Return top 10 recommendations
  }
}

export default HeterogeneousAlgorithm;