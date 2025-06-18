import React, { useState } from 'react';
import { Card, Button, Tabs, Tab, Table, Badge, ProgressBar, Alert } from 'react-bootstrap';
import { useAppState, useVisualizationState, useDataState } from '../../core/AppStateManager';
import DataService from '../../core/DataService';
import AlgorithmRegistry from '../../core/AlgorithmRegistry';
import './NodeInfoPanel.css';

const NodeInfoPanel = ({ 
  selectedNode: propSelectedNode = null,
  onSupernodeNavigation = null
}) => {
  const { actions } = useAppState();
  const { selectedNode: stateSelectedNode, nodeStatistics, breadcrumbPath } = useVisualizationState();
  const { dataset, algorithm } = useDataState();
  
  // Use prop selectedNode if provided, otherwise use from state
  const selectedNode = propSelectedNode || stateSelectedNode;
  
  const [activeTab, setActiveTab] = useState('basic');
  const [loadingStats, setLoadingStats] = useState(false);

  // Navigate to a supernode
  const navigateToSupernode = async (supernodeId) => {
    if (!supernodeId) return;
    
    // If external navigation handler provided, use it
    if (onSupernodeNavigation) {
      onSupernodeNavigation(supernodeId);
      return;
    }
    
    // Otherwise, use internal state management
    actions.setCurrentSupernode(supernodeId);
    
    // Update the breadcrumb path
    const newBreadcrumb = { id: supernodeId, label: supernodeId };
    actions.setBreadcrumbPath([...breadcrumbPath, newBreadcrumb]);
    
    // Load node statistics
    await loadNodeStatistics(supernodeId);
  };

  // Load node statistics
  const loadNodeStatistics = async (nodeId) => {
    if (!dataset || !nodeId) return;
    
    setLoadingStats(true);
    try {
      const algorithmConfig = AlgorithmRegistry.getAlgorithm(algorithm);
      const parameters = algorithmConfig.getDefaultParameters(); // This should come from current state
      
      const response = await DataService.getNodeStatistics(algorithm, dataset, nodeId, parameters);
      
      if (response.success) {
        actions.setNodeStatistics(response.statistics);
      }
    } catch (err) {
      console.error('Error loading node statistics:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Format large numbers for display
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num < 1000) return num.toFixed(3);
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
    return (num / 1000000).toFixed(2) + 'M';
  };

  // Get color for DPR value (higher is more important)
  const getDprColor = (dpr) => {
    if (!dpr) return 'secondary';
    if (dpr > 0.001) return 'danger';   // Very high importance
    if (dpr > 0.0001) return 'warning'; // High importance
    if (dpr > 0.00001) return 'info';   // Medium importance
    return 'secondary';                 // Low importance
  };

  // Get node type badge variant
  const getNodeTypeBadge = (type) => {
    switch (type) {
      case 'leaf': return 'success';
      case 'supernode': return 'primary';
      default: return 'secondary';
    }
  };

  if (!selectedNode) {
    return (
      <Card className="node-info-panel">
        <Card.Header>Node Information</Card.Header>
        <Card.Body>
          <Alert variant="info" className="mb-0">
            <small>Select a node to view details</small>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="node-info-panel">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span>Node Information</span>
          <Badge bg={getNodeTypeBadge(selectedNode.type)}>
            {selectedNode.type || 'Unknown'}
          </Badge>
        </div>
      </Card.Header>
      <Card.Body>
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          {/* Basic Information Tab */}
          <Tab eventKey="basic" title="Basic">
            <div className="basic-info">
              <Table size="sm" className="mb-3">
                <tbody>
                  <tr>
                    <td><strong>ID:</strong></td>
                    <td><code>{selectedNode.id}</code></td>
                  </tr>
                  <tr>
                    <td><strong>Label:</strong></td>
                    <td>{selectedNode.label || selectedNode.id}</td>
                  </tr>
                  <tr>
                    <td><strong>Type:</strong></td>
                    <td>
                      <Badge bg={getNodeTypeBadge(selectedNode.type)}>
                        {selectedNode.type || 'Unknown'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Size/Radius:</strong></td>
                    <td>{formatNumber(selectedNode.size)}</td>
                  </tr>
                </tbody>
              </Table>
              
              {/* PPRviz-specific metadata */}
              {selectedNode.metadata && (
                <>
                  <h6 className="border-bottom pb-1">PPRviz Metadata</h6>
                  
                  {selectedNode.metadata.degree !== null && selectedNode.metadata.degree !== undefined && (
                    <p><strong>Degree:</strong> {formatNumber(selectedNode.metadata.degree)}</p>
                  )}
                  
                  {selectedNode.metadata.dpr !== null && selectedNode.metadata.dpr !== undefined && (
                    <div className="mb-3">
                      <strong>DPR (Importance):</strong>
                      <div className="d-flex align-items-center mt-2">
                        <Badge bg={getDprColor(selectedNode.metadata.dpr)} className="me-2">
                          {formatNumber(selectedNode.metadata.dpr)}
                        </Badge>
                        <ProgressBar 
                          now={Math.log10(selectedNode.metadata.dpr + 1e-10) / -10 * 100} 
                          style={{ flex: 1, height: '8px' }}
                          variant={getDprColor(selectedNode.metadata.dpr)}
                        />
                      </div>
                      <small className="text-muted">Higher values indicate more important nodes</small>
                    </div>
                  )}
                  
                  {selectedNode.metadata.leafCount !== null && selectedNode.metadata.leafCount !== undefined && (
                    <p><strong>Leaf Count:</strong> {selectedNode.metadata.leafCount}</p>
                  )}
                </>
              )}
              
              {/* Backend statistics */}
              {nodeStatistics && (
                <>
                  <h6 className="border-bottom pb-1 mt-3">Graph Statistics</h6>
                  {loadingStats ? (
                    <div className="text-center py-2">
                      <small className="text-muted">Loading statistics...</small>
                    </div>
                  ) : (
                    <Table size="sm">
                      <tbody>
                        <tr>
                          <td><strong>Total Degree:</strong></td>
                          <td>{nodeStatistics.degree}</td>
                        </tr>
                        <tr>
                          <td><strong>In-Degree:</strong></td>
                          <td>{nodeStatistics.inDegree}</td>
                        </tr>
                        <tr>
                          <td><strong>Out-Degree:</strong></td>
                          <td>{nodeStatistics.outDegree}</td>
                        </tr>
                        
                        {nodeStatistics.averageDegree && (
                          <tr>
                            <td><strong>Avg Degree:</strong></td>
                            <td>{formatNumber(nodeStatistics.averageDegree)}</td>
                          </tr>
                        )}
                        
                        {nodeStatistics.averageDpr && (
                          <tr>
                            <td><strong>Avg DPR:</strong></td>
                            <td>{formatNumber(nodeStatistics.averageDpr)}</td>
                          </tr>
                        )}
                        
                        {nodeStatistics.level && (
                          <tr>
                            <td><strong>Level:</strong></td>
                            <td>{nodeStatistics.level}</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  )}
                </>
              )}
            </div>
          </Tab>

          {/* Leaf-specific Information Tab */}
          {selectedNode.type === 'leaf' && selectedNode.metadata && (
            <Tab eventKey="leaf" title="Leaf Details">
              <div className="leaf-details">
                <h6>Original Leaf Node</h6>
                
                <Table size="sm" className="mb-3">
                  <tbody>
                    {selectedNode.metadata.actualLeafId !== null && selectedNode.metadata.actualLeafId !== undefined && (
                      <tr>
                        <td><strong>Actual Leaf ID:</strong></td>
                        <td><code>{selectedNode.metadata.actualLeafId}</code></td>
                      </tr>
                    )}
                    
                    {selectedNode.metadata.leafDegree !== null && selectedNode.metadata.leafDegree !== undefined && (
                      <tr>
                        <td><strong>Original Degree:</strong></td>
                        <td>{selectedNode.metadata.leafDegree}</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
                
                {selectedNode.metadata.leafDpr !== null && selectedNode.metadata.leafDpr !== undefined && (
                  <div className="mb-3">
                    <strong>Original DPR:</strong>
                    <div className="d-flex align-items-center mt-2">
                      <Badge bg={getDprColor(selectedNode.metadata.leafDpr)} className="me-2">
                        {formatNumber(selectedNode.metadata.leafDpr)}
                      </Badge>
                      <small className="text-muted">
                        (Importance in original graph)
                      </small>
                    </div>
                  </div>
                )}
                
                <Alert variant="info" className="mt-3">
                  <small>
                    This leaf node represents an actual node from the original graph dataset.
                  </small>
                </Alert>
              </div>
            </Tab>
          )}

          {/* Supernode-specific Information Tab */}
          {selectedNode.type === 'supernode' && (
            <Tab eventKey="supernode" title="Supernode">
              <div className="supernode-details">
                <h6>Supernode Information</h6>
                
                {nodeStatistics && nodeStatistics.children && (
                  <div className="mb-3">
                    <p><strong>Direct Children:</strong> {nodeStatistics.children.length}</p>
                    <div className="children-list" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                      {nodeStatistics.children.slice(0, 10).map((child, idx) => (
                        <Badge key={idx} bg="outline-secondary" className="me-1 mb-1">
                          {child}
                        </Badge>
                      ))}
                      {nodeStatistics.children.length > 10 && (
                        <Badge bg="outline-info">+{nodeStatistics.children.length - 10} more</Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {nodeStatistics && nodeStatistics.leafNodes && (
                  <div className="mb-3">
                    <p><strong>Total Leaf Nodes:</strong> {nodeStatistics.leafNodes.length}</p>
                    <small className="text-muted">
                      Represents {nodeStatistics.leafNodes.length} original graph nodes
                    </small>
                  </div>
                )}
                
                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    onClick={() => navigateToSupernode(selectedNode.id)}
                    disabled={!dataset}
                  >
                    🔍 Explore Supernode
                  </Button>
                  
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => loadNodeStatistics(selectedNode.id)}
                    disabled={loadingStats || !dataset}
                  >
                    {loadingStats ? 'Loading...' : '🔄 Refresh Statistics'}
                  </Button>
                </div>
                
                <Alert variant="success" className="mt-3">
                  <small>
                    Click "Explore Supernode" to dive deeper into this part of the graph hierarchy.
                  </small>
                </Alert>
              </div>
            </Tab>
          )}

          {/* Advanced/Debug Tab */}
          <Tab eventKey="advanced" title="Advanced">
            <div className="advanced-info">
              <h6>Position & Rendering</h6>
              
              <Table size="sm" className="mb-3">
                <tbody>
                  <tr>
                    <td><strong>Position X:</strong></td>
                    <td>{selectedNode.position?.x?.toFixed(2) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Position Y:</strong></td>
                    <td>{selectedNode.position?.y?.toFixed(2) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>CSS Classes:</strong></td>
                    <td><code>{selectedNode.classes || 'default'}</code></td>
                  </tr>
                  <tr>
                    <td><strong>Element ID:</strong></td>
                    <td><code>{selectedNode.data?.id || selectedNode.id}</code></td>
                  </tr>
                </tbody>
              </Table>
              
              {selectedNode.metadata && (
                <>
                  <h6 className="mt-3">Metadata Object</h6>
                  <pre className="bg-light p-2 small" style={{ 
                    fontSize: '10px', 
                    maxHeight: '200px', 
                    overflow: 'auto',
                    borderRadius: '4px'
                  }}>
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </>
              )}

              {selectedNode.data && (
                <>
                  <h6 className="mt-3">Full Data Object</h6>
                  <pre className="bg-light p-2 small" style={{ 
                    fontSize: '10px', 
                    maxHeight: '200px', 
                    overflow: 'auto',
                    borderRadius: '4px'
                  }}>
                    {JSON.stringify(selectedNode.data, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </Tab>
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default NodeInfoPanel;