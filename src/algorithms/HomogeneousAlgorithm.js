import BaseAlgorithm from './BaseAlgorithm';

class HomogeneousAlgorithm extends BaseAlgorithm {
  constructor() {
    super({
      id: 'homogeneous',
      name: 'Homogeneous Graph Processing',
      description: 'Traditional graph processing with edge list and attributes',
      category: 'traditional',
      supportsComparison: false,
      
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
      ]
    });
  }

  validateFiles(files) {
    if (!files.edgeListFile || !files.attributesFile) {
      return {
        valid: false,
        error: 'Both edge list and attributes files are required'
      };
    }

    // Validate file extensions
    const edgeListName = files.edgeListFile.name.toLowerCase();
    const attributesName = files.attributesFile.name.toLowerCase();
    
    if (!edgeListName.endsWith('.txt') && !edgeListName.endsWith('.csv')) {
      return {
        valid: false,
        error: 'Edge list file must be .txt or .csv format'
      };
    }
    
    if (!attributesName.endsWith('.txt') && !attributesName.endsWith('.csv')) {
      return {
        valid: false,
        error: 'Attributes file must be .txt or .csv format'
      };
    }

    // Validate file sizes (max 100MB each)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (files.edgeListFile.size > maxSize) {
      return {
        valid: false,
        error: 'Edge list file is too large (max 100MB)'
      };
    }
    
    if (files.attributesFile.size > maxSize) {
      return {
        valid: false,
        error: 'Attributes file is too large (max 100MB)'
      };
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
    // This would be implemented by the actual processing logic
    // For now, this is a placeholder that would integrate with your backend
    console.log('Processing homogeneous algorithm with:', { files, parameters });
    
    // Validate inputs
    const fileValidation = this.validateFiles(files);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error);
    }

    const paramValidation = this.validateParameters(parameters);
    if (!paramValidation.valid) {
      throw new Error(paramValidation.error);
    }

    // Return mock result structure
    return {
      success: true,
      algorithmId: this.id,
      datasetId: `homogeneous_${Date.now()}`,
      parameters: parameters,
      rootNode: 'c0_l3_0',
      nodeCount: 1000, // Would come from processing
      edgeCount: 5000, // Would come from processing
      processingTime: this.estimateProcessingTime(files, parameters)
    };
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      realTimeUpdate: true,
      exportFormats: ['json', 'graphml', 'csv'],
      visualizationTypes: ['graph', 'hierarchy'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportedFormats: ['.txt', '.csv']
    };
  }

  estimateProcessingTime(files, parameters) {
    // More specific estimation for homogeneous algorithm
    let totalSize = 0;
    if (files.edgeListFile) totalSize += files.edgeListFile.size;
    if (files.attributesFile) totalSize += files.attributesFile.size;
    
    // Homogeneous processing is generally faster
    const baseTime = Math.ceil(totalSize / (2 * 1024 * 1024)); // 2MB per second
    const complexityFactor = Math.log10(parameters.k || 25) / 2; // k affects processing time
    
    return Math.max(3, Math.ceil(baseTime * complexityFactor));
  }

  getOptimalParameters(fileStats) {
    // Suggest optimal parameters based on file statistics
    const nodeCount = fileStats?.nodeCount || 1000;
    const edgeCount = fileStats?.edgeCount || 5000;
    
    // Rule of thumb: k should be roughly sqrt(nodeCount) for good hierarchy
    const suggestedK = Math.max(5, Math.min(100, Math.ceil(Math.sqrt(nodeCount))));
    
    return {
      k: suggestedK,
      reasoning: `Suggested k=${suggestedK} based on ${nodeCount} nodes for optimal hierarchy depth`
    };
  }
}

export default HomogeneousAlgorithm;