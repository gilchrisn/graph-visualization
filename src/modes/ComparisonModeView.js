import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert, Badge, Button, Table, Form, Breadcrumb } from 'react-bootstrap';
import { useAppState, useLoadingState, useComparisonState } from '../core/AppStateManager';
import CytoscapeContainer from '../visualization/CytoscapeContainer';
import DataService from '../core/DataService';
import AlgorithmRegistry from '../core/AlgorithmRegistry';

const ComparisonModeView = () => {
  const { actions } = useAppState();
  const { loading, error, processingStep } = useLoadingState();
  const { comparisonData, comparisonMetrics, comparisonState, comparisonFiles } = useComparisonState();

  // Extract algorithm IDs dynamically from comparison data
  const algorithm1Id = comparisonData ? Object.keys(comparisonData)[0] : null;
  const algorithm2Id = comparisonData ? Object.keys(comparisonData)[1] : null;
  
  // Get algorithm configurations
  const algorithm1Config = algorithm1Id ? AlgorithmRegistry.getAlgorithm(algorithm1Id) : null;
  const algorithm2Config = algorithm2Id ? AlgorithmRegistry.getAlgorithm(algorithm2Id) : null;

  // Local parameter state for each algorithm (dynamic)
  const [algorithmParameters, setAlgorithmParameters] = useState({});

  // Individual algorithm data state
  const [algorithmData, setAlgorithmData] = useState({});

  // Initialize parameters when comparison data changes
  useEffect(() => {
    if (comparisonData && algorithm1Id && algorithm2Id) {
      const newParams = {};
      newParams[algorithm1Id] = comparisonData[algorithm1Id]?.parameters || AlgorithmRegistry.getDefaultParameters(algorithm1Id);
      newParams[algorithm2Id] = comparisonData[algorithm2Id]?.parameters || AlgorithmRegistry.getDefaultParameters(algorithm2Id);
      
      setAlgorithmParameters(newParams);

      // Initialize algorithm data structure
      const newAlgorithmData = {};
      newAlgorithmData[algorithm1Id] = {
        hierarchyData: {},
        mappingData: {},
        nodeStatistics: null
      };
      newAlgorithmData[algorithm2Id] = {
        hierarchyData: {},
        mappingData: {},
        nodeStatistics: null
      };
      setAlgorithmData(newAlgorithmData);
    }
  }, [comparisonData, algorithm1Id, algorithm2Id]);

  // Initialize comparison view when comparisonData is available
  useEffect(() => {
    if (comparisonData && algorithm1Id && algorithm2Id) {
      console.log(`⚖️ Initializing comparison view: ${algorithm1Id} vs ${algorithm2Id}`);
      initializeComparisonView();
    }
  }, [comparisonData]);

  // Initialize the comparison view with root data for both algorithms
  const initializeComparisonView = async () => {
    actions.setLoading(true);
    actions.setProcessingStep('Loading comparison data...');

    try {
      // Load hierarchy data for both algorithms
      await Promise.all([
        loadAlgorithmHierarchy(algorithm1Id),
        loadAlgorithmHierarchy(algorithm2Id)
      ]);

      // Load data for first algorithm
      await loadSupernodeData(
        algorithm1Id,
        comparisonData[algorithm1Id].datasetId,
        comparisonData[algorithm1Id].parameters,
        comparisonData[algorithm1Id].rootNode
      );

      // Load data for second algorithm
      await loadSupernodeData(
        algorithm2Id,
        comparisonData[algorithm2Id].datasetId,
        comparisonData[algorithm2Id].parameters,
        comparisonData[algorithm2Id].rootNode
      );

      console.log('✅ Comparison view initialized successfully');
    } catch (err) {
      actions.setError(`Error initializing comparison view: ${err.message}`);
    } finally {
      actions.setLoading(false);
    }
  };

  // Load hierarchy data for a specific algorithm
  const loadAlgorithmHierarchy = async (algorithmId) => {
    try {
      const algorithmConfig = comparisonData[algorithmId];
      if (!algorithmConfig) return;

      const hierarchyResult = await DataService.getHierarchyData(
        algorithmId,
        algorithmConfig.datasetId,
        algorithmConfig.parameters
      );

      if (hierarchyResult.success) {
        setAlgorithmData(prev => ({
          ...prev,
          [algorithmId]: {
            ...prev[algorithmId],
            hierarchyData: hierarchyResult.hierarchy,
            mappingData: hierarchyResult.mapping
          }
        }));
      }
    } catch (err) {
      console.error(`Error loading ${algorithmId} hierarchy:`, err);
    }
  };

  // Load data for a specific algorithm and supernode
  const loadSupernodeData = async (algorithmId, datasetId, parameters, supernodeId) => {
    if (!datasetId || !supernodeId) {
      console.warn(`Missing data for ${algorithmId}: datasetId=${datasetId}, supernodeId=${supernodeId}`);
      return;
    }

    actions.setProcessingStep(`Loading ${algorithmId} supernode ${supernodeId}...`);

    try {
      const response = await DataService.getSupernodeData(algorithmId, datasetId, supernodeId, parameters);

      if (!response.success) {
        throw new Error(response.message || `Failed to get ${algorithmId} supernode data`);
      }

      if (!response.nodes || !Array.isArray(response.nodes) || response.nodes.length === 0) {
        throw new Error(`No nodes received for ${algorithmId} algorithm`);
      }

      // Update comparison state for this algorithm
      actions.updateComparisonState(algorithmId, {
        cytoscapeElements: response.nodes,
        currentSupernode: supernodeId,
        breadcrumbPath: updateBreadcrumbPath(algorithmId, supernodeId)
      });

    } catch (err) {
      actions.setError(`Error loading ${algorithmId} supernode data: ${err.message}`);
      console.error(`Error loading ${algorithmId} supernode data:`, err);
    }
  };

  // Update breadcrumb path for an algorithm
  const updateBreadcrumbPath = (algorithmId, supernodeId) => {
    const currentPath = comparisonState[algorithmId]?.breadcrumbPath || [];
    
    // If this supernode is already in the path, truncate to that point
    const existingIndex = currentPath.findIndex(item => item.id === supernodeId);
    if (existingIndex !== -1) {
      return currentPath.slice(0, existingIndex + 1);
    }
    
    // Otherwise, add to the path
    const newBreadcrumb = { id: supernodeId, label: supernodeId };
    return [...currentPath, newBreadcrumb];
  };

  // Navigate via breadcrumb for a specific algorithm
  const navigateViaBreadcrumb = (algorithmId, index) => {
    const algorithmConfig = comparisonData[algorithmId];
    const breadcrumbPath = comparisonState[algorithmId]?.breadcrumbPath || [];
    
    if (index >= 0 && index < breadcrumbPath.length && algorithmConfig) {
      const targetSupernode = breadcrumbPath[index].id;
      
      // Update the breadcrumb path (truncate to the selected index)
      const newPath = breadcrumbPath.slice(0, index + 1);
      actions.updateComparisonState(algorithmId, {
        breadcrumbPath: newPath,
        currentSupernode: targetSupernode
      });
      
      // Load the supernode data
      loadSupernodeData(
        algorithmId,
        algorithmConfig.datasetId,
        algorithmConfig.parameters,
        targetSupernode
      );
    }
  };

  // Handle node click for specific algorithm
  const handleNodeClick = (algorithmId) => {
    return async (nodeData) => {
      console.log(`${algorithmId} node clicked:`, nodeData);

      // Update selected node for this algorithm
      actions.updateComparisonState(algorithmId, {
        selectedNode: nodeData
      });

      // Load node statistics
      await loadNodeStatistics(algorithmId, nodeData.id);
    };
  };

  // Load node statistics for a specific algorithm
  const loadNodeStatistics = async (algorithmId, nodeId) => {
    const algorithmConfig = comparisonData[algorithmId];
    if (!algorithmConfig || !nodeId) return;
    
    try {
      const response = await DataService.getNodeStatistics(
        algorithmId,
        algorithmConfig.datasetId,
        nodeId,
        algorithmConfig.parameters
      );
      
      if (response.success) {
        setAlgorithmData(prev => ({
          ...prev,
          [algorithmId]: {
            ...prev[algorithmId],
            nodeStatistics: response.statistics
          }
        }));
      }
    } catch (err) {
      console.error(`Error loading ${algorithmId} node statistics:`, err);
    }
  };

  // Navigate to supernode for specific algorithm
  const navigateToSupernode = async (algorithmId, supernodeId) => {
    if (!supernodeId || !comparisonData) return;

    const algorithmDataConfig = comparisonData[algorithmId];
    if (!algorithmDataConfig) return;

    try {
      await loadSupernodeData(
        algorithmId,
        algorithmDataConfig.datasetId,
        algorithmDataConfig.parameters,
        supernodeId
      );
    } catch (err) {
      actions.setError(`Error navigating ${algorithmId} to supernode: ${err.message}`);
    }
  };

  // Handle parameter changes for any algorithm
  const handleParameterChange = (algorithmId, paramId, value) => {
    setAlgorithmParameters(prev => ({
      ...prev,
      [algorithmId]: {
        ...prev[algorithmId],
        [paramId]: value
      }
    }));
  };

  // Apply parameter changes for any algorithm
  const applyParameterChanges = async (algorithmId) => {
    if (!comparisonData?.[algorithmId] || !comparisonFiles) {
      console.error(`Missing comparison data or files for ${algorithmId}`);
      actions.setError('Missing comparison data or original files');
      return;
    }
    
    actions.setLoading(true);
    actions.setProcessingStep(`Updating ${algorithmId} parameters...`);
    
    try {
      const newParameters = algorithmParameters[algorithmId];
      
      // Validate parameters
      const validation = AlgorithmRegistry.validateParameters(algorithmId, newParameters);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Reprocess with new parameters
      const processResult = await DataService.processDataset(algorithmId, comparisonFiles, newParameters);
      
      if (!processResult.success) {
        throw new Error(processResult.message || 'Failed to process with new parameters');
      }
      
      // Reload hierarchy data
      await loadAlgorithmHierarchy(algorithmId);
      
      // Load root supernode with new parameters
      const rootNode = processResult.result?.rootNode || 'c0_l3_0';
      await loadSupernodeData(
        algorithmId,
        processResult.result?.datasetId || comparisonData[algorithmId].datasetId,
        newParameters,
        rootNode
      );
      
      // Reset breadcrumb
      actions.updateComparisonState(algorithmId, {
        breadcrumbPath: [{ id: rootNode, label: rootNode }]
      });
      
    } catch (err) {
      actions.setError(`Error updating ${algorithmId} parameters: ${err.message}`);
    } finally {
      actions.setLoading(false);
    }
  };

  // Check if parameters have changed for an algorithm
  const hasParametersChanged = (algorithmId) => {
    if (!comparisonData?.[algorithmId] || !algorithmParameters[algorithmId]) return false;
    
    const original = comparisonData[algorithmId].parameters;
    const current = algorithmParameters[algorithmId];
    
    return Object.keys(current).some(key => current[key] !== original[key]);
  };

  // Get algorithm badge variant
  const getAlgorithmBadge = (algorithmId) => {
    switch (algorithmId) {
      case 'homogeneous': return 'success';
      case 'heterogeneous': return 'info';
      case 'scar': return 'warning';
      default: return 'primary';
    }
  };

  // Render parameter inputs for an algorithm
  const renderParameterInputs = (algorithmId, algorithmConfig) => {
    if (!algorithmConfig || !algorithmParameters[algorithmId]) return null;

    return algorithmConfig.parameterSchema.map(param => (
      <Form.Group key={param.id} className="mb-2">
        <Form.Label className="small">{param.name}:</Form.Label>
        {param.type === 'number' ? (
          <Form.Control 
            type="number" 
            size="sm"
            value={algorithmParameters[algorithmId][param.id] || param.default}
            min={param.min}
            max={param.max}
            onChange={(e) => handleParameterChange(algorithmId, param.id, parseInt(e.target.value) || param.default)}
          />
        ) : param.type === 'range' ? (
          <Form.Control 
            type="number" 
            size="sm"
            value={algorithmParameters[algorithmId][param.id] || param.default}
            min={param.min}
            max={param.max}
            step={param.step}
            onChange={(e) => handleParameterChange(algorithmId, param.id, parseFloat(e.target.value) || param.default)}
          />
        ) : (
          <Form.Control 
            type="text" 
            size="sm"
            value={algorithmParameters[algorithmId][param.id] || param.default}
            onChange={(e) => handleParameterChange(algorithmId, param.id, e.target.value)}
          />
        )}
      </Form.Group>
    ));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="comparison-loading">
        <div className="loading-overlay">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>{processingStep}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="danger" className="mt-3">
        {error}
      </Alert>
    );
  }

  // Render no data state
  if (!comparisonData || !algorithm1Id || !algorithm2Id) {
    return (
      <Alert variant="info" className="mt-3">
        No comparison data available. Please run a comparison from the upload dialog.
      </Alert>
    );
  }

  return (
    <div className="comparison-view">
      {/* Mode Header */}
      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Body className="py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <Badge bg="warning" className="me-2">Comparison Mode</Badge>
                  <small className="text-muted">
                    Comparing {algorithm1Config?.name} vs {algorithm2Config?.name}
                  </small>
                </div>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => actions.setMode('single')}
                >
                  🔍 Switch to Single Mode
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Comparison Header */}
      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">⚖️ Algorithm Comparison</h5>
                <div>
                  <Badge bg={getAlgorithmBadge(algorithm1Id)} className="me-2">
                    {algorithm1Config?.name}
                  </Badge>
                  <Badge bg={getAlgorithmBadge(algorithm2Id)}>
                    {algorithm2Config?.name}
                  </Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {comparisonMetrics && (
                <Row>
                  <Col md={3}>
                    <strong>Similarity:</strong>
                    <Badge bg={comparisonMetrics.similarityLevel === 'High' ? 'success' : 
                              comparisonMetrics.similarityLevel === 'Moderate' ? 'warning' : 'danger'} 
                           className="ms-2">
                      {comparisonMetrics.similarityLevel}
                    </Badge>
                  </Col>
                  <Col md={3}>
                    <strong>NMI Score:</strong> {comparisonMetrics.nmi?.toFixed(3) || 'N/A'}
                  </Col>
                  <Col md={3}>
                    <strong>{algorithm1Config?.name} Clusters:</strong> {comparisonMetrics.clusterCounts?.[algorithm1Id] || 0}
                  </Col>
                  <Col md={3}>
                    <strong>{algorithm2Config?.name} Clusters:</strong> {comparisonMetrics.clusterCounts?.[algorithm2Id] || 0}
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Split-Screen Visualization */}
      <Row>
        {/* First Algorithm */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>🔵 {algorithm1Config?.name}</span>
                <Badge bg={getAlgorithmBadge(algorithm1Id)}>
                  {(comparisonState[algorithm1Id]?.cytoscapeElements || []).filter(el => !el.data?.source).length} nodes
                </Badge>
              </div>
            </Card.Header>
            
            {/* Breadcrumb */}
            <Card.Body className="py-2 border-bottom">
              <Breadcrumb className="mb-0" style={{ fontSize: '0.875rem' }}>
                {(comparisonState[algorithm1Id]?.breadcrumbPath || []).map((item, index) => (
                  <Breadcrumb.Item 
                    key={index}
                    active={index === comparisonState[algorithm1Id]?.breadcrumbPath.length - 1}
                    onClick={() => navigateViaBreadcrumb(algorithm1Id, index)}
                    style={{ cursor: index === comparisonState[algorithm1Id]?.breadcrumbPath.length - 1 ? 'default' : 'pointer' }}
                  >
                    {item.label}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </Card.Body>

            {/* Parameters */}
            <Card.Body className="py-2 border-bottom">
              <Row>
                <Col md={10}>
                  {renderParameterInputs(algorithm1Id, algorithm1Config)}
                </Col>
                <Col md={2}>
                  <Button 
                    variant={`outline-${getAlgorithmBadge(algorithm1Id)}`}
                    size="sm"
                    className="w-100"
                    onClick={() => applyParameterChanges(algorithm1Id)}
                    disabled={!hasParametersChanged(algorithm1Id)}
                  >
                    Apply
                  </Button>
                </Col>
              </Row>
            </Card.Body>

            {/* Visualization */}
            <Card.Body className="p-0">
              <div style={{ height: '400px', border: '1px solid #ddd' }}>
                <CytoscapeContainer
                  elements={comparisonState[algorithm1Id]?.cytoscapeElements || []}
                  onNodeClick={handleNodeClick(algorithm1Id)}
                  algorithm={algorithm1Id}
                />
              </div>
              
              {/* Node Info */}
              {comparisonState[algorithm1Id]?.selectedNode && (
                <div className="p-2 border-top">
                  <small>
                    <strong>Selected:</strong> {comparisonState[algorithm1Id].selectedNode.label || comparisonState[algorithm1Id].selectedNode.id} 
                    <Badge bg={`outline-${getAlgorithmBadge(algorithm1Id)}`} className="ms-2">
                      {comparisonState[algorithm1Id].selectedNode.type}
                    </Badge>
                  </small>
                  {comparisonState[algorithm1Id].selectedNode.type === 'supernode' && (
                    <Button 
                      size="sm" 
                      variant={`outline-${getAlgorithmBadge(algorithm1Id)}`}
                      className="ms-2"
                      onClick={() => navigateToSupernode(algorithm1Id, comparisonState[algorithm1Id].selectedNode.id)}
                    >
                      Explore 🔍
                    </Button>
                  )}
                  
                  {/* Node Statistics */}
                  {algorithmData[algorithm1Id]?.nodeStatistics && (
                    <div className="mt-2">
                      <small className="text-muted">
                        Degree: {algorithmData[algorithm1Id].nodeStatistics.degree || 'N/A'}
                        {algorithmData[algorithm1Id].nodeStatistics.childrenCount && 
                          ` | Children: ${algorithmData[algorithm1Id].nodeStatistics.childrenCount}`
                        }
                        {algorithmData[algorithm1Id].nodeStatistics.leafNodeCount && 
                          ` | Leaves: ${algorithmData[algorithm1Id].nodeStatistics.leafNodeCount}`
                        }
                      </small>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Second Algorithm */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>🔴 {algorithm2Config?.name}</span>
                <Badge bg={getAlgorithmBadge(algorithm2Id)}>
                  {(comparisonState[algorithm2Id]?.cytoscapeElements || []).filter(el => !el.data?.source).length} nodes
                </Badge>
              </div>
            </Card.Header>
            
            {/* Breadcrumb */}
            <Card.Body className="py-2 border-bottom">
              <Breadcrumb className="mb-0" style={{ fontSize: '0.875rem' }}>
                {(comparisonState[algorithm2Id]?.breadcrumbPath || []).map((item, index) => (
                  <Breadcrumb.Item 
                    key={index}
                    active={index === comparisonState[algorithm2Id]?.breadcrumbPath.length - 1}
                    onClick={() => navigateViaBreadcrumb(algorithm2Id, index)}
                    style={{ cursor: index === comparisonState[algorithm2Id]?.breadcrumbPath.length - 1 ? 'default' : 'pointer' }}
                  >
                    {item.label}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </Card.Body>

            {/* Parameters */}
            <Card.Body className="py-2 border-bottom">
              <Row>
                <Col md={10}>
                  {renderParameterInputs(algorithm2Id, algorithm2Config)}
                </Col>
                <Col md={2}>
                  <Button 
                    variant={`outline-${getAlgorithmBadge(algorithm2Id)}`}
                    size="sm"
                    className="w-100"
                    onClick={() => applyParameterChanges(algorithm2Id)}
                    disabled={!hasParametersChanged(algorithm2Id)}
                  >
                    Apply
                  </Button>
                </Col>
              </Row>
            </Card.Body>

            {/* Visualization */}
            <Card.Body className="p-0">
              <div style={{ height: '400px', border: '1px solid #ddd' }}>
                <CytoscapeContainer
                  elements={comparisonState[algorithm2Id]?.cytoscapeElements || []}
                  onNodeClick={handleNodeClick(algorithm2Id)}
                  algorithm={algorithm2Id}
                />
              </div>
              
              {/* Node Info */}
              {comparisonState[algorithm2Id]?.selectedNode && (
                <div className="p-2 border-top">
                  <small>
                    <strong>Selected:</strong> {comparisonState[algorithm2Id].selectedNode.label || comparisonState[algorithm2Id].selectedNode.id} 
                    <Badge bg={`outline-${getAlgorithmBadge(algorithm2Id)}`} className="ms-2">
                      {comparisonState[algorithm2Id].selectedNode.type}
                    </Badge>
                  </small>
                  {comparisonState[algorithm2Id].selectedNode.type === 'supernode' && (
                    <Button 
                      size="sm" 
                      variant={`outline-${getAlgorithmBadge(algorithm2Id)}`}
                      className="ms-2"
                      onClick={() => navigateToSupernode(algorithm2Id, comparisonState[algorithm2Id].selectedNode.id)}
                    >
                      Explore 🔍
                    </Button>
                  )}
                  
                  {/* Node Statistics */}
                  {algorithmData[algorithm2Id]?.nodeStatistics && (
                    <div className="mt-2">
                      <small className="text-muted">
                        Degree: {algorithmData[algorithm2Id].nodeStatistics.degree || 'N/A'}
                        {algorithmData[algorithm2Id].nodeStatistics.childrenCount && 
                          ` | Children: ${algorithmData[algorithm2Id].nodeStatistics.childrenCount}`
                        }
                        {algorithmData[algorithm2Id].nodeStatistics.leafNodeCount && 
                          ` | Leaves: ${algorithmData[algorithm2Id].nodeStatistics.leafNodeCount}`
                        }
                      </small>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Metrics */}
      {comparisonMetrics && comparisonMetrics.clusterSizeStats && (
        <Row className="mt-3">
          <Col>
            <Card>
              <Card.Header>
                📊 Detailed Comparison Metrics
              </Card.Header>
              <Card.Body>
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>🔵 {algorithm1Config?.name}</th>
                      <th>🔴 {algorithm2Config?.name}</th>
                      <th>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Total Clusters</strong></td>
                      <td>{comparisonMetrics.clusterCounts[algorithm1Id]}</td>
                      <td>{comparisonMetrics.clusterCounts[algorithm2Id]}</td>
                      <td>{Math.abs(comparisonMetrics.clusterCounts[algorithm1Id] - comparisonMetrics.clusterCounts[algorithm2Id])}</td>
                    </tr>
                    <tr>
                      <td><strong>Avg Cluster Size</strong></td>
                      <td>{comparisonMetrics.clusterSizeStats[algorithm1Id]?.mean?.toFixed(1) || 'N/A'}</td>
                      <td>{comparisonMetrics.clusterSizeStats[algorithm2Id]?.mean?.toFixed(1) || 'N/A'}</td>
                      <td>{Math.abs(
                        (comparisonMetrics.clusterSizeStats[algorithm1Id]?.mean || 0) - 
                        (comparisonMetrics.clusterSizeStats[algorithm2Id]?.mean || 0)
                      ).toFixed(1)}</td>
                    </tr>
                    <tr>
                      <td><strong>Max Cluster Size</strong></td>
                      <td>{comparisonMetrics.clusterSizeStats[algorithm1Id]?.max || 'N/A'}</td>
                      <td>{comparisonMetrics.clusterSizeStats[algorithm2Id]?.max || 'N/A'}</td>
                      <td>{Math.abs(
                        (comparisonMetrics.clusterSizeStats[algorithm1Id]?.max || 0) - 
                        (comparisonMetrics.clusterSizeStats[algorithm2Id]?.max || 0)
                      )}</td>
                    </tr>
                    <tr>
                      <td><strong>Min Cluster Size</strong></td>
                      <td>{comparisonMetrics.clusterSizeStats[algorithm1Id]?.min || 'N/A'}</td>
                      <td>{comparisonMetrics.clusterSizeStats[algorithm2Id]?.min || 'N/A'}</td>
                      <td>{Math.abs(
                        (comparisonMetrics.clusterSizeStats[algorithm1Id]?.min || 0) - 
                        (comparisonMetrics.clusterSizeStats[algorithm2Id]?.min || 0)
                      )}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ComparisonModeView;