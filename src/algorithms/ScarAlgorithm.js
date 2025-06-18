
import BaseAlgorithm from './BaseAlgorithm';

class ScarAlgorithm extends BaseAlgorithm {
  constructor() {
    super({
      id: 'scar',
      name: 'SCAR Algorithm',
      description: 'SCAR algorithm with advanced parameters for heterogeneous networks',
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
        },
        {
          id: 'nk',
          name: 'NK Parameter',
          type: 'number',
          min: 1,
          max: 100,
          default: 10,
          description: 'SCAR NK parameter for clustering granularity',
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
          description: 'SCAR threshold parameter (0.0 - 1.0) for similarity cutoff',
          validation: (value) => typeof value === 'number' && value >= 0 && value <= 1
        }
      ]
    });
  }

  validateFiles(files) {
    // Same validation as heterogeneous algorithm since SCAR uses the same file format
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

    // Validate naming convention
    if (files.infoFile) {
      const infoFileName = files.infoFile.name;
      const datasetName = infoFileName.replace('_info.dat', '');
      
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

    // Validate file sizes (max 500MB each)
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

    if (!parameters.nk || parameters.nk < 1) {
      return {
        valid: false,
        error: 'NK parameter must be a positive integer'
      };
    }

    if (!Number.isInteger(parameters.nk)) {
      return {
        valid: false,
        error: 'NK parameter must be an integer'
      };
    }

    if (parameters.nk > 100) {
      return {
        valid: false,
        error: 'NK parameter must not exceed 100'
      };
    }

    if (parameters.th === undefined || parameters.th < 0 || parameters.th > 1) {
      return {
        valid: false,
        error: 'Threshold must be between 0.0 and 1.0'
      };
    }

    // SCAR-specific validation: nk should be <= k for efficiency
    if (parameters.nk > parameters.k) {
      return {
        valid: false,
        error: 'NK parameter should not exceed cluster size (k) for optimal performance'
      };
    }

    return { valid: true };
  }

  getDefaultParameters() {
    return { 
      k: 25, 
      nk: 10, 
      th: 0.5 
    };
  }

  async process(files, parameters) {
    console.log('Processing SCAR algorithm with:', { files, parameters });
    
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
      datasetId: `${datasetName}_scar`,
      parameters: parameters,
      rootNode: 'c0_l3_0',
      nodeCount: 1800, // SCAR might produce different clustering
      edgeCount: 7200,
      clusterCount: Math.ceil(2000 / parameters.k), // Estimated cluster count
      averageClusterSize: parameters.k * 0.8, // SCAR tends to create smaller clusters
      threshold: parameters.th,
      nkParameter: parameters.nk,
      processingTime: this.estimateProcessingTime(files, parameters),
      scarMetrics: {
        modularity: 0.85,
        conductance: 0.23,
        similarity: parameters.th,
        coverage: 0.92
      }
    };
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      realTimeUpdate: false, // SCAR processing is computationally intensive
      exportFormats: ['json', 'graphml', 'csv', 'gexf', 'scar'],
      visualizationTypes: ['graph', 'hierarchy', 'cluster', 'similarity'],
      maxFileSize: 500 * 1024 * 1024, // 500MB
      supportedFormats: ['.dat'],
      nodeTypes: true,
      edgeTypes: true,
      metaPaths: true,
      clustering: true,
      similarityMeasures: true,
      qualityMetrics: ['modularity', 'conductance', 'coverage']
    };
  }

  estimateProcessingTime(files, parameters) {
    // SCAR processing is more computationally intensive
    let totalSize = 0;
    ['infoFile', 'linkFile', 'nodeFile', 'metaFile'].forEach(fileType => {
      if (files[fileType]) {
        totalSize += files[fileType].size;
      }
    });
    
    // Base processing time
    const baseTime = Math.ceil(totalSize / (512 * 1024)); // 512KB per second (slower than heterogeneous)
    
    // Complexity factors for SCAR
    const kComplexity = 1 + Math.log10(parameters.k || 25) / 3;
    const nkComplexity = 1 + (parameters.nk || 10) / 50; // NK adds computational overhead
    const thComplexity = 1 + (1 - (parameters.th || 0.5)) * 0.5; // Lower threshold = more computation
    const scarComplexity = 3; // SCAR is inherently more complex
    
    return Math.max(15, Math.ceil(baseTime * kComplexity * nkComplexity * thComplexity * scarComplexity));
  }

  getOptimalParameters(fileStats) {
    const nodeCount = fileStats?.nodeCount || 2000;
    const nodeTypes = fileStats?.nodeTypes || 3;
    const edgeCount = fileStats?.edgeCount || 8000;
    
    // SCAR-specific parameter recommendations
    const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);
    
    // k should be smaller for SCAR to capture fine-grained clusters
    const suggestedK = Math.max(5, Math.min(50, Math.ceil(Math.sqrt(nodeCount / nodeTypes) * 0.8)));
    
    // nk should be proportional to k but not exceed it
    const suggestedNk = Math.max(3, Math.min(suggestedK, Math.ceil(suggestedK * 0.4)));
    
    // th should be higher for dense networks, lower for sparse networks
    const suggestedTh = Math.max(0.1, Math.min(0.9, 0.3 + density * 0.4));
    
    return {
      k: suggestedK,
      nk: suggestedNk,
      th: Math.round(suggestedTh * 10) / 10, // Round to 1 decimal place
      reasoning: `Suggested parameters for network with ${nodeCount} nodes, ${edgeCount} edges (density: ${density.toFixed(3)})`
    };
  }

  /**
   * Calculate SCAR similarity metrics
   * @param {Object} clusterResult - Clustering result
   * @returns {Object} - Similarity metrics
   */
  calculateSimilarityMetrics(clusterResult) {
    // Mock implementation - would calculate actual metrics in real implementation
    return {
      modularity: 0.85,
      conductance: 0.23,
      silhouette: 0.76,
      coverage: 0.92,
      performance: 0.68
    };
  }

  /**
   * Get parameter sensitivity analysis
   * @param {Object} baseParameters - Base parameters
   * @returns {Object} - Sensitivity analysis
   */
  getParameterSensitivity(baseParameters) {
    return {
      k: {
        sensitivity: 'high',
        impact: 'Directly affects cluster granularity and hierarchy depth',
        recommendation: 'Test values ±20% from optimal'
      },
      nk: {
        sensitivity: 'medium',
        impact: 'Affects clustering quality and computation time',
        recommendation: 'Keep between 30-50% of k value'
      },
      th: {
        sensitivity: 'high',
        impact: 'Controls similarity threshold for cluster formation',
        recommendation: 'Test in 0.1 increments around optimal value'
      }
    };
  }

  /**
   * Compare SCAR results with other algorithms
   * @param {Object} scarResult - SCAR algorithm result
   * @param {Object} otherResult - Other algorithm result
   * @returns {Object} - Comparison metrics
   */
  compareResults(scarResult, otherResult) {
    return {
      clusterCountDifference: Math.abs(scarResult.clusterCount - otherResult.clusterCount),
      similarityScore: this.calculateResultSimilarity(scarResult, otherResult),
      qualityComparison: {
        scar: scarResult.scarMetrics || {},
        other: otherResult.metrics || {}
      },
      recommendation: this.getComparisonRecommendation(scarResult, otherResult)
    };
  }

  calculateResultSimilarity(result1, result2) {
    // Mock implementation - would calculate actual similarity in real implementation
    const clusterRatio = Math.min(result1.clusterCount, result2.clusterCount) / 
                        Math.max(result1.clusterCount, result2.clusterCount);
    return clusterRatio * 0.7 + 0.3; // Simplified similarity calculation
  }

  getComparisonRecommendation(scarResult, otherResult) {
    if (scarResult.clusterCount < otherResult.clusterCount) {
      return "SCAR produced finer-grained clustering. Consider increasing threshold for coarser clusters.";
    } else {
      return "SCAR produced coarser clustering. Consider decreasing threshold for finer granularity.";
    }
  }
}

export default ScarAlgorithm;