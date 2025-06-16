// utils/structureAwareFisheye.js - Complete implementation based on the paper
import { useState, useCallback, useRef } from 'react';

/**
 * Structure-Aware Fisheye Implementation
 * Based on "Structure-aware Fisheye Views for Efficient Large Graph Exploration"
 * Implements the optimization from Equation (3) with proper constraints
 */
class StructureAwareFisheyeManager {
  constructor() {
    this.originalLayout = null;     // Z^0 - original node positions
    this.currentLayout = null;      // Z^t - current iteration positions
    this.edges = [];                // Graph edges E
    this.focusCenter = { x: 0, y: 0 }; // Focus point c
    this.magnificationFactor = 3.0; // Magnification factor m
    this.isActive = false;
    
    // Optimization parameters
    this.maxIterations = 30;
    this.convergenceThreshold = 1.0;
    this.learningRate = 0.1;
    
    // Constraint weights (ω values from paper)
    this.weights = {
      structure: 1.0,    // ω^s_ij
      readability: 0.8,  // ω^r_ij  
      temporal: 0.6      // ω^t_i
    };
    
    // Fisheye domain bounds
    this.domainBounds = null;
    this.focalRadius = 100; // Ω focal area radius (20% of screen)
  }

  /**
   * Initialize fisheye with graph data
   * @param {Array} nodes - Array of {id, x, y, radius, type, metadata}
   * @param {Array} edges - Array of {source, target, weight}
   */
  initialize(nodes, edges) {
    if (!nodes || nodes.length === 0) {
      console.warn('No nodes provided for fisheye initialization');
      return false;
    }

    // Store original layout X
    this.originalLayout = nodes.map(node => ({
      id: String(node.id),
      x: parseFloat(node.x) || 0,
      y: parseFloat(node.y) || 0,
      radius: parseFloat(node.radius) || 20,
      type: node.type || 'leaf',
      metadata: node.metadata || {}
    }));

    // Store edges E
    this.edges = (edges || []).map(edge => ({
      source: String(edge.source),
      target: String(edge.target),
      weight: parseFloat(edge.weight) || 1.0
    }));

    // Initialize current layout Z^0 = X
    this.currentLayout = JSON.parse(JSON.stringify(this.originalLayout));
    
    // Compute domain bounds
    this.domainBounds = this.computeDomainBounds();
    
    console.log(`Structure-aware fisheye initialized: ${nodes.length} nodes, ${this.edges.length} edges`);
    console.log('Domain bounds:', this.domainBounds);
    
    return true;
  }

  /**
   * Apply structure-aware fisheye transformation
   * Implementation of the complete optimization framework from the paper
   */
  applyFisheye(focusPoint, magnificationFactor = 3.0) {
    if (!this.originalLayout || this.originalLayout.length === 0) {
      console.warn('Fisheye not initialized');
      return null;
    }

    this.focusCenter = focusPoint;
    this.magnificationFactor = Math.max(1.0, Math.min(10.0, magnificationFactor));
    this.isActive = true;

    try {
      // Step 1: Compute geometric fisheye target layout X' (Section 3.1)
      const geometricTarget = this.computeGeometricFisheyeTarget();
      
      // Step 2: Run structure-aware optimization (Section 4, Equation 3)
      const optimizedLayout = this.optimizeStructureAware(geometricTarget);
      
      // Step 3: Update current layout
      this.currentLayout = optimizedLayout;
      
      return this.transformToCytoscapeElements();
    } catch (error) {
      console.error('Error applying structure-aware fisheye:', error);
      return null;
    }
  }

  /**
   * Compute geometric fisheye target layout X'
   * Based on Section 3.1 - Graphical Fisheye
   */
  computeGeometricFisheyeTarget() {
    const target = [];
    const c = this.focusCenter;
    const m = this.magnificationFactor;
    
    for (const node of this.originalLayout) {
      const xi = { x: node.x, y: node.y };
      
      // Skip nodes at focus center to avoid division by zero
      const distanceToFocus = this.euclideanDistance(xi, c);
      if (distanceToFocus < 1e-6) {
        target.push({ ...node });
        continue;
      }

      // Find boundary point bi (Equation 1)
      const direction = this.normalize({
        x: xi.x - c.x,
        y: xi.y - c.y
      });
      
      const bi = this.findBoundaryPoint(c, direction);
      
      // Compute distance ratio βi (Equation 1)
      const distanceToBoundary = this.euclideanDistance(bi, c);
      const beta_i = Math.min(0.99, distanceToFocus / Math.max(distanceToBoundary, 1));
      
      // Apply nonlinear distortion β'i (Equation 1)
      const beta_prime_i = ((m + 1) * beta_i) / (m * beta_i + 1);
      
      // Compute new position x'i (Equation 1)
      const newPosition = {
        x: c.x + (bi.x - c.x) * beta_prime_i,
        y: c.y + (bi.y - c.y) * beta_prime_i
      };
      
      target.push({
        ...node,
        x: newPosition.x,
        y: newPosition.y
      });
    }
    
    return target;
  }

  /**
   * Structure-aware optimization
   * Implements Equation (3) from Section 4
   */
  optimizeStructureAware(geometricTarget) {
    // Initialize Z^0 with geometric target
    let currentPositions = JSON.parse(JSON.stringify(geometricTarget));
    let previousPositions = JSON.parse(JSON.stringify(this.originalLayout));
    
    for (let t = 0; t < this.maxIterations; t++) {
      // Compute constraint terms for iteration t
      const structureConstraints = this.computeStructureConstraints(currentPositions, geometricTarget);
      const readabilityConstraints = this.computeReadabilityConstraints(currentPositions);
      const temporalConstraints = this.computeTemporalConstraints(currentPositions, previousPositions);
      
      // Store previous iteration
      previousPositions = JSON.parse(JSON.stringify(currentPositions));
      
      // Solve optimization problem (Equation 3)
      const newPositions = this.solveOptimization(
        currentPositions,
        structureConstraints,
        readabilityConstraints, 
        temporalConstraints
      );
      
      // Check convergence
      const change = this.computePositionChange(currentPositions, newPositions);
      currentPositions = newPositions;
      
      if (change < this.convergenceThreshold) {
        console.log(`Converged at iteration ${t}, change: ${change.toFixed(3)}`);
        break;
      }
    }
    
    return currentPositions;
  }

  /**
   * Compute structure-based constraints (First term in Equation 3)
   * Preserves edge orientations e^s_ij and lengths d^s_ij
   */
  computeStructureConstraints(currentLayout, geometricTarget) {
    const constraints = [];
    
    for (const edge of this.edges) {
      const sourceIdx = currentLayout.findIndex(n => n.id === edge.source);
      const targetIdx = currentLayout.findIndex(n => n.id === edge.target);
      
      if (sourceIdx === -1 || targetIdx === -1) continue;
      
      const sourceCurrent = currentLayout[sourceIdx];
      const targetCurrent = currentLayout[targetIdx];
      const sourceTarget = geometricTarget[sourceIdx];
      const targetTarget = geometricTarget[targetIdx];
      
      // Compute edge orientation e^s_ij from original layout (Equation 4)
      const originalEdge = {
        x: sourceCurrent.x - targetCurrent.x,
        y: sourceCurrent.y - targetCurrent.y
      };
      
      const originalLength = this.vectorLength(originalEdge);
      if (originalLength < 1e-6) continue;
      
      const edgeOrientation = this.normalize(originalEdge); // e^s_ij
      
      // Compute target edge length d^s_ij from geometric fisheye (Equation 4)
      const targetLength = this.euclideanDistance(sourceTarget, targetTarget); // d^s_ij
      
      constraints.push({
        type: 'structure',
        sourceIdx: sourceIdx,
        targetIdx: targetIdx,
        orientation: edgeOrientation, // e^s_ij
        targetLength: targetLength,   // d^s_ij
        weight: this.weights.structure // ω^s_ij
      });
    }
    
    return constraints;
  }

  /**
   * Compute readability-based constraints (Second term in Equation 3)
   * Prevents node overlaps in focal area Ω
   */
  computeReadabilityConstraints(currentLayout) {
    const constraints = [];
    
    // Find nodes in focal area Ω
    const focalNodes = currentLayout.filter(node => 
      this.euclideanDistance(node, this.focusCenter) < this.focalRadius
    );
    
    // Add virtual edges between all node pairs in focal area
    for (let i = 0; i < focalNodes.length; i++) {
      for (let j = i + 1; j < focalNodes.length; j++) {
        const nodeA = focalNodes[i];
        const nodeB = focalNodes[j];
        
        // Minimum separation distance (Equation 8)
        const minDistance = nodeA.radius + nodeB.radius + 5; // ε = 5px
        const currentDistance = this.euclideanDistance(nodeA, nodeB);
        
        if (currentDistance < minDistance) {
          // Direction to separate nodes (e^r_ij)
          const separation = {
            x: nodeB.x - nodeA.x,
            y: nodeB.y - nodeA.y
          };
          
          const separationLength = this.vectorLength(separation);
          const separationDirection = separationLength > 0 ? 
            this.normalize(separation) : { x: 1, y: 0 };
          
          constraints.push({
            type: 'readability',
            sourceIdx: currentLayout.findIndex(n => n.id === nodeA.id),
            targetIdx: currentLayout.findIndex(n => n.id === nodeB.id),
            orientation: separationDirection, // e^r_ij
            targetLength: minDistance,        // d^r_ij
            weight: this.weights.readability  // ω^r_ij
          });
        }
      }
    }
    
    return constraints;
  }

  /**
   * Compute temporal constraints (Third term in Equation 3)
   * Ensures smooth transitions between iterations
   */
  computeTemporalConstraints(currentLayout, previousLayout) {
    const constraints = [];
    
    for (let i = 0; i < currentLayout.length; i++) {
      constraints.push({
        type: 'temporal',
        nodeIdx: i,
        targetPosition: {
          x: previousLayout[i].x,
          y: previousLayout[i].y
        },
        weight: this.weights.temporal // ω^t_i
      });
    }
    
    return constraints;
  }

  /**
   * Solve the optimization problem from Equation (3)
   * Uses gradient descent to minimize the three-fold objective
   */
  solveOptimization(currentLayout, structureConstraints, readabilityConstraints, temporalConstraints) {
    const newLayout = JSON.parse(JSON.stringify(currentLayout));
    
    // Initialize gradients
    const gradients = newLayout.map(() => ({ x: 0, y: 0 }));
    
    // Compute gradients from structure constraints
    for (const constraint of structureConstraints) {
      const sourceNode = newLayout[constraint.sourceIdx];
      const targetNode = newLayout[constraint.targetIdx];
      
      // Current edge vector
      const currentEdge = {
        x: sourceNode.x - targetNode.x,
        y: sourceNode.y - targetNode.y
      };
      
      // Desired edge vector (e^s_ij * d^s_ij)
      const desiredEdge = {
        x: constraint.orientation.x * constraint.targetLength,
        y: constraint.orientation.y * constraint.targetLength
      };
      
      // Error vector
      const error = {
        x: (currentEdge.x - desiredEdge.x) * constraint.weight,
        y: (currentEdge.y - desiredEdge.y) * constraint.weight
      };
      
      // Accumulate gradients (∂/∂z^t_i and ∂/∂z^t_j)
      gradients[constraint.sourceIdx].x += error.x;
      gradients[constraint.sourceIdx].y += error.y;
      gradients[constraint.targetIdx].x -= error.x;
      gradients[constraint.targetIdx].y -= error.y;
    }
    
    // Compute gradients from readability constraints
    for (const constraint of readabilityConstraints) {
      const sourceNode = newLayout[constraint.sourceIdx];
      const targetNode = newLayout[constraint.targetIdx];
      
      // Current separation vector
      const currentSeparation = {
        x: targetNode.x - sourceNode.x,
        y: targetNode.y - sourceNode.y
      };
      
      // Desired separation vector (e^r_ij * d^r_ij)
      const desiredSeparation = {
        x: constraint.orientation.x * constraint.targetLength,
        y: constraint.orientation.y * constraint.targetLength
      };
      
      // Error vector
      const error = {
        x: (currentSeparation.x - desiredSeparation.x) * constraint.weight,
        y: (currentSeparation.y - desiredSeparation.y) * constraint.weight
      };
      
      // Accumulate gradients
      gradients[constraint.sourceIdx].x -= error.x;
      gradients[constraint.sourceIdx].y -= error.y;
      gradients[constraint.targetIdx].x += error.x;
      gradients[constraint.targetIdx].y += error.y;
    }
    
    // Compute gradients from temporal constraints
    for (const constraint of temporalConstraints) {
      const currentNode = newLayout[constraint.nodeIdx];
      
      // Error from previous position
      const error = {
        x: (currentNode.x - constraint.targetPosition.x) * constraint.weight,
        y: (currentNode.y - constraint.targetPosition.y) * constraint.weight
      };
      
      // Accumulate gradients
      gradients[constraint.nodeIdx].x += error.x;
      gradients[constraint.nodeIdx].y += error.y;
    }
    
    // Apply gradient descent update
    for (let i = 0; i < newLayout.length; i++) {
      newLayout[i].x -= gradients[i].x * this.learningRate;
      newLayout[i].y -= gradients[i].y * this.learningRate;
    }
    
    return newLayout;
  }

  /**
   * Reset fisheye to original layout
   */
  reset() {
    if (this.originalLayout) {
      this.currentLayout = JSON.parse(JSON.stringify(this.originalLayout));
      this.isActive = false;
      return this.transformToCytoscapeElements();
    }
    return null;
  }

  /**
   * Transform current layout to Cytoscape elements
   */
  transformToCytoscapeElements() {
    if (!this.currentLayout) return [];
    
    const elements = [];
    
    // Add nodes
    for (const node of this.currentLayout) {
      elements.push({
        data: {
          id: node.id,
          label: node.id,
          size: node.radius,
          type: node.type,
          metadata: node.metadata
        },
        position: {
          x: node.x,
          y: node.y
        },
        classes: [
          node.type || 'leaf',
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

  // ====================== Utility Methods ======================

  euclideanDistance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  vectorLength(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  normalize(vector) {
    const length = this.vectorLength(vector);
    if (length === 0) return { x: 0, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
  }

  computeDomainBounds() {
    if (!this.originalLayout || this.originalLayout.length === 0) {
      return { minX: -400, maxX: 400, minY: -300, maxY: 300 };
    }
    
    const xs = this.originalLayout.map(n => n.x);
    const ys = this.originalLayout.map(n => n.y);
    const padding = 200;
    
    return {
      minX: Math.min(...xs) - padding,
      maxX: Math.max(...xs) + padding,
      minY: Math.min(...ys) - padding,
      maxY: Math.max(...ys) + padding
    };
  }

  findBoundaryPoint(focus, direction) {
    const bounds = this.domainBounds;
    const intersections = [];
    
    // Check intersection with each boundary
    if (direction.x > 0) {
      const t = (bounds.maxX - focus.x) / direction.x;
      const y = focus.y + t * direction.y;
      if (y >= bounds.minY && y <= bounds.maxY && t > 0) {
        intersections.push({ x: bounds.maxX, y: y, t: t });
      }
    }
    
    if (direction.x < 0) {
      const t = (bounds.minX - focus.x) / direction.x;
      const y = focus.y + t * direction.y;
      if (y >= bounds.minY && y <= bounds.maxY && t > 0) {
        intersections.push({ x: bounds.minX, y: y, t: t });
      }
    }
    
    if (direction.y > 0) {
      const t = (bounds.maxY - focus.y) / direction.y;
      const x = focus.x + t * direction.x;
      if (x >= bounds.minX && x <= bounds.maxX && t > 0) {
        intersections.push({ x: x, y: bounds.maxY, t: t });
      }
    }
    
    if (direction.y < 0) {
      const t = (bounds.minY - focus.y) / direction.y;
      const x = focus.x + t * direction.x;
      if (x >= bounds.minX && x <= bounds.maxX && t > 0) {
        intersections.push({ x: x, y: bounds.minY, t: t });
      }
    }
    
    // Return closest intersection
    if (intersections.length > 0) {
      const closest = intersections.reduce((prev, curr) => 
        curr.t < prev.t ? curr : prev
      );
      return { x: closest.x, y: closest.y };
    }
    
    // Fallback
    return {
      x: focus.x + direction.x * 500,
      y: focus.y + direction.y * 500
    };
  }

  computePositionChange(layout1, layout2) {
    let totalChange = 0;
    for (let i = 0; i < layout1.length; i++) {
      totalChange += this.euclideanDistance(layout1[i], layout2[i]);
    }
    return totalChange / layout1.length;
  }
}

/**
 * React Hook for Structure-Aware Fisheye
 */
export function usePPRvizFisheye() {
  const [fisheyeManager] = useState(() => new StructureAwareFisheyeManager());
  const [isFisheyeActive, setIsFisheyeActive] = useState(false);
  const [lastError, setLastError] = useState(null);
  const lastUpdateRef = useRef(0);

  const initializeFisheye = useCallback((cytoscapeElements) => {
    try {
      if (!cytoscapeElements || cytoscapeElements.length === 0) {
        setLastError('No elements provided');
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

      const success = fisheyeManager.initialize(nodes, edges);
      
      if (success) {
        setLastError(null);
        console.log('Structure-aware fisheye initialized successfully');
      } else {
        setLastError('Failed to initialize fisheye');
      }
      
      return success;
    } catch (error) {
      console.error('Error initializing fisheye:', error);
      setLastError(error.message);
      return false;
    }
  }, [fisheyeManager]);

  const applyFisheyeAt = useCallback((screenX, screenY, magnification = 3.0) => {
    try {
      // Throttle updates for performance (60 FPS)
      const now = Date.now();
      if (now - lastUpdateRef.current < 16) {
        return fisheyeManager.transformToCytoscapeElements();
      }
      lastUpdateRef.current = now;

      const transformedElements = fisheyeManager.applyFisheye(
        { x: screenX, y: screenY }, 
        magnification
      );
      
      if (transformedElements) {
        setIsFisheyeActive(true);
        setLastError(null);
      }
      
      return transformedElements;
    } catch (error) {
      console.error('Error applying fisheye:', error);
      setLastError(error.message);
      return null;
    }
  }, [fisheyeManager]);

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