// components/GraphVisualization/GraphVisualization.js - Updated with processing type support
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, Spinner, Alert, Form, InputGroup, Button, ButtonGroup, Badge } from 'react-bootstrap';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import fcose from 'cytoscape-fcose';
import { useGraph } from '../../context/GraphContext';
import BreadcrumbNav from '../Navigation/BreadcrumbNav';
import NodeInfoPanel from '../NodeInfo/NodeInfoPanel';
import api from '../../services/api';
import useLayoutManager from '../../hooks/useLayoutManager';
import { usePPRvizFisheye } from '../../utils/structureAwareFisheye';
import { 
  cytoscapeStylesheet, 
  layoutOptions, 
  setupCytoscapeEvents, 
  initializeCytoscape 
} from '../../utils/cytoscapeConfig';
import { 
  transformToCytoscapeElements, 
  calculateNodeStatistics 
} from '../../utils/dataTransformers';
import './GraphVisualization.css';

// Register Cytoscape extensions
initializeCytoscape(cytoscape, coseBilkent, fcose);

const GraphVisualization = () => {
  const {
    loading,
    setLoading,
    error,
    setError,
    fileUploaded,
    dataset,
    setDataset,
    currentSupernode,
    setCurrentSupernode,
    breadcrumbPath,
    setBreadcrumbPath,
    cytoscapeElements,
    setCytoscapeElements,
    selectedNode,
    setSelectedNode,
    nodeStatistics,
    setNodeStatistics,
    processingStep,
    setProcessingStep,
    k,
    setK,
    hierarchyData,
    setHierarchyData,
    mappingData,
    setMappingData,
    // NEW: Processing type support
    processingType,
    setProcessingType,
    nk,
    setNk,
    th,
    setTh
  } = useGraph();

  // Cytoscape instance reference
  const cyRef = useRef(null);
  
  // Local state for visualization settings
  const [layout, setLayout] = useState('preset');
  const [localK, setLocalK] = useState(k);
  
  // NEW: Local SCAR parameters
  const [localNk, setLocalNk] = useState(nk);
  const [localTh, setLocalTh] = useState(th);

  // UPDATED: Enhanced fisheye state management
  const [fisheyeEnabled, setFisheyeEnabled] = useState(false);
  const [magnificationFactor, setMagnificationFactor] = useState(3.0);
  const [fisheyeStatus, setFisheyeStatus] = useState('Disabled');
  const [fisheyeStats, setFisheyeStats] = useState({
    nodes: 0,
    edges: 0,
    iterations: 0,
    lastUpdateTime: 0
  });
  
  // UPDATED: Structure-aware fisheye hook
  const {
    initializeFisheye,
    applyFisheyeAt,
    resetFisheye,
    isFisheyeActive,
    fisheyeManager,
    lastError
  } = usePPRvizFisheye();

  // Use the layout manager hook
  const applyLayout = useLayoutManager(cyRef, cytoscapeElements, layout);

  // Load node statistics from the backend with processing type support
  const loadNodeStatistics = useCallback(async (nodeId) => {
    if (!dataset || !nodeId) return;
    
    try {
      const response = await api.getNodeStatistics(dataset, k, nodeId, processingType);
      
      if (response.success) {
        setNodeStatistics(response.statistics);
      } else {
        console.error('Error loading node statistics:', response.message);
        setError(`Error loading node statistics: ${response.message}`);
      }
    } catch (err) {
      console.error('Error loading node statistics:', err);
      setError(`Error loading node statistics: ${err.message}`);
    }
  }, [dataset, k, processingType, setNodeStatistics, setError]);

  // UPDATED: Enhanced mouse move handler with proper coordinate conversion
  const handleCytoscapeMouseMove = useCallback((event) => {
    if (!fisheyeEnabled || !isFisheyeActive || !cyRef.current) {
      return;
    }
    
    try {
      const cy = cyRef.current;
      
      // Get proper screen coordinates from Cytoscape event
      let screenX, screenY;
      
      if (event.renderedPosition) {
        // Mouse move event - use rendered position
        screenX = event.renderedPosition.x;
        screenY = event.renderedPosition.y;
      } else if (event.position) {
        // Convert graph position to screen position
        const renderedPos = cy.$(cy.nodes()[0]).renderedPosition();
        screenX = event.position.x;
        screenY = event.position.y;
      } else {
        return;
      }
      
      // Apply fisheye transformation
      const startTime = performance.now();
      const transformedElements = applyFisheyeAt(screenX, screenY, magnificationFactor);
      const endTime = performance.now();
      
      if (transformedElements && transformedElements.length > 0) {
        // Update Cytoscape positions efficiently
        cy.batch(() => {
          let updatedCount = 0;
          transformedElements.forEach(element => {
            if (element.position && element.data && element.data.id) {
              const cyElement = cy.getElementById(element.data.id);
              if (cyElement.length > 0) {
                cyElement.position(element.position);
                updatedCount++;
              }
            }
          });
          
          // Update stats
          setFisheyeStats({
            nodes: updatedCount,
            edges: transformedElements.filter(e => e.data.source).length,
            iterations: fisheyeManager.maxIterations,
            lastUpdateTime: endTime - startTime
          });
        });
        
        setFisheyeStatus(`Active at (${screenX.toFixed(0)}, ${screenY.toFixed(0)})`);
      } else {
        setFisheyeStatus('No transformation applied');
      }
    } catch (err) {
      console.error('Error in fisheye mouse move:', err);
      setFisheyeStatus(`Error: ${err.message}`);
    }
  }, [fisheyeEnabled, isFisheyeActive, applyFisheyeAt, magnificationFactor, fisheyeManager]);

  // UPDATED: Enhanced fisheye toggle with better initialization
  const toggleFisheye = useCallback(() => {
    console.log('🔄 Toggle fisheye clicked. Current state:', { 
      fisheyeEnabled, 
      elementsCount: cytoscapeElements.length 
    });
    
    if (!fisheyeEnabled) {
      // Enable fisheye
      if (cytoscapeElements.length === 0) {
        setFisheyeStatus('❌ No elements loaded');
        console.warn('No elements loaded for fisheye');
        return;
      }

      setFisheyeStatus('🔄 Initializing structure-aware fisheye...');
      console.log('Initializing fisheye with elements:', cytoscapeElements.length);
      
      // Initialize fisheye with proper error handling
      const initSuccess = initializeFisheye(cytoscapeElements);
      
      if (initSuccess) {
        setFisheyeEnabled(true);
        setFisheyeStatus('✅ Structure-aware fisheye enabled');
        console.log('✅ Structure-aware fisheye enabled successfully');
        
        // Set up mouse tracking
        if (cyRef.current) {
          console.log('🖱️ Setting up mouse tracking...');
          cyRef.current.on('mousemove', handleCytoscapeMouseMove);
        } else {
          console.warn('⚠️ No cytoscape instance for mouse tracking');
          setFisheyeStatus('⚠️ Warning: No cytoscape instance');
        }
      } else {
        setFisheyeStatus(`❌ Failed to initialize: ${lastError || 'Unknown error'}`);
        console.error('Failed to initialize fisheye:', lastError);
      }
    } else {
      // Disable fisheye
      setFisheyeStatus('🔄 Disabling fisheye...');
      console.log('Disabling structure-aware fisheye');
      
      const restoredElements = resetFisheye();
      if (restoredElements && restoredElements.length > 0) {
        setCytoscapeElements(restoredElements);
        setFisheyeStatus('✅ Fisheye disabled - original layout restored');
      } else {
        setFisheyeStatus('⚠️ Fisheye disabled - some issues with restoration');
      }
      
      setFisheyeEnabled(false);
      
      // Remove mouse tracking
      if (cyRef.current) {
        cyRef.current.removeListener('mousemove', handleCytoscapeMouseMove);
        console.log('Mouse tracking disabled');
      }
      
      // Reset stats
      setFisheyeStats({ nodes: 0, edges: 0, iterations: 0, lastUpdateTime: 0 });
    }
  }, [
    fisheyeEnabled, 
    cytoscapeElements, 
    initializeFisheye,
    resetFisheye,
    setCytoscapeElements,
    handleCytoscapeMouseMove,
    lastError
  ]);

  // UPDATED: Enhanced node click handler with fisheye focus
  const handleNodeClick = useCallback((event) => {
    const clickedNode = event.target;
    const nodeId = clickedNode.id();
    const nodeData = clickedNode.data();
    
    console.log('Node clicked:', nodeData);
    setSelectedNode(nodeData);
    loadNodeStatistics(nodeId);

    // Apply fisheye focus on node click if enabled
    if (fisheyeEnabled && isFisheyeActive) {
      try {
        const position = clickedNode.renderedPosition();
        const transformedElements = applyFisheyeAt(
          position.x, 
          position.y, 
          magnificationFactor
        );
        
        if (transformedElements && transformedElements.length > 0 && cyRef.current) {
          // Update Cytoscape directly
          cyRef.current.batch(() => {
            transformedElements.forEach(element => {
              if (element.position && element.data && element.data.id) {
                const cyElement = cyRef.current.getElementById(element.data.id);
                if (cyElement.length > 0) {
                  cyElement.position(element.position);
                }
              }
            });
          });
          setFisheyeStatus(`🎯 Focused on node ${nodeId}`);
        }
      } catch (err) {
        console.error('Error applying fisheye on node click:', err);
        setFisheyeStatus(`❌ Error on node click: ${err.message}`);
      }
    }
  }, [setSelectedNode, loadNodeStatistics, fisheyeEnabled, isFisheyeActive, applyFisheyeAt, magnificationFactor]);

  // Apply a new cluster size and reprocess the data with processing type support
  const applyClusterSize = async () => {
    if (fileUploaded && localK !== k && dataset) {
      setLoading(true);
      setProcessingStep('Updating cluster size...');
      
      try {
        setK(localK);
        
        let processResult;
        
        // Call the appropriate processing endpoint based on processing type
        if (processingType === 'homogeneous') {
          processResult = await api.processDataset(dataset, localK);
        } else if (processingType === 'heterogeneous') {
          // Remove _heterogeneous suffix for processing call
          const baseDatasetId = dataset.replace('_heterogeneous', '');
          processResult = await api.processDatasetHeterogeneous(baseDatasetId, localK);
        } else if (processingType === 'scar') {
          // Remove _scar suffix for processing call
          const baseDatasetId = dataset.replace('_scar', '');
          processResult = await api.processDatasetScar(baseDatasetId, localK, localNk, localTh);
        }
        
        if (!processResult.success) {
          throw new Error(processResult.message || 'Failed to process dataset with new k value');
        }
        
        // Update dataset ID with the new result
        const newDatasetId = processResult.result?.datasetId || dataset;
        setDataset(newDatasetId);
        
        const hierarchyResult = await api.getHierarchyData(newDatasetId, localK, processingType);
        
        if (!hierarchyResult.success) {
          throw new Error(hierarchyResult.message || 'Failed to get hierarchy data with new k value');
        }
        
        setHierarchyData(hierarchyResult.hierarchy);
        setMappingData(hierarchyResult.mapping);
        
        const rootNode = processResult.result?.rootNode || 'c0_l3_0';
        setCurrentSupernode(rootNode);
        setBreadcrumbPath([{ id: rootNode, label: rootNode }]);
        
        await loadSupernodeData(rootNode);
      } catch (err) {
        setError(`Error applying new cluster size: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Apply SCAR parameters (only for SCAR processing type)
  const applyScarParameters = async () => {
    if (fileUploaded && processingType === 'scar' && dataset && (localNk !== nk || localTh !== th)) {
      setLoading(true);
      setProcessingStep('Updating SCAR parameters...');
      
      try {
        setNk(localNk);
        setTh(localTh);
        
        // Remove _scar suffix for processing call
        const baseDatasetId = dataset.replace('_scar', '');
        const processResult = await api.processDatasetScar(baseDatasetId, k, localNk, localTh);
        
        if (!processResult.success) {
          throw new Error(processResult.message || 'Failed to process dataset with new SCAR parameters');
        }
        
        // Update dataset ID with the new result
        const newDatasetId = processResult.result?.datasetId || dataset;
        setDataset(newDatasetId);
        
        const hierarchyResult = await api.getHierarchyData(newDatasetId, k, processingType);
        
        if (!hierarchyResult.success) {
          throw new Error(hierarchyResult.message || 'Failed to get hierarchy data with new SCAR parameters');
        }
        
        setHierarchyData(hierarchyResult.hierarchy);
        setMappingData(hierarchyResult.mapping);
        
        const rootNode = processResult.result?.rootNode || 'c0_l3_0';
        setCurrentSupernode(rootNode);
        setBreadcrumbPath([{ id: rootNode, label: rootNode }]);
        
        await loadSupernodeData(rootNode);
      } catch (err) {
        setError(`Error applying new SCAR parameters: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Change layout function
  const changeLayout = (e) => {
    const newLayout = e.target.value;
    setLayout(newLayout);
    applyLayout(newLayout);
  };

  // Load data for a supernode with processing type support
  const loadSupernodeData = useCallback(async (supernodeId) => {
    if (!dataset || !supernodeId) {
      setError("Missing dataset ID or supernode ID");
      return;
    }
    
    setLoading(true);
    setProcessingStep(`Loading supernode ${supernodeId}...`);
    
    try {
      if (hierarchyData && Object.keys(hierarchyData).length > 0) {
        if (!hierarchyData[supernodeId]) {
          console.warn(`Supernode ${supernodeId} not found in hierarchy data. Attempting to load anyway.`);
        }
      }
      
      const response = await api.getSupernodeCoordinates(dataset, k, supernodeId, processingType);

      console.log('Supernode coordinates response:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to get supernode coordinates');
      }
      
      if (!response.nodes || !Array.isArray(response.nodes) || response.nodes.length === 0) {
        throw new Error('No nodes received from server');
      }
      
      const elements = transformToCytoscapeElements({
        nodes: response.nodes,
        edges: response.edges || []
      });
      
      setCytoscapeElements(elements);

      // Reset fisheye when changing supernodes
      if (fisheyeEnabled && currentSupernode !== supernodeId) {
        console.log('🔄 Resetting fisheye due to supernode change');
        setFisheyeEnabled(false);
        setFisheyeStatus('🔄 Fisheye reset due to supernode change');
        if (cyRef.current) {
          cyRef.current.removeListener('mousemove', handleCytoscapeMouseMove);
        }
      }
      
    } catch (err) {
      setError(`Error loading supernode data: ${err.message}`);
      console.error('Error loading supernode data:', err);
    } finally {
      setLoading(false);
    }
  }, [dataset, k, processingType, hierarchyData, setCytoscapeElements, setLoading, setError, setProcessingStep, fisheyeEnabled, handleCytoscapeMouseMove]);

  // Initialize the visualization when currentSupernode changes
  useEffect(() => {
    if (fileUploaded && currentSupernode && dataset) {
      loadSupernodeData(currentSupernode);
    }
  }, [fileUploaded, currentSupernode, dataset, loadSupernodeData]);

  // Set up events when elements change
  useEffect(() => {
    if (cyRef.current && cytoscapeElements.length > 0) {
      setTimeout(() => {
        if (cyRef.current) {
          setupCytoscapeEvents(cyRef, handleNodeClick);
        }
      }, 100);
      
      return () => {
        if (cyRef.current) {
          cyRef.current.removeListener('tap');
          cyRef.current.removeListener('mouseover');
          cyRef.current.removeListener('mouseout');
          cyRef.current.removeListener('mousemove');
        }
      };
    }
  }, [cytoscapeElements, handleNodeClick]);

  // Clear selected node when supernode changes
  useEffect(() => {
    setSelectedNode(null);
    setNodeStatistics(null);
  }, [currentSupernode]);

  // Debug effect to log fisheye state changes
  useEffect(() => {
    console.log('🔄 Fisheye state changed:', { 
      fisheyeEnabled, 
      isFisheyeActive, 
      elementsCount: cytoscapeElements.length,
      lastError 
    });
  }, [fisheyeEnabled, isFisheyeActive, cytoscapeElements.length, lastError]);

  // If files haven't been uploaded yet, show a placeholder
  if (!fileUploaded) {
    return (
      <div className="graph-placeholder">
        {loading ? (
          <div className="loading-overlay">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p>{processingStep}</p>
          </div>
        ) : (
          <div className="placeholder-content">
            <h3>PPRviz Graph Visualization</h3>
            <p>Upload files to start visualizing your graph</p>
            <img 
              src="https://via.placeholder.com/600x400?text=Graph+Visualization" 
              alt="Graph visualization placeholder" 
              className="placeholder-image"
            />
            <p className="text-muted">
              Click the "Upload Files" button in the navigation bar to get started
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <BreadcrumbNav loadSupernodeData={loadSupernodeData} />
      
      <Row className="graph-visualization-container">
        <Col md={9} className="graph-area">
          {loading ? (
            <div className="loading-overlay">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p>{processingStep}</p>
            </div>
          ) : (
            <div className="cytoscape-container">
              {/* UPDATED: Enhanced fisheye status indicator */}
              {fisheyeEnabled && (
                <div className="fisheye-indicator" style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  zIndex: 1000,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  <div>🔍 Structure-Aware Fisheye Active</div>
                  <div>Magnification: {magnificationFactor}x</div>
                  <div>Status: {fisheyeStatus}</div>
                  {fisheyeStats.nodes > 0 && (
                    <div>
                      Nodes: {fisheyeStats.nodes} | 
                      Update: {fisheyeStats.lastUpdateTime.toFixed(1)}ms
                    </div>
                  )}
                </div>
              )}
              
              <CytoscapeComponent
                elements={cytoscapeElements}
                stylesheet={cytoscapeStylesheet}
                layout={layoutOptions[layout] || layoutOptions.preset}
                style={{ 
                  width: '100%', 
                  height: '600px',
                  cursor: fisheyeEnabled ? 'crosshair' : 'default'
                }}
                cy={(cy) => { 
                  cyRef.current = cy;
                  
                  cy.ready(() => {
                    console.log('Cytoscape is ready with', cy.elements().length, 'elements');
                    const nodes = cy.nodes();
                    const edges = cy.edges();
                    console.log('Nodes:', nodes.length, 'Edges:', edges.length);
                    
                    if (nodes.length > 0) {
                      const firstNode = nodes[0];
                      console.log('First node sample:', {
                        id: firstNode.id(),
                        position: firstNode.position(),
                        data: firstNode.data()
                      });
                    }
                  });
                }}
              />
            </div>
          )}
          
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
        </Col>
        
        <Col md={3} className="controls-panel">
          <Card className="mb-3">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>Settings</span>
                <Badge bg={processingType === 'homogeneous' ? 'primary' : processingType === 'heterogeneous' ? 'success' : 'warning'}>
                  {processingType}
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Layout</Form.Label>
                <Form.Select 
                  value={layout}
                  onChange={changeLayout}
                  disabled={fisheyeEnabled}
                >
                  <option value="preset">Preset (Use Coordinates)</option>
                  <option value="cose">COSE-Bilkent</option>
                  <option value="fcose">FCOSE</option>
                </Form.Select>
                {fisheyeEnabled && (
                  <Form.Text className="text-muted">
                    Layout changes disabled in fisheye mode
                  </Form.Text>
                )}
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Cluster Size (k)</Form.Label>
                <InputGroup>
                  <Form.Control 
                    type="number" 
                    value={localK}
                    min={1}
                    onChange={(e) => setLocalK(parseInt(e.target.value, 10))}
                    disabled={fisheyeEnabled}
                  />
                  <Button 
                    variant="outline-secondary"
                    onClick={applyClusterSize}
                    disabled={localK === k || fisheyeEnabled}
                  >
                    Apply
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">
                  Smaller values create deeper hierarchies
                </Form.Text>
              </Form.Group>

              {/* SCAR-specific parameters */}
              {processingType === 'scar' && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>NK Parameter</Form.Label>
                    <InputGroup>
                      <Form.Control 
                        type="number" 
                        value={localNk}
                        min={1}
                        onChange={(e) => setLocalNk(parseInt(e.target.value, 10))}
                        disabled={fisheyeEnabled}
                      />
                      <Button 
                        variant="outline-secondary"
                        onClick={applyScarParameters}
                        disabled={(localNk === nk && localTh === th) || fisheyeEnabled}
                      >
                        Apply
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Threshold (th): {localTh}</Form.Label>
                    <Form.Range
                      min={0}
                      max={1}
                      step={0.1}
                      value={localTh}
                      onChange={(e) => setLocalTh(parseFloat(e.target.value))}
                      disabled={fisheyeEnabled}
                    />
                    <Form.Text className="text-muted">
                      SCAR threshold parameter (0.0 - 1.0)
                    </Form.Text>
                  </Form.Group>
                </>
              )}

              {/* UPDATED: Enhanced Structure-Aware Fisheye Controls */}
              <Card className="mt-3">
                <Card.Header className="py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <small>🔍 Structure-Aware Fisheye</small>
                    <Badge bg={fisheyeEnabled ? "success" : "secondary"}>
                      {fisheyeEnabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body className="py-2">
                  <div className="d-grid gap-2">
                    <Button 
                      variant={fisheyeEnabled ? "danger" : "primary"}
                      onClick={toggleFisheye}
                      size="sm"
                      disabled={cytoscapeElements.length === 0}
                    >
                      {fisheyeEnabled ? "Disable" : "Enable"} Structure-Aware Fisheye
                    </Button>
                    
                    {fisheyeEnabled && (
                      <>
                        <Form.Group className="mt-2">
                          <Form.Label className="small">
                            Magnification: {magnificationFactor}x
                          </Form.Label>
                          <Form.Range
                            min={1}
                            max={8}
                            step={0.5}
                            value={magnificationFactor}
                            onChange={(e) => setMagnificationFactor(parseFloat(e.target.value))}
                          />
                          <Form.Text className="text-muted small">
                            Move mouse over graph to apply structure-aware fisheye
                          </Form.Text>
                        </Form.Group>

                        {/* Performance Stats */}
                        {fisheyeStats.nodes > 0 && (
                          <div className="mt-2">
                            <small className="text-muted">
                              <strong>Performance:</strong><br/>
                              • Nodes updated: {fisheyeStats.nodes}<br/>
                              • Update time: {fisheyeStats.lastUpdateTime.toFixed(1)}ms<br/>
                              • Max iterations: {fisheyeStats.iterations}
                            </small>
                          </div>
                        )}
                      </>
                    )}

                    {/* Status and Error Information */}
                    {fisheyeStatus && (
                      <Alert 
                        variant={lastError ? "danger" : fisheyeStatus.includes('❌') ? "warning" : "info"} 
                        className="mt-2 mb-0 py-1"
                      >
                        <small>
                          {lastError ? `Error: ${lastError}` : fisheyeStatus}
                        </small>
                      </Alert>
                    )}

                    {/* Technical Debug Info */}
                    <div className="mt-2">
                      <small className="text-muted">
                        Elements: {cytoscapeElements.length} | 
                        Active: {isFisheyeActive ? '✅' : '❌'} | 
                        Enabled: {fisheyeEnabled ? '✅' : '❌'}
                      </small>
                    </div>

                    {/* Instructions */}
                    <div className="mt-2">
                      <small className="text-info">
                        <strong>How to use:</strong><br/>
                        1. Click "Enable Structure-Aware Fisheye"<br/>
                        2. Move mouse over graph to magnify<br/>
                        3. Click nodes to focus fisheye<br/>
                        4. Adjust magnification with slider
                      </small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              
              <div className="mt-3">
                <p><strong>Current Supernode:</strong> {currentSupernode}</p>
                <p><strong>Dataset:</strong> {dataset}</p>
                <p><strong>Processing Type:</strong> 
                  <Badge bg={processingType === 'homogeneous' ? 'primary' : processingType === 'heterogeneous' ? 'success' : 'warning'} className="ms-1">
                    {processingType}
                  </Badge>
                </p>
              </div>
            </Card.Body>
          </Card>
          
          <NodeInfoPanel loadSupernodeData={loadSupernodeData} />
        </Col>
      </Row>
    </>
  );
};

export default GraphVisualization;