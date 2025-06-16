/**
 * Convert API response data to Cytoscape elements format
 * @param {Object} data - Data from the API
 * @returns {Array} Array of Cytoscape elements
 */
export const transformToCytoscapeElements = (data) => {
  const elements = [];
  
  // Add nodes
    if (data.nodes && Array.isArray(data.nodes)) {
    data.nodes.forEach(node => {
      let nodeSize = node.radius || 30;
      
      // Compute importance locally
      const isHighImportance = (node.metadata?.dpr || node.metadata?.leafDpr || 0) > 0.0001;
      
      elements.push({
        data: {
          id: String(node.id),
          label: String(node.label || node.id),
          size: nodeSize,
          type: node.type || 'default',
          weight: node.weight,
          metadata: {
            ...node.metadata,
            importance: node.metadata?.dpr || node.metadata?.leafDpr || 0,
            isHighImportance: isHighImportance, // Use computed value
            displaySize: nodeSize
          }
        },
        position: {
          x: node.x || 0,
          y: node.y || 0
        },
        classes: [
          node.type || 'default',
          isHighImportance ? 'high-importance' : 'normal-importance', // ✅ Use computed value
          node.type === 'leaf' ? 'leaf-node' : 'supernode'
        ].join(' ')
      });
    });
  }
  
  // Add edges with enhanced metadata
  if (data.edges && Array.isArray(data.edges)) {
    const addedEdges = new Set();
    
    data.edges.forEach(edge => {
      const edgeId = `${edge.source}-${edge.target}`;
      const reverseEdgeId = `${edge.target}-${edge.source}`;
      
      if (!addedEdges.has(edgeId) && !addedEdges.has(reverseEdgeId)) {
        elements.push({
          data: {
            id: edgeId,
            source: String(edge.source),
            target: String(edge.target),
            weight: edge.weight || 1,
            type: edge.type || 'default-edge',
            // Add computed edge properties
            strength: edge.weight || 1
          },
          classes: [
            edge.type || 'default-edge',
            edge.weight > 1 ? 'strong-edge' : 'normal-edge'
          ].join(' ')
        });
        addedEdges.add(edgeId);
      }
    });
  }
  
  return elements;
};


/**
 * Calculate enhanced node statistics with PPRviz-specific metrics
 * @param {Object} cy - Cytoscape instance
 * @param {string} nodeId - Node ID
 * @param {Object} hierarchyData - Hierarchy data
 * @param {Object} mappingData - Mapping data
 * @returns {Object} Enhanced node statistics
 */
export const calculateNodeStatistics = (cy, nodeId, hierarchyData, mappingData) => {
  const node = cy.getElementById(nodeId);
  const nodeData = node.data();
  const incomingEdges = cy.edges(`[target = "${nodeId}"]`).length;
  const outgoingEdges = cy.edges(`[source = "${nodeId}"]`).length;
  
  const stats = {
    id: nodeId,
    type: nodeData.type,
    degree: incomingEdges + outgoingEdges,
    inDegree: incomingEdges,
    outDegree: outgoingEdges,
    // PPRviz-specific metrics
    importance: nodeData.metadata?.importance || 0,
    isHighImportance: nodeData.metadata?.isHighImportance || false
  };
  
  // If it's a supernode, add hierarchical information
  if (hierarchyData[nodeId]) {
    stats.children = hierarchyData[nodeId].children || [];
    stats.childrenCount = stats.children.length;
    stats.leafNodes = mappingData[nodeId] || [];
    stats.leafNodeCount = stats.leafNodes.length;
  }
  
  // Add metadata from the node
  if (nodeData.metadata) {
    stats.metadata = nodeData.metadata;
  }
  
  return stats;
};



/**
 * Format PPRviz-specific values for display
 * @param {number} value - Value to format
 * @param {string} type - Type of value ('dpr', 'degree', 'distance', etc.)
 * @returns {string} Formatted string
 */
export const formatPPRvizValue = (value, type = 'default') => {
  if (value === null || value === undefined) return 'N/A';
  
  switch (type) {
    case 'dpr':
      // DPR values are typically very small
      if (value < 1e-6) return value.toExponential(2);
      return value.toFixed(6);
    
    case 'degree':
      return Math.round(value).toString();
    
    case 'distance':
      return value.toFixed(3);
    
    case 'count':
      return value.toLocaleString();
    
    default:
      if (value < 0.001) return value.toExponential(3);
      if (value < 1) return value.toFixed(4);
      if (value < 1000) return value.toFixed(2);
      return value.toLocaleString();
  }
};

/**
 * Parse binary position data from the server
 * @param {ArrayBuffer} buffer - Binary buffer
 * @returns {Array} Array of floating point values
 */
export const parseBinaryPositionData = (buffer) => {
  return new Float64Array(buffer);
};

/**
 * Generate mock position data for testing
 * @param {Array} nodeIds - Array of node IDs
 * @returns {Object} Object with positions and radii
 */
export const generateMockPositions = (nodeIds) => {
  const positions = {};
  const radiuses = {};
  
  nodeIds.forEach((id, index) => {
    // Create a circular layout
    const angle = (2 * Math.PI * index) / nodeIds.length;
    const radius = 200;
    positions[id] = {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
    
    // Random radius values between 20 and 50
    radiuses[id] = Math.floor(Math.random() * 30) + 20;
  });
  
  return { positions, radiuses };
};

/**
 * Find the path to a node in the hierarchy
 * @param {string} nodeId - Target node ID
 * @param {Object} hierarchyData - Hierarchy structure
 * @returns {Array} Path of supernode IDs
 */
export const findPathToNode = (nodeId, hierarchyData) => {
  // Convert nodeId to string for comparison
  const targetId = String(nodeId);
  
  // Function to check if a supernode contains the target node
  const containsNode = (supernodeId) => {
    const children = hierarchyData[supernodeId]?.children || [];
    return children.some(child => String(child) === targetId);
  };
  
  // Function to recursively find the path
  const findPath = (currentId, path = []) => {
    // Add current node to path
    path.push(currentId);
    
    // If this supernode directly contains the target, we're done
    if (containsNode(currentId)) {
      return path;
    }
    
    // Otherwise, check all children that are supernodes
    const children = hierarchyData[currentId]?.children || [];
    for (const childId of children) {
      // Skip leaf nodes (numbers in our implementation)
      if (typeof childId === 'number' || !hierarchyData[childId]) continue;
      
      // Recursively check this child
      const result = findPath(childId, [...path]);
      if (result) return result;
    }
    
    // No path found through this node
    return null;
  };
  
  // Start from the root node (typically c0_l3_0)
  const rootNodeId = Object.keys(hierarchyData).find(id => id.includes('_l3_'));
  if (!rootNodeId) return [];
  
  return findPath(rootNodeId) || [];
};

