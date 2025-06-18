import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert, Spinner, Button, Badge } from 'react-bootstrap';
import { useAppState, useLoadingState, useDataState, useVisualizationState, useComparisonState } from '../core/AppStateManager';
import BreadcrumbNav from '../components/Navigation/BreadcrumbNav';
import NodeInfoPanel from '../components/NodeInfo/NodeInfoPanel';
import ParameterPanel from '../components/Controls/ParameterPanel';
import VisualizationControls from '../components/Controls/VisualizationControls';
import CytoscapeContainer from '../visualization/CytoscapeContainer';
import DataService from '../core/DataService';
import AlgorithmRegistry from '../core/AlgorithmRegistry';

const SingleModeView = () => {
  const { actions } = useAppState();
  const { loading, error, processingStep } = useLoadingState();
  const { dataset, algorithm, fileUploaded, hierarchyData, mappingData } = useDataState();
  const { currentSupernode, breadcrumbPath, selectedNode } = useVisualizationState();
  const { comparisonData } = useComparisonState();
  
  // Local state for parameters
  const [parameters, setParameters] = useState(
    AlgorithmRegistry.getDefaultParameters(algorithm)
  );

  // Load supernode data
  const loadSupernodeData = async (supernodeId) => {
    if (!dataset || !supernodeId) {
      actions.setError("Missing dataset ID or supernode ID");
      return;
    }
    
    actions.setLoading(true);
    actions.setProcessingStep(`Loading supernode ${supernodeId}...`);
    
    try {
      // Validate hierarchy data
      if (hierarchyData && Object.keys(hierarchyData).length > 0) {
        if (!hierarchyData[supernodeId]) {
          console.warn(`Supernode ${supernodeId} not found in hierarchy data`);
        }
      }
      
      // Get supernode data from DataService
      const response = await DataService.getSupernodeData(
        algorithm,
        dataset,
        supernodeId,
        parameters
      );
      
      if (!response.nodes || !Array.isArray(response.nodes) || response.nodes.length === 0) {
        throw new Error('No nodes received from server');
      }
      
      // Update visualization state
      actions.setCytoscapeElements(response.nodes);
      actions.setCurrentSupernode(supernodeId);
      
      console.log(`Loaded supernode ${supernodeId} with ${response.nodes.length} nodes`);
      
    } catch (err) {
      actions.setError(`Error loading supernode data: ${err.message}`);
      console.error('Error loading supernode data:', err);
    } finally {
      actions.setLoading(false);
    }
  };

  // Handle parameter changes
  const handleParameterChange = async (newParameters) => {
    if (!fileUploaded || !dataset) {
      return;
    }
    
    actions.setLoading(true);
    actions.setProcessingStep('Updating parameters...');
    
    try {
      // Validate parameters
      const validation = AlgorithmRegistry.validateParameters(algorithm, newParameters);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Reprocess dataset with new parameters
      const processResult = await DataService.processDataset(algorithm, {}, newParameters);
      
      if (!processResult.success) {
        throw new Error(processResult.message || 'Failed to process dataset with new parameters');
      }
      
      // Update dataset and reload hierarchy
      const newDatasetId = processResult.result?.datasetId || dataset;
      actions.setDataset(newDatasetId);
      
      const hierarchyResult = await DataService.getHierarchyData(algorithm, newDatasetId, newParameters);
      
      if (!hierarchyResult.success) {
        throw new Error(hierarchyResult.message || 'Failed to get hierarchy data');
      }
      
      actions.setHierarchyData(hierarchyResult.hierarchy);
      actions.setMappingData(hierarchyResult.mapping);
      
      // Navigate to root node
      const rootNode = processResult.result?.rootNode || 'c0_l3_0';
      actions.setBreadcrumbPath([{ id: rootNode, label: rootNode }]);
      
      // Update local parameters
      setParameters(newParameters);
      
      // Load root supernode data
      await loadSupernodeData(rootNode);
      
    } catch (err) {
      actions.setError(`Error updating parameters: ${err.message}`);
    } finally {
      actions.setLoading(false);
    }
  };

  // Handle node click
  const handleNodeClick = async (nodeData) => {
    actions.setSelectedNode(nodeData);
    
    // Load node statistics
    try {
      const stats = await DataService.getNodeStatistics(
        algorithm,
        dataset,
        nodeData.id,
        parameters
      );
      
      if (stats.success) {
        actions.setNodeStatistics(stats.statistics);
      }
    } catch (err) {
      console.error('Error loading node statistics:', err);
    }
  };

  // Handle supernode navigation
  const handleSupernodeNavigation = (supernodeId) => {
    actions.navigateToSupernode(supernodeId);
    loadSupernodeData(supernodeId);
  };

  // Initialize visualization when currentSupernode changes
  useEffect(() => {
    if (fileUploaded && currentSupernode && dataset) {
      loadSupernodeData(currentSupernode);
    }
  }, [fileUploaded, currentSupernode, dataset]);

  // Clear selected node when supernode changes
  useEffect(() => {
    actions.setSelectedNode(null);
    actions.setNodeStatistics(null);
  }, [currentSupernode]);

  // If no files uploaded, show placeholder
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
    <div className="single-mode-view">
      {/* Mode Header */}
      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Body className="py-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <Badge bg="primary" className="me-2">Single Mode</Badge>
                  <Badge bg={algorithm === 'homogeneous' ? 'success' : algorithm === 'heterogeneous' ? 'info' : 'warning'}>
                    {algorithm}
                  </Badge>
                  <small className="text-muted ms-2">
                    Exploring single algorithm results
                  </small>
                </div>
                {comparisonData && (
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={() => actions.setMode('comparison')}
                  >
                    🔄 Switch to Comparison
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Breadcrumb Navigation */}
      <BreadcrumbNav 
        loadSupernodeData={loadSupernodeData}
        breadcrumbPath={breadcrumbPath}
        onNavigate={(index) => {
          if (index >= 0 && index < breadcrumbPath.length) {
            const targetSupernode = breadcrumbPath[index].id;
            actions.setBreadcrumbPath(breadcrumbPath.slice(0, index + 1));
            actions.setCurrentSupernode(targetSupernode);
            loadSupernodeData(targetSupernode);
          }
        }}
      />
      
      <Row className="graph-visualization-container">
        {/* Main Visualization Area */}
        <Col md={9} className="graph-area">
          {loading ? (
            <div className="loading-overlay">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p>{processingStep}</p>
            </div>
          ) : (
            <>
              <CytoscapeContainer 
                onNodeClick={handleNodeClick}
                onSupernodeNavigation={handleSupernodeNavigation}
              />
              
              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}
            </>
          )}
        </Col>
        
        {/* Controls Panel */}
        <Col md={3} className="controls-panel">
          {/* Visualization Controls */}
          <VisualizationControls />
          
          {/* Algorithm Parameters */}
          <ParameterPanel 
            algorithm={algorithm}
            parameters={parameters}
            onParameterChange={handleParameterChange}
            disabled={loading}
          />
          
          {/* Node Information */}
          <NodeInfoPanel 
            selectedNode={selectedNode}
            onSupernodeNavigation={handleSupernodeNavigation}
          />
          
          {/* Dataset Information */}
          <Card className="mt-3">
            <Card.Header>Dataset Info</Card.Header>
            <Card.Body>
              <p><strong>Current Supernode:</strong> {currentSupernode}</p>
              <p><strong>Dataset:</strong> {dataset}</p>
              <p><strong>Algorithm:</strong> 
                <Badge bg={algorithm === 'homogeneous' ? 'success' : algorithm === 'heterogeneous' ? 'info' : 'warning'} className="ms-1">
                  {algorithm}
                </Badge>
              </p>
              {Object.keys(parameters).length > 0 && (
                <>
                  <p><strong>Parameters:</strong></p>
                  <ul className="small">
                    {Object.entries(parameters).map(([key, value]) => (
                      <li key={key}>{key}: {value}</li>
                    ))}
                  </ul>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SingleModeView;