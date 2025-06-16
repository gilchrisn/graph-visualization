import React from 'react';
import { useState, useCallback } from 'react';

// =======================================================================================
// Enhanced Structure-Aware Fisheye Integration for PPRviz
// =======================================================================================

/**
 * Enhanced StructureFisheyeManager with improved optimization and PPRviz integration
 */
class StructureFisheyeManager {
  constructor() {
    this.originalLayout = null;        // PPRviz coordinates
    this.currentLayout = null;         // Current fisheye-distorted layout
    this.edges = [];                   // Graph edges
    this.focusPoint = { x: 0, y: 0 };  // Current focus center
    this.magnification = 3.0;          // Magnification factor
    this.isActive = false;             // Whether fisheye is currently active
    
    // Optimization parameters
    this.maxIterations = 15;           // Reduced for performance
    this.convergenceThreshold = 0.5;   // Adjusted for better balance
    
    // Enhanced constraint weights
    this.weights = {
      structure: 1.0,      // ωˢ - structure preservation
      readability: 0.8,    // ωʳ - readability constraints  
      temporal: 0.4        // ωᵗ - temporal coherence
    };

    // Performance tracking
    this.lastUpdateTime = 0;
    this.updateThrottle = 16; // ~60 FPS
  }

  /**
   * Initialize fisheye with PPRviz data
   * @param {Array} nodes - PPRviz nodes with {id, x, y, radius, type, metadata}
   * @param {Array} edges - PPRviz edges with {source, target}
   */
  initialize(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      console.warn('No nodes provided for fisheye initialization');
      return;
    }

    this.originalLayout = nodes.map(node => ({
      id: node.id,
      x: parseFloat(node.x) || 0,
      y: parseFloat(node.y) || 0,
      radius: parseFloat(node.radius) || 20,
      type: node.type || 'default',
      metadata: node.metadata || {},
      // Store original PPRviz data
      pprvizData: {
        importance: node.metadata?.dpr || node.metadata?.importance || 0,
        leafCount: node.metadata?.leafCount || 1,
        degree: node.metadata?.degree || 0
      }
    }));

    this.edges = (edges || []).map(edge => ({
      source: String(edge.source),
      target: String(edge.target),
      weight: parseFloat(edge.weight) || 1
    }));

    this.currentLayout = JSON.parse(JSON.stringify(this.originalLayout));
    
    console.log('Enhanced fisheye initialized with', nodes.length, 'nodes and', this.edges.length, 'edges');
    console.log('Node bounds:', this.computeLayoutBounds());
  }

  /**
   * Apply structure-aware fisheye transformation with throttling
   * @param {Object} focusPoint - {x, y} focus center in screen coordinates
   * @param {number} magnification - Magnification factor (default: 3.0)
   * @returns {Array} Transformed node positions
   */
  applyFisheye(focusPoint, magnification = 3.0) {
    // Throttle updates for performance
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) {
      return this.getCurrentCytoscapeElements();
    }
    this.lastUpdateTime = now;

    if (!this.originalLayout || this.originalLayout.length === 0) {
      console.warn('Fisheye not initialized');
      return [];
    }

    this.focusPoint = focusPoint;
    this.magnification = Math.max(1.0, Math.min(10.0, magnification)); // Clamp values
    this.isActive = true;

    try {
      // Step 1: Compute geometric fisheye target positions
      const geometricTarget = this.computeGeometricFisheye();
      
      // Step 2: Run structure-aware optimization
      const optimizedLayout = this.optimizeStructureAware(geometricTarget);
      
      // Step 3: Update current layout
      this.currentLayout = optimizedLayout;
      
      return this.getCurrentCytoscapeElements();
    } catch (error) {
      console.error('Error applying fisheye:', error);
      return this.getCurrentCytoscapeElements();
    }
  }

  /**
   * Improved geometric fisheye computation
   */
  computeGeometricFisheye() {
    const target = [];
    const focus = this.focusPoint;
    const m = this.magnification;
    
    // Find domain boundary with padding
    const bounds = this.computeLayoutBounds();
    const padding = 100; // Add padding to boundary
    bounds.minX -= padding;
    bounds.maxX += padding;
    bounds.minY -= padding;
    bounds.maxY += padding;
    
    for (const node of this.originalLayout) {
      const xi = { x: node.x, y: node.y };
      
      // Calculate distance from focus
      const distanceToFocus = this.distance(xi, focus);
      
      // Avoid division by zero for nodes at focus
      if (distanceToFocus < 1e-6) {
        target.push({ ...node });
        continue;
      }
      
      // Find boundary point bi by extending line from focus through xi
      const direction = this.normalize({
        x: xi.x - focus.x,
        y: xi.y - focus.y
      });
      
      const bi = this.findBoundaryIntersection(focus, direction, bounds);
      
      // Distance ratio βᵢ
      const distanceToBoundary = this.distance(bi, focus);
      const beta = Math.min(0.99, distanceToFocus / Math.max(distanceToBoundary, 1)); // Prevent values >= 1
      
      // Nonlinear distortion β'ᵢ
      const betaPrime = ((m + 1) * beta) / (m * beta + 1);
      
      // New position x'ᵢ
      const newPos = {
        x: focus.x + (bi.x - focus.x) * betaPrime,
        y: focus.y + (bi.y - focus.y) * betaPrime
      };
      
      target.push({
        ...node,
        x: newPos.x,
        y: newPos.y
      });
    }
    
    return target;
  }

  /**
   * Enhanced structure-aware optimization
   */
  optimizeStructureAware(geometricTarget) {
    let currentPositions = JSON.parse(JSON.stringify(this.originalLayout));
    let prevPositions = JSON.parse(JSON.stringify(currentPositions));
    
    const dampingFactor = 0.8; // Add damping for stability
    
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      // Compute constraints for this iteration
      const structureConstraints = this.computeStructureConstraints(currentPositions, geometricTarget);
      const readabilityConstraints = this.computeReadabilityConstraints(currentPositions);
      const temporalConstraints = this.computeTemporalConstraints(currentPositions, prevPositions);
      
      // Store previous positions for temporal coherence
      prevPositions = JSON.parse(JSON.stringify(currentPositions));
      
      // Solve optimization with enhanced solver
      const newPositions = this.solveOptimizationEnhanced(
        currentPositions, 
        structureConstraints, 
        readabilityConstraints, 
        temporalConstraints,
        dampingFactor
      );
      
      // Apply damping to prevent oscillation
      for (let i = 0; i < currentPositions.length; i++) {
        currentPositions[i].x = currentPositions[i].x * (1 - dampingFactor) + newPositions[i].x * dampingFactor;
        currentPositions[i].y = currentPositions[i].y * (1 - dampingFactor) + newPositions[i].y * dampingFactor;
      }
      
      // Check convergence
      const change = this.computeLayoutChange(currentPositions, prevPositions);
      if (change < this.convergenceThreshold) {
        console.log(`Fisheye converged at iteration ${iteration} with change ${change.toFixed(3)}`);
        break;
      }
    }
    
    return currentPositions;
  }

  /**
   * Enhanced structure constraints computation
   */
  computeStructureConstraints(currentLayout, targetLayout) {
    const constraints = [];
    
    for (const edge of this.edges) {
      const sourceNode = currentLayout.find(n => n.id === edge.source);
      const targetNode = currentLayout.find(n => n.id === edge.target);
      const sourceTarget = targetLayout.find(n => n.id === edge.source);
      const targetTarget = targetLayout.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode && sourceTarget && targetTarget) {
        // Original edge orientation eˢᵢⱼ
        const originalEdge = {
          x: sourceNode.x - targetNode.x,
          y: sourceNode.y - targetNode.y
        };
        
        const originalLength = this.distance(sourceNode, targetNode);
        if (originalLength < 1e-6) continue; // Skip zero-length edges
        
        const edgeOrientation = this.normalize(originalEdge);
        
        // Target edge length dˢᵢⱼ from geometric fisheye
        const targetLength = this.distance(sourceTarget, targetTarget);
        
        // Weight by edge importance (if available)
        const edgeWeight = this.computeEdgeImportance(sourceNode, targetNode);
        
        constraints.push({
          sourceId: edge.source,
          targetId: edge.target,
          orientation: edgeOrientation,
          targetLength: targetLength,
          originalLength: originalLength,
          weight: this.weights.structure * edgeWeight
        });
      }
    }
    
    return constraints;
  }

  /**
   * Compute edge importance based on node metadata
   */
  computeEdgeImportance(sourceNode, targetNode) {
    const sourceImportance = sourceNode.pprvizData?.importance || 0;
    const targetImportance = targetNode.pprvizData?.importance || 0;
    
    // Higher weight for edges connecting important nodes
    const maxImportance = Math.max(sourceImportance, targetImportance);
    return 1.0 + maxImportance * 2.0; // Scale importance
  }

  /**
   * Enhanced readability constraints
   */
  computeReadabilityConstraints(currentLayout) {
    const constraints = [];
    const focalRadius = Math.min(window.innerWidth, window.innerHeight) * 0.3; // Increased focal area
    
    // Find nodes in focal area
    const focalNodes = currentLayout.filter(node => 
      this.distance(node, this.focusPoint) < focalRadius
    );
    
    // Non-overlapping constraints with adaptive spacing
    for (let i = 0; i < focalNodes.length; i++) {
      for (let j = i + 1; j < focalNodes.length; j++) {
        const nodeA = focalNodes[i];
        const nodeB = focalNodes[j];
        
        // Adaptive spacing based on node importance
        const baseSpacing = 8;
        const importanceA = nodeA.pprvizData?.importance || 0;
        const importanceB = nodeB.pprvizData?.importance || 0;
        const extraSpacing = (importanceA + importanceB) * 50; // More space for important nodes
        
        const requiredDistance = nodeA.radius + nodeB.radius + baseSpacing + extraSpacing;
        const currentDistance = this.distance(nodeA, nodeB);
        
        if (currentDistance < requiredDistance) {
          constraints.push({
            type: 'separation',
            sourceId: nodeA.id,
            targetId: nodeB.id,
            minDistance: requiredDistance,
            currentDistance: currentDistance,
            weight: this.weights.readability
          });
        }
      }
    }
    
    return constraints;
  }

  /**
   * Enhanced temporal constraints
   */
  computeTemporalConstraints(currentLayout, prevLayout) {
    const constraints = [];
    
    for (let i = 0; i < currentLayout.length; i++) {
      const current = currentLayout[i];
      const prev = prevLayout[i];
      
      // Adaptive temporal weight based on distance from focus
      const distanceFromFocus = this.distance(current, this.focusPoint);
      const maxDistance = Math.max(window.innerWidth, window.innerHeight);
      const normalizedDistance = Math.min(1.0, distanceFromFocus / maxDistance);
      
      // Nodes closer to focus can move more freely
      const adaptiveWeight = this.weights.temporal * (0.5 + normalizedDistance * 0.5);
      
      constraints.push({
        nodeId: current.id,
        prevPosition: { x: prev.x, y: prev.y },
        weight: adaptiveWeight
      });
    }
    
    return constraints;
  }

  /**
   * Enhanced optimization solver with better force integration
   */
  solveOptimizationEnhanced(currentLayout, structureConstraints, readabilityConstraints, temporalConstraints, dampingFactor) {
    const newLayout = JSON.parse(JSON.stringify(currentLayout));
    const forces = new Map(); // Store accumulated forces for each node
    
    // Initialize forces
    newLayout.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 });
    });
    
    // Apply structure constraints
    for (const constraint of structureConstraints) {
      const sourceNode = newLayout.find(n => n.id === constraint.sourceId);
      const targetNode = newLayout.find(n => n.id === constraint.targetId);
      
      if (sourceNode && targetNode) {
        // Compute desired edge vector
        const desiredEdge = {
          x: constraint.orientation.x * constraint.targetLength,
          y: constraint.orientation.y * constraint.targetLength
        };
        
        // Current edge vector
        const currentEdge = {
          x: sourceNode.x - targetNode.x,
          y: sourceNode.y - targetNode.y
        };
        
        // Error vector with adaptive learning rate
        const error = {
          x: (desiredEdge.x - currentEdge.x) * constraint.weight,
          y: (desiredEdge.y - currentEdge.y) * constraint.weight
        };
        
        // Accumulate forces
        const sourceForce = forces.get(constraint.sourceId);
        const targetForce = forces.get(constraint.targetId);
        
        sourceForce.x += error.x * 0.5;
        sourceForce.y += error.y * 0.5;
        targetForce.x -= error.x * 0.5;
        targetForce.y -= error.y * 0.5;
      }
    }
    
    // Apply readability constraints
    for (const constraint of readabilityConstraints) {
      if (constraint.type === 'separation') {
        const nodeA = newLayout.find(n => n.id === constraint.sourceId);
        const nodeB = newLayout.find(n => n.id === constraint.targetId);
        
        if (nodeA && nodeB && constraint.currentDistance > 0) {
          const pushDirection = this.normalize({
            x: nodeB.x - nodeA.x,
            y: nodeB.y - nodeA.y
          });
          
          const pushStrength = (constraint.minDistance - constraint.currentDistance) * constraint.weight;
          
          const forceA = forces.get(constraint.sourceId);
          const forceB = forces.get(constraint.targetId);
          
          forceA.x -= pushDirection.x * pushStrength * 0.5;
          forceA.y -= pushDirection.y * pushStrength * 0.5;
          forceB.x += pushDirection.x * pushStrength * 0.5;
          forceB.y += pushDirection.y * pushStrength * 0.5;
        }
      }
    }
    
    // Apply temporal constraints and update positions
    const learningRate = 0.1;
    for (const node of newLayout) {
      const force = forces.get(node.id);
      const temporalConstraint = temporalConstraints.find(c => c.nodeId === node.id);
      
      if (temporalConstraint) {
        // Add temporal force towards previous position
        const temporalForce = {
          x: (temporalConstraint.prevPosition.x - node.x) * temporalConstraint.weight,
          y: (temporalConstraint.prevPosition.y - node.y) * temporalConstraint.weight
        };
        
        force.x += temporalForce.x;
        force.y += temporalForce.y;
      }
      
      // Apply accumulated forces with damping
      node.x += force.x * learningRate * dampingFactor;
      node.y += force.y * learningRate * dampingFactor;
    }
    
    return newLayout;
  }

  /**
   * Reset fisheye to original PPRviz layout
   */
  reset() {
    if (this.originalLayout) {
      this.currentLayout = JSON.parse(JSON.stringify(this.originalLayout));
      this.isActive = false;
    }
    return this.getCurrentCytoscapeElements();
  }

  /**
   * Convert current layout to Cytoscape elements format with enhanced metadata
   */
  getCurrentCytoscapeElements() {
    if (!this.currentLayout) return [];
    
    const elements = [];
    
    // Add nodes with enhanced styling
    for (const node of this.currentLayout) {
      const distanceFromFocus = this.distance(node, this.focusPoint);
      const isInFocus = distanceFromFocus < 100; // 100px focus radius
      
      elements.push({
        data: {
          id: node.id,
          label: node.id,
          size: node.radius,
          type: node.type,
          metadata: {
            ...node.metadata,
            ...node.pprvizData,
            isInFocus: isInFocus,
            distanceFromFocus: distanceFromFocus
          }
        },
        position: {
          x: node.x,
          y: node.y
        },
        classes: [
          node.type === 'leaf' ? 'leaf' : 'supernode',
          isInFocus ? 'in-focus' : 'out-focus',
          this.isActive ? 'fisheye-active' : ''
        ].filter(Boolean).join(' ')
      });
    }
    
    // Add edges
    for (const edge of this.edges) {
      elements.push({
        data: {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          weight: edge.weight
        },
        classes: this.isActive ? 'fisheye-active' : ''
      });
    }
    
    return elements;
  }

  // ===================================================================================
  // Enhanced Utility Methods
  // ===================================================================================

  distance(a, b) {
    if (!a || !b) return 0;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  normalize(vector) {
    if (!vector) return { x: 0, y: 0 };
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
  }

  computeLayoutBounds() {
    if (!this.originalLayout || this.originalLayout.length === 0) {
      return { minX: 0, maxX: 800, minY: 0, maxY: 600 };
    }
    
    const xs = this.originalLayout.map(n => n.x).filter(x => !isNaN(x));
    const ys = this.originalLayout.map(n => n.y).filter(y => !isNaN(y));
    
    if (xs.length === 0 || ys.length === 0) {
      return { minX: 0, maxX: 800, minY: 0, maxY: 600 };
    }
    
    const padding = 200; // Increased padding
    return {
      minX: Math.min(...xs) - padding,
      maxX: Math.max(...xs) + padding,
      minY: Math.min(...ys) - padding,
      maxY: Math.max(...ys) + padding
    };
  }

  findBoundaryIntersection(focus, direction, bounds) {
    const { minX, maxX, minY, maxY } = bounds;
    
    // Calculate intersections with all four boundaries
    const intersections = [];
    
    // Right boundary (x = maxX)
    if (direction.x > 0) {
      const t = (maxX - focus.x) / direction.x;
      const y = focus.y + t * direction.y;
      if (y >= minY && y <= maxY) {
        intersections.push({ x: maxX, y: y, distance: t });
      }
    }
    
    // Left boundary (x = minX)
    if (direction.x < 0) {
      const t = (minX - focus.x) / direction.x;
      const y = focus.y + t * direction.y;
      if (y >= minY && y <= maxY) {
        intersections.push({ x: minX, y: y, distance: t });
      }
    }
    
    // Top boundary (y = maxY)
    if (direction.y > 0) {
      const t = (maxY - focus.y) / direction.y;
      const x = focus.x + t * direction.x;
      if (x >= minX && x <= maxX) {
        intersections.push({ x: x, y: maxY, distance: t });
      }
    }
    
    // Bottom boundary (y = minY)
    if (direction.y < 0) {
      const t = (minY - focus.y) / direction.y;
      const x = focus.x + t * direction.x;
      if (x >= minX && x <= maxX) {
        intersections.push({ x: x, y: minY, distance: t });
      }
    }
    
    // Return the closest valid intersection
    if (intersections.length > 0) {
      const closest = intersections.reduce((prev, curr) => 
        curr.distance < prev.distance ? curr : prev
      );
      return { x: closest.x, y: closest.y };
    }
    
    // Fallback: return a point on the boundary
    return {
      x: Math.max(minX, Math.min(maxX, focus.x + direction.x * 500)),
      y: Math.max(minY, Math.min(maxY, focus.y + direction.y * 500))
    };
  }

  computeLayoutChange(layout1, layout2) {
    if (layout1.length !== layout2.length) return Infinity;
    
    let totalChange = 0;
    for (let i = 0; i < layout1.length; i++) {
      totalChange += this.distance(layout1[i], layout2[i]);
    }
    return totalChange / layout1.length;
  }
}

// =======================================================================================
// Enhanced React Hook for PPRviz Integration
// =======================================================================================

/**
 * Enhanced hook with better error handling and performance
 */
function usePPRvizFisheye() {
  const [fisheyeManager] = useState(() => new StructureFisheyeManager());
  const [isFisheyeActive, setIsFisheyeActive] = useState(false);
  const [lastError, setLastError] = useState(null);

  /**
   * Initialize fisheye with enhanced error handling
   */
  const initializeFisheye = useCallback((cytoscapeElements) => {
    try {
      if (!cytoscapeElements || cytoscapeElements.length === 0) {
        console.warn('No elements provided for fisheye initialization');
        return false;
      }

      const nodes = cytoscapeElements
        .filter(el => el.data && el.data.id && el.position)
        .map(el => ({
          id: el.data.id,
          x: el.position.x,
          y: el.position.y,
          radius: el.data.size || 20,
          type: el.data.type,
          metadata: el.data.metadata
        }));

      const edges = cytoscapeElements
        .filter(el => el.data && el.data.source && el.data.target)
        .map(el => ({
          source: el.data.source,
          target: el.data.target,
          weight: el.data.weight || 1
        }));

      if (nodes.length === 0) {
        console.warn('No valid nodes found for fisheye initialization');
        return false;
      }

      fisheyeManager.initialize(nodes, edges);
      setLastError(null);
      return true;
    } catch (error) {
      console.error('Error initializing fisheye:', error);
      setLastError(error.message);
      return false;
    }
  }, [fisheyeManager]);

  /**
   * Apply fisheye with enhanced error handling
   */
  const applyFisheyeAt = useCallback((screenX, screenY, magnification = 3.0) => {
    try {
      if (!fisheyeManager.originalLayout) {
        console.warn('Fisheye not initialized');
        return null;
      }

      const transformedElements = fisheyeManager.applyFisheye(
        { x: screenX, y: screenY }, 
        magnification
      );
      
      setIsFisheyeActive(true);
      setLastError(null);
      return transformedElements;
    } catch (error) {
      console.error('Error applying fisheye:', error);
      setLastError(error.message);
      return null;
    }
  }, [fisheyeManager]);

  /**
   * Reset with error handling
   */
  const resetFisheye = useCallback(() => {
    try {
      const originalElements = fisheyeManager.reset();
      setIsFisheyeActive(false);
      setLastError(null);
      return originalElements;
    } catch (error) {
      console.error('Error resetting fisheye:', error);
      setLastError(error.message);
      return null;
    }
  }, [fisheyeManager]);

  return {
    initializeFisheye,
    applyFisheyeAt,
    resetFisheye,
    isFisheyeActive,
    fisheyeManager,
    lastError
  };
}

// =======================================================================================
// Export Enhanced Components
// =======================================================================================

export { StructureFisheyeManager, usePPRvizFisheye };