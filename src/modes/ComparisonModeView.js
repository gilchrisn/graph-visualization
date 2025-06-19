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

  React.useEffect(() => {
    console.log('ComparisonModeView - comparisonFiles:', comparisonFiles);
    if (comparisonFiles) {
      console.log('Files object keys:', Object.keys(comparisonFiles));
      Object.entries(comparisonFiles).forEach(([key, file]) => {
        console.log(`${key}:`, file ? file.name : 'null');
      });
    }
  }, [comparisonFiles]);

  // Local parameter state for each algorithm
  const [heteroParams, setHeteroParams] = useState({
    k: comparisonData?.heterogeneous?.parameters?.k || 25
  });
  const [scarParams, setScarParams] = useState({
    k: comparisonData?.scar?.parameters?.k || 25,
    nk: comparisonData?.scar?.parameters?.nk || 10,
    th: comparisonData?.scar?.parameters?.th || 0.5
  });

  // Individual algorithm data state
  const [algorithmData, setAlgorithmData] = useState({
    heterogeneous: {
      hierarchyData: {},
      mappingData: {},
      nodeStatistics: null
    },
    scar: {
      hierarchyData: {},
      mappingData: {},
      nodeStatistics: null
    }
  });

  // Initialize comparison view when comparisonData is available
  useEffect(() => {
    if (comparisonData && comparisonData.heterogeneous && comparisonData.scar) {
      console.log('🔄 Initializing comparison view...');
      initializeComparisonView();
    }
  }, [comparisonData]);

  // Update local parameters when comparison data changes
  useEffect(() => {
    if (comparisonData) {
      setHeteroParams({
        k: comparisonData.heterogeneous?.parameters?.k || 25
      });
      setScarParams({
        k: comparisonData.scar?.parameters?.k || 25,
        nk: comparisonData.scar?.parameters?.nk || 10,
        th: comparisonData.scar?.parameters?.th || 0.5
      });
    }
  }, [comparisonData]);

  // Initialize the comparison view with root data for both algorithms
  const initializeComparisonView = async () => {
    actions.setLoading(true);
    actions.setProcessingStep('Loading comparison data...');

    try {
      // Load hierarchy data for both algorithms
      await Promise.all([
        loadAlgorithmHierarchy('heterogeneous'),
        loadAlgorithmHierarchy('scar')
      ]);

      // Load data for heterogeneous algorithm
      await loadSupernodeData(
        'heterogeneous',
        comparisonData.heterogeneous.datasetId,
        comparisonData.heterogeneous.parameters,
        comparisonData.heterogeneous.rootNode
      );

      // Load data for SCAR algorithm
      await loadSupernodeData(
        'scar',
        comparisonData.scar.datasetId,
        comparisonData.scar.parameters,
        comparisonData.scar.rootNode
      );

      console.log('✅ Comparison view initialized successfully');
    } catch (err) {
      actions.setError(`Error initializing comparison view: ${err.message}`);
    } finally {
      actions.setLoading(false);
    }
  };

  // Load hierarchy data for a specific algorithm
  const loadAlgorithmHierarchy = async (algorithm) => {
    try {
      const algorithmConfig = comparisonData[algorithm];
      if (!algorithmConfig) return;

      const hierarchyResult = await DataService.getHierarchyData(
        algorithm,
        algorithmConfig.datasetId,
        algorithmConfig.parameters
      );

      if (hierarchyResult.success) {
        setAlgorithmData(prev => ({
          ...prev,
          [algorithm]: {
            ...prev[algorithm],
            hierarchyData: hierarchyResult.hierarchy,
            mappingData: hierarchyResult.mapping
          }
        }));
      }
    } catch (err) {
      console.error(`Error loading ${algorithm} hierarchy:`, err);
    }
  };

  // Load data for a specific algorithm and supernode
  const loadSupernodeData = async (algorithm, datasetId, parameters, supernodeId) => {
    if (!datasetId || !supernodeId) {
      console.warn(`Missing data for ${algorithm}: datasetId=${datasetId}, supernodeId=${supernodeId}`);
      return;
    }

    actions.setProcessingStep(`Loading ${algorithm} supernode ${supernodeId}...`);

    try {
      const response = await DataService.getSupernodeData(algorithm, datasetId, supernodeId, parameters);

      if (!response.success) {
        throw new Error(response.message || `Failed to get ${algorithm} supernode data`);
      }

      if (!response.nodes || !Array.isArray(response.nodes) || response.nodes.length === 0) {
        throw new Error(`No nodes received for ${algorithm} algorithm`);
      }

      // Update comparison state for this algorithm
      actions.updateComparisonState(algorithm, {
        cytoscapeElements: response.nodes,
        currentSupernode: supernodeId,
        breadcrumbPath: updateBreadcrumbPath(algorithm, supernodeId)
      });

    } catch (err) {
      actions.setError(`Error loading ${algorithm} supernode data: ${err.message}`);
      console.error(`Error loading ${algorithm} supernode data:`, err);
    }
  };

  // Update breadcrumb path for an algorithm
  const updateBreadcrumbPath = (algorithm, supernodeId) => {
    const currentPath = comparisonState[algorithm]?.breadcrumbPath || [];
    
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
  const navigateViaBreadcrumb = (algorithm, index) => {
    const algorithmConfig = comparisonData[algorithm];
    const breadcrumbPath = comparisonState[algorithm]?.breadcrumbPath || [];
    
    if (index >= 0 && index < breadcrumbPath.length && algorithmConfig) {
      const targetSupernode = breadcrumbPath[index].id;
      
      // Update the breadcrumb path (truncate to the selected index)
      const newPath = breadcrumbPath.slice(0, index + 1);
      actions.updateComparisonState(algorithm, {
        breadcrumbPath: newPath,
        currentSupernode: targetSupernode
      });
      
      // Load the supernode data
      loadSupernodeData(
        algorithm,
        algorithmConfig.datasetId,
        algorithmConfig.parameters,
        targetSupernode
      );
    }
  };

  // Handle node click for specific algorithm
  const handleNodeClick = (algorithm) => {
    return async (nodeData) => {
      console.log(`${algorithm} node clicked:`, nodeData);

      // Update selected node for this algorithm
      actions.updateComparisonState(algorithm, {
        selectedNode: nodeData
      });

      // Load node statistics
      await loadNodeStatistics(algorithm, nodeData.id);
    };
  };

  // Load node statistics for a specific algorithm
  const loadNodeStatistics = async (algorithm, nodeId) => {
    const algorithmConfig = comparisonData[algorithm];
    if (!algorithmConfig || !nodeId) return;
    
    try {
      const response = await DataService.getNodeStatistics(
        algorithm,
        algorithmConfig.datasetId,
        nodeId,
        algorithmConfig.parameters
      );
      
      if (response.success) {
        setAlgorithmData(prev => ({
          ...prev,
          [algorithm]: {
            ...prev[algorithm],
            nodeStatistics: response.statistics
          }
        }));
      }
    } catch (err) {
      console.error(`Error loading ${algorithm} node statistics:`, err);
    }
  };

  // Navigate to supernode for specific algorithm
  const navigateToSupernode = async (algorithm, supernodeId) => {
    if (!supernodeId || !comparisonData) return;

    const algorithmData = comparisonData[algorithm];
    if (!algorithmData) return;

    try {
      await loadSupernodeData(
        algorithm,
        algorithmData.datasetId,
        algorithmData.parameters,
        supernodeId
      );
    } catch (err) {
      actions.setError(`Error navigating ${algorithm} to supernode: ${err.message}`);
    }
  };

  // Apply parameter changes for heterogeneous algorithm
  const applyHeteroParams = async () => {
    if (!comparisonData?.heterogeneous || !comparisonFiles) {
      console.error('Missing comparison data or files');
      actions.setError('Missing comparison data or original files');
      return;
    }
    
    actions.setLoading(true);
    actions.setProcessingStep('Updating Heterogeneous parameters...');
    
    try {
      // Validate parameters
      const validation = AlgorithmRegistry.validateParameters('heterogeneous', heteroParams);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Reprocess with new parameters
      const processResult = await DataService.processDataset('heterogeneous', comparisonFiles, heteroParams);
      
      if (!processResult.success) {
        throw new Error(processResult.message || 'Failed to process with new parameters');
      }
      
      // Reload hierarchy data
      await loadAlgorithmHierarchy('heterogeneous');
      
      // Load root supernode with new parameters
      const rootNode = processResult.result?.rootNode || 'c0_l3_0';
      await loadSupernodeData(
        'heterogeneous',
        processResult.result?.datasetId || comparisonData.heterogeneous.datasetId,
        heteroParams,
        rootNode
      );
      
      // Reset breadcrumb
      actions.updateComparisonState('heterogeneous', {
        breadcrumbPath: [{ id: rootNode, label: rootNode }]
      });
      
    } catch (err) {
      actions.setError(`Error updating Heterogeneous parameters: ${err.message}`);
    } finally {
      actions.setLoading(false);
    }
  };

  // Apply parameter changes for SCAR algorithm
  const applyScarParams = async () => {
    console.log('applyScarParams called');
    console.log('comparisonData?.scar:', !!comparisonData?.scar);
    console.log('comparisonFiles:', !!comparisonFiles);
    console.log('comparisonFiles content:', comparisonFiles);
    
    if (!comparisonData?.scar || !comparisonFiles) {
      console.error('Missing comparison data or files');
      actions.setError('Missing comparison data or original files');
      return;
    }
    
    actions.setLoading(true);
    actions.setProcessingStep('Updating SCAR parameters...');
    
    try {
      // Validate parameters
      const validation = AlgorithmRegistry.validateParameters('scar', scarParams);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Reprocess with new parameters
      const processResult = await DataService.processDataset('scar', comparisonFiles, scarParams);
      
      if (!processResult.success) {
        throw new Error(processResult.message || 'Failed to process with new parameters');
      }
      
      // Reload hierarchy data
      await loadAlgorithmHierarchy('scar');
      
      // Load root supernode with new parameters
      const rootNode = processResult.result?.rootNode || 'c0_l3_0';
      await loadSupernodeData(
        'scar',
        processResult.result?.datasetId || comparisonData.scar.datasetId,
        scarParams,
        rootNode
      );
      
      // Reset breadcrumb
      actions.updateComparisonState('scar', {
        breadcrumbPath: [{ id: rootNode, label: rootNode }]
      });
      
    } catch (err) {
      actions.setError(`Error updating SCAR parameters: ${err.message}`);
    } finally {
      actions.setLoading(false);
    }
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
                    Comparing Heterogeneous vs SCAR algorithms
                  </small>
                </div>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => actions.setMode('single')}
                >
                  🔄 Switch to Single Mode
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
                <h5 className="mb-0">🔄 Algorithm Comparison</h5>
                <div>
                  <Badge bg="success" className="me-2">Heterogeneous</Badge>
                  <Badge bg="warning">SCAR</Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {comparisonMetrics && (
                <Row>
                  <Col md={3}>
                    <strong>Similarity:</strong>
                    <Badge bg={comparisonMetrics.similarity === 'High' ? 'success' : 
                              comparisonMetrics.similarity === 'Moderate' ? 'warning' : 'danger'} 
                           className="ms-2">
                      {comparisonMetrics.similarity}
                    </Badge>
                  </Col>
                  <Col md={3}>
                    <strong>NMI Score:</strong> {comparisonMetrics.nmi?.toFixed(3) || 'N/A'}
                  </Col>
                  <Col md={3}>
                    <strong>Hetero Clusters:</strong> {comparisonMetrics.clusterCounts?.heterogeneous || 0}
                  </Col>
                  <Col md={3}>
                    <strong>SCAR Clusters:</strong> {comparisonMetrics.clusterCounts?.scar || 0}
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Split-Screen Visualization */}
      <Row>
        {/* Heterogeneous Algorithm */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>🟢 Heterogeneous Algorithm</span>
                <Badge bg="success">
                  {(comparisonState.heterogeneous.cytoscapeElements || []).filter(el => !el.data?.source).length} nodes
                </Badge>
              </div>
            </Card.Header>
            
            {/* Heterogeneous Breadcrumb */}
            <Card.Body className="py-2 border-bottom">
              <Breadcrumb className="mb-0" style={{ fontSize: '0.875rem' }}>
                {(comparisonState.heterogeneous.breadcrumbPath || []).map((item, index) => (
                  <Breadcrumb.Item 
                    key={index}
                    active={index === comparisonState.heterogeneous.breadcrumbPath.length - 1}
                    onClick={() => navigateViaBreadcrumb('heterogeneous', index)}
                    style={{ cursor: index === comparisonState.heterogeneous.breadcrumbPath.length - 1 ? 'default' : 'pointer' }}
                  >
                    {item.label}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </Card.Body>

            {/* Heterogeneous Parameters */}
            <Card.Body className="py-2 border-bottom">
              <Form.Group as={Row} className="mb-0">
                <Form.Label column sm={3}>k:</Form.Label>
                <Col sm={6}>
                  <Form.Control 
                    type="number" 
                    size="sm"
                    value={heteroParams.k}
                    min={1}
                    onChange={(e) => setHeteroParams({...heteroParams, k: parseInt(e.target.value) || 1})}
                  />
                </Col>
                <Col sm={3}>
                  <Button 
                    variant="outline-success"
                    size="sm"
                    onClick={applyHeteroParams}
                    disabled={heteroParams.k === comparisonData?.heterogeneous?.parameters?.k}
                  >
                    Apply
                  </Button>
                </Col>
              </Form.Group>
            </Card.Body>

            {/* Heterogeneous Visualization */}
            <Card.Body className="p-0">
              <div style={{ height: '400px', border: '1px solid #ddd' }}>
                <CytoscapeContainer
                  elements={comparisonState.heterogeneous.cytoscapeElements || []}
                  onNodeClick={handleNodeClick('heterogeneous')}
                  algorithm="heterogeneous"
                />
              </div>
              
              {/* Heterogeneous Node Info */}
              {comparisonState.heterogeneous.selectedNode && (
                <div className="p-2 border-top">
                  <small>
                    <strong>Selected:</strong> {comparisonState.heterogeneous.selectedNode.label || comparisonState.heterogeneous.selectedNode.id} 
                    <Badge bg="outline-success" className="ms-2">
                      {comparisonState.heterogeneous.selectedNode.type}
                    </Badge>
                  </small>
                  {comparisonState.heterogeneous.selectedNode.type === 'supernode' && (
                    <Button 
                      size="sm" 
                      variant="outline-success" 
                      className="ms-2"
                      onClick={() => navigateToSupernode('heterogeneous', comparisonState.heterogeneous.selectedNode.id)}
                    >
                      Explore 🔍
                    </Button>
                  )}
                  
                  {/* Node Statistics */}
                  {algorithmData.heterogeneous.nodeStatistics && (
                    <div className="mt-2">
                      <small className="text-muted">
                        Degree: {algorithmData.heterogeneous.nodeStatistics.degree || 'N/A'}
                        {algorithmData.heterogeneous.nodeStatistics.childrenCount && 
                          ` | Children: ${algorithmData.heterogeneous.nodeStatistics.childrenCount}`
                        }
                        {algorithmData.heterogeneous.nodeStatistics.leafNodeCount && 
                          ` | Leaves: ${algorithmData.heterogeneous.nodeStatistics.leafNodeCount}`
                        }
                      </small>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* SCAR Algorithm */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>🟡 SCAR Algorithm</span>
                <Badge bg="warning">
                  {(comparisonState.scar.cytoscapeElements || []).filter(el => !el.data?.source).length} nodes
                </Badge>
              </div>
            </Card.Header>
            
            {/* SCAR Breadcrumb */}
            <Card.Body className="py-2 border-bottom">
              <Breadcrumb className="mb-0" style={{ fontSize: '0.875rem' }}>
                {(comparisonState.scar.breadcrumbPath || []).map((item, index) => (
                  <Breadcrumb.Item 
                    key={index}
                    active={index === comparisonState.scar.breadcrumbPath.length - 1}
                    onClick={() => navigateViaBreadcrumb('scar', index)}
                    style={{ cursor: index === comparisonState.scar.breadcrumbPath.length - 1 ? 'default' : 'pointer' }}
                  >
                    {item.label}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </Card.Body>

            {/* SCAR Parameters */}
            <Card.Body className="py-2 border-bottom">
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-1">
                    <Form.Label className="small">k:</Form.Label>
                    <Form.Control 
                      type="number" 
                      size="sm"
                      value={scarParams.k}
                      min={1}
                      onChange={(e) => setScarParams({...scarParams, k: parseInt(e.target.value) || 1})}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-1">
                    <Form.Label className="small">nk:</Form.Label>
                    <Form.Control 
                      type="number" 
                      size="sm"
                      value={scarParams.nk}
                      min={1}
                      onChange={(e) => setScarParams({...scarParams, nk: parseInt(e.target.value) || 1})}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-1">
                    <Form.Label className="small">th:</Form.Label>
                    <Form.Control 
                      type="number" 
                      size="sm"
                      value={scarParams.th}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(e) => setScarParams({...scarParams, th: parseFloat(e.target.value) || 0})}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Label className="small">&nbsp;</Form.Label>
                  <Button 
                    variant="outline-warning"
                    size="sm"
                    className="w-100"
                    onClick={applyScarParams}
                    disabled={
                      scarParams.k === comparisonData?.scar?.parameters?.k &&
                      scarParams.nk === comparisonData?.scar?.parameters?.nk &&
                      scarParams.th === comparisonData?.scar?.parameters?.th
                    }
                  >
                    Apply
                  </Button>
                </Col>
              </Row>
            </Card.Body>

            {/* SCAR Visualization */}
            <Card.Body className="p-0">
              <div style={{ height: '400px', border: '1px solid #ddd' }}>
                <CytoscapeContainer
                  elements={comparisonState.scar.cytoscapeElements || []}
                  onNodeClick={handleNodeClick('scar')}
                  algorithm="scar"
                />
              </div>
              
              {/* SCAR Node Info */}
              {comparisonState.scar.selectedNode && (
                <div className="p-2 border-top">
                  <small>
                    <strong>Selected:</strong> {comparisonState.scar.selectedNode.label || comparisonState.scar.selectedNode.id} 
                    <Badge bg="outline-warning" className="ms-2">
                      {comparisonState.scar.selectedNode.type}
                    </Badge>
                  </small>
                  {comparisonState.scar.selectedNode.type === 'supernode' && (
                    <Button 
                      size="sm" 
                      variant="outline-warning" 
                      className="ms-2"
                      onClick={() => navigateToSupernode('scar', comparisonState.scar.selectedNode.id)}
                    >
                      Explore 🔍
                    </Button>
                  )}
                  
                  {/* Node Statistics */}
                  {algorithmData.scar.nodeStatistics && (
                    <div className="mt-2">
                      <small className="text-muted">
                        Degree: {algorithmData.scar.nodeStatistics.degree || 'N/A'}
                        {algorithmData.scar.nodeStatistics.childrenCount && 
                          ` | Children: ${algorithmData.scar.nodeStatistics.childrenCount}`
                        }
                        {algorithmData.scar.nodeStatistics.leafNodeCount && 
                          ` | Leaves: ${algorithmData.scar.nodeStatistics.leafNodeCount}`
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
                      <th>🟢 Heterogeneous</th>
                      <th>🟡 SCAR</th>
                      <th>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Total Clusters</strong></td>
                      <td>{comparisonMetrics.clusterCounts.heterogeneous}</td>
                      <td>{comparisonMetrics.clusterCounts.scar}</td>
                      <td>{Math.abs(comparisonMetrics.clusterCounts.heterogeneous - comparisonMetrics.clusterCounts.scar)}</td>
                    </tr>
                    <tr>
                      <td><strong>Avg Cluster Size</strong></td>
                      <td>{comparisonMetrics.clusterSizeStats.heterogeneous.mean?.toFixed(1) || 'N/A'}</td>
                      <td>{comparisonMetrics.clusterSizeStats.scar.mean?.toFixed(1) || 'N/A'}</td>
                      <td>{Math.abs(
                        (comparisonMetrics.clusterSizeStats.heterogeneous.mean || 0) - 
                        (comparisonMetrics.clusterSizeStats.scar.mean || 0)
                      ).toFixed(1)}</td>
                    </tr>
                    <tr>
                      <td><strong>Max Cluster Size</strong></td>
                      <td>{comparisonMetrics.clusterSizeStats.heterogeneous.max || 'N/A'}</td>
                      <td>{comparisonMetrics.clusterSizeStats.scar.max || 'N/A'}</td>
                      <td>{Math.abs(
                        (comparisonMetrics.clusterSizeStats.heterogeneous.max || 0) - 
                        (comparisonMetrics.clusterSizeStats.scar.max || 0)
                      )}</td>
                    </tr>
                    <tr>
                      <td><strong>Min Cluster Size</strong></td>
                      <td>{comparisonMetrics.clusterSizeStats.heterogeneous.min || 'N/A'}</td>
                      <td>{comparisonMetrics.clusterSizeStats.scar.min || 'N/A'}</td>
                      <td>{Math.abs(
                        (comparisonMetrics.clusterSizeStats.heterogeneous.min || 0) - 
                        (comparisonMetrics.clusterSizeStats.scar.min || 0)
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