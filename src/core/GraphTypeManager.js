/**
 * Graph Type Management System
 * Separates homogeneous and heterogeneous graph handling
 */
class GraphTypeManager {
  constructor() {
    this.graphTypes = new Map();
    this.initializeGraphTypes();
  }

  /**
   * Initialize built-in graph types
   */
  initializeGraphTypes() {
    // Homogeneous Graph Type
    this.register({
      id: 'homogeneous',
      name: 'Homogeneous Graphs',
      description: 'Single-type network with uniform node and edge types',
      fileRequirements: {
        count: 2,
        types: ['edgeList', 'attributes'],
        extensions: ['.txt', '.csv'],
        descriptions: {
          edgeList: 'Space-separated node pairs, each on a new line',
          attributes: 'Contains node and edge counts'
        }
      },
      supportedAlgorithms: ['homogeneous'],
      defaultAlgorithm: 'homogeneous'
    });

    // Heterogeneous Graph Type
    this.register({
      id: 'heterogeneous',
      name: 'Heterogeneous Graphs',
      description: 'Multi-type networks with different node and edge types',
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
      supportedAlgorithms: ['heterogeneous', 'scar'],
      defaultAlgorithm: 'heterogeneous'
    });
  }

  /**
   * Register a new graph type
   */
  register(graphType) {
    if (!this.validateGraphType(graphType)) {
      throw new Error(`Invalid graph type configuration: ${graphType.id}`);
    }
    
    this.graphTypes.set(graphType.id, graphType);
    console.log(`Graph type registered: ${graphType.id}`);
  }

  /**
   * Get graph type by ID
   */
  getGraphType(id) {
    const graphType = this.graphTypes.get(id);
    if (!graphType) {
      throw new Error(`Graph type not found: ${id}`);
    }
    return graphType;
  }

  /**
   * Get all available graph types
   */
  getAllGraphTypes() {
    return Array.from(this.graphTypes.values());
  }

  /**
   * Get graph type by algorithm
   */
  getGraphTypeByAlgorithm(algorithmId) {
    for (const graphType of this.graphTypes.values()) {
      if (graphType.supportedAlgorithms.includes(algorithmId)) {
        return graphType;
      }
    }
    throw new Error(`No graph type found for algorithm: ${algorithmId}`);
  }

  /**
   * Get algorithms for a graph type
   */
  getAlgorithmsForGraphType(graphTypeId) {
    const graphType = this.getGraphType(graphTypeId);
    return graphType.supportedAlgorithms;
  }

  /**
   * Check if algorithms are compatible for comparison
   */
  areAlgorithmsCompatible(algorithm1Id, algorithm2Id) {
    try {
      const graphType1 = this.getGraphTypeByAlgorithm(algorithm1Id);
      const graphType2 = this.getGraphTypeByAlgorithm(algorithm2Id);
      return graphType1.id === graphType2.id;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get comparison pairs for a graph type
   */
  getComparisonPairs(graphTypeId) {
    const algorithms = this.getAlgorithmsForGraphType(graphTypeId);
    const pairs = [];
    
    for (let i = 0; i < algorithms.length; i++) {
      for (let j = i + 1; j < algorithms.length; j++) {
        pairs.push({
          algorithm1: algorithms[i],
          algorithm2: algorithms[j],
          graphType: graphTypeId
        });
      }
    }
    
    return pairs;
  }

  /**
   * Validate graph type configuration
   */
  validateGraphType(graphType) {
    const required = ['id', 'name', 'fileRequirements', 'supportedAlgorithms'];
    return required.every(field => graphType[field] !== undefined);
  }

  /**
   * Auto-detect graph type from files
   */
  detectGraphType(files) {
    const fileKeys = Object.keys(files).filter(key => files[key]);
    
    // Check for heterogeneous pattern (4 .dat files)
    const hasHeteroPattern = fileKeys.length === 4 && 
      fileKeys.every(key => key.endsWith('File')) &&
      ['infoFile', 'linkFile', 'nodeFile', 'metaFile'].every(type => fileKeys.includes(type));
    
    if (hasHeteroPattern) {
      return 'heterogeneous';
    }
    
    // Check for homogeneous pattern (2 files)
    const hasHomoPattern = fileKeys.length === 2 &&
      ['edgeListFile', 'attributesFile'].every(type => fileKeys.includes(type));
    
    if (hasHomoPattern) {
      return 'homogeneous';
    }
    
    return null;
  }
}

// Export singleton instance
export default new GraphTypeManager();