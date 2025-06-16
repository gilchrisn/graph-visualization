import React, { useState } from 'react';
import { Card, Button, Tabs, Tab, Table, Badge, ProgressBar } from 'react-bootstrap';
import { useGraph } from '../../context/GraphContext';
import './NodeInfoPanel.css';

const NodeInfoPanel = ({ loadSupernodeData }) => {
  const { 
    selectedNode, 
    nodeStatistics, 
    currentSupernode,
    breadcrumbPath,
    setBreadcrumbPath,
    setCurrentSupernode,
    dataset,
    k
  } = useGraph();

  const [activeTab, setActiveTab] = useState('basic');

  // Navigate to a supernode
  const navigateToSupernode = (supernodeId) => {
    if (!supernodeId) return;
    
    setCurrentSupernode(supernodeId);
    
    // Update the breadcrumb path
    const newBreadcrumb = { id: supernodeId, label: supernodeId };
    setBreadcrumbPath([...breadcrumbPath, newBreadcrumb]);
    
    // Load the supernode data using the passed function
    if (dataset && supernodeId) {
      loadSupernodeData(supernodeId);
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

  if (!selectedNode) {
    return (
      <Card className="node-info-panel">
        <Card.Header>Node Information</Card.Header>
        <Card.Body>
          <p className="text-muted">Select a node to view details</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="node-info-panel">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span>Node Information</span>
          <Badge bg={selectedNode.type === 'leaf' ? 'success' : 'primary'}>
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
              <p><strong>ID:</strong> {selectedNode.id}</p>
              <p><strong>Label:</strong> {selectedNode.label || selectedNode.id}</p>
              <p><strong>Size/Radius:</strong> {formatNumber(selectedNode.size)}</p>
              
              {/* PPRviz-specific metadata */}
              {selectedNode.metadata && (
                <>
                  <hr />
                  <h6>PPRviz Metadata</h6>
                  
                  {selectedNode.metadata.degree !== null && (
                    <p><strong>Degree:</strong> {formatNumber(selectedNode.metadata.degree)}</p>
                  )}
                  
                  {selectedNode.metadata.dpr !== null && (
                    <div className="mb-2">
                      <strong>DPR (Importance):</strong>
                      <div className="d-flex align-items-center mt-1">
                        <Badge bg={getDprColor(selectedNode.metadata.dpr)} className="me-2">
                          {formatNumber(selectedNode.metadata.dpr)}
                        </Badge>
                        <ProgressBar 
                          now={Math.log10(selectedNode.metadata.dpr + 1e-10) / -10 * 100} 
                          style={{ flex: 1, height: '8px' }}
                          variant={getDprColor(selectedNode.metadata.dpr)}
                        />
                      </div>
                    </div>
                  )}
                  
                  {selectedNode.metadata.leafCount !== null && (
                    <p><strong>Leaf Count:</strong> {selectedNode.metadata.leafCount}</p>
                  )}
                </>
              )}
              
              {/* Traditional statistics from backend */}
              {nodeStatistics && (
                <>
                  <hr />
                  <h6>Graph Statistics</h6>
                  <p><strong>Total Degree:</strong> {nodeStatistics.degree}</p>
                  <p><strong>In-Degree:</strong> {nodeStatistics.inDegree}</p>
                  <p><strong>Out-Degree:</strong> {nodeStatistics.outDegree}</p>
                  
                  {/* {nodeStatistics.children !== undefined && (
                    <>
                      <p><strong>Children:</strong> {nodeStatistics.children}</p>
                      <p><strong>Leaf Nodes:</strong> {nodeStatistics.leafNodes}</p>
                    </>
                  )} */}
                  
                  {nodeStatistics.averageDegree && (
                    <p><strong>Avg Degree:</strong> {formatNumber(nodeStatistics.averageDegree)}</p>
                  )}
                  
                  {nodeStatistics.averageDpr && (
                    <p><strong>Avg DPR:</strong> {formatNumber(nodeStatistics.averageDpr)}</p>
                  )}
                  
                  {nodeStatistics.level && (
                    <p><strong>Level:</strong> {nodeStatistics.level}</p>
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
                
                {selectedNode.metadata.actualLeafId !== null && (
                  <p><strong>Actual Leaf ID:</strong> {selectedNode.metadata.actualLeafId}</p>
                )}
                
                {selectedNode.metadata.leafDegree !== null && (
                  <p><strong>Original Degree:</strong> {selectedNode.metadata.leafDegree}</p>
                )}
                
                {selectedNode.metadata.leafDpr !== null && (
                  <div className="mb-2">
                    <strong>Original DPR:</strong>
                    <div className="d-flex align-items-center mt-1">
                      <Badge bg={getDprColor(selectedNode.metadata.leafDpr)} className="me-2">
                        {formatNumber(selectedNode.metadata.leafDpr)}
                      </Badge>
                      <small className="text-muted">
                        (Importance in original graph)
                      </small>
                    </div>
                  </div>
                )}
                
                <hr />
                <small className="text-muted">
                  This leaf node represents an actual node from the original graph dataset.
                </small>
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
                
                <Button 
                  variant="primary" 
                  className="w-100"
                  onClick={() => navigateToSupernode(selectedNode.id)}
                >
                  🔍 Explore Supernode
                </Button>
                
                <hr />
                <small className="text-muted">
                  Click to dive deeper into this part of the graph hierarchy.
                </small>
              </div>
            </Tab>
          )}

          {/* Advanced/Debug Tab */}
          <Tab eventKey="advanced" title="Advanced">
            <div className="advanced-info">
              <h6>Raw Data</h6>
              
              <Table size="sm" className="mt-2">
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
                    <td>{selectedNode.classes || 'default'}</td>
                  </tr>
                </tbody>
              </Table>
              
              {selectedNode.metadata && (
                <>
                  <h6 className="mt-3">Metadata Object</h6>
                  <pre className="bg-light p-2 small" style={{ fontSize: '10px', maxHeight: '150px', overflow: 'auto' }}>
                    {JSON.stringify(selectedNode.metadata, null, 2)}
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