import React, { useState } from 'react';
import { Card, Form, Button, ButtonGroup, Badge, Alert } from 'react-bootstrap';
import { useAppState, useVisualizationState } from '../../core/AppStateManager';
import LayoutManager from '../../visualization/LayoutManager';

const VisualizationControls = () => {
  const { actions } = useAppState();
  const { layout, cytoscapeElements } = useVisualizationState();
  
  // Local state for visualization options
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeSize, setNodeSize] = useState(1.0);
  const [edgeWidth, setEdgeWidth] = useState(1.0);
  const [layoutApplying, setLayoutApplying] = useState(false);

  // Get available layouts
  const layoutManager = new LayoutManager();
  const availableLayouts = layoutManager.getAvailableLayouts();

  // Handle layout change
  const handleLayoutChange = async (newLayout) => {
    if (layoutApplying) return;
    
    setLayoutApplying(true);
    try {
      actions.setLayout(newLayout);
      
      // Apply layout through LayoutManager would happen in CytoscapeContainer
      // This is just updating the state for now
      console.log(`Layout changed to: ${newLayout}`);
      
    } catch (error) {
      console.error('Failed to apply layout:', error);
    } finally {
      setTimeout(() => setLayoutApplying(false), 1000);
    }
  };

  // Handle visualization option changes
  const handleShowEdgesChange = (show) => {
    setShowEdges(show);
    // This would be implemented by updating Cytoscape stylesheet
    console.log(`Edges visibility: ${show}`);
  };

  const handleShowLabelsChange = (show) => {
    setShowLabels(show);
    // This would be implemented by updating Cytoscape stylesheet
    console.log(`Labels visibility: ${show}`);
  };

  const handleNodeSizeChange = (size) => {
    setNodeSize(size);
    // This would be implemented by updating Cytoscape stylesheet
    console.log(`Node size scale: ${size}`);
  };

  const handleEdgeWidthChange = (width) => {
    setEdgeWidth(width);
    // This would be implemented by updating Cytoscape stylesheet
    console.log(`Edge width scale: ${width}`);
  };

  // Export visualization
  const handleExport = (format) => {
    // This would be implemented through VisualizationEngine
    console.log(`Exporting as ${format}`);
    
    // Placeholder implementation
    alert(`Export as ${format} - Feature coming soon!`);
  };

  // Fit visualization to screen
  const handleFitToScreen = () => {
    // This would be implemented through LayoutManager
    console.log('Fitting visualization to screen');
  };

  // Reset zoom and pan
  const handleResetView = () => {
    // This would be implemented through LayoutManager
    console.log('Resetting view');
  };

  return (
    <Card className="mb-3">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span>Visualization Controls</span>
          <Badge bg="secondary">
            {cytoscapeElements.filter(el => !el.data?.source).length} nodes
          </Badge>
        </div>
      </Card.Header>
      
      <Card.Body>
        {/* Layout Controls */}
        <div className="mb-4">
          <Form.Label className="fw-bold">Layout Algorithm</Form.Label>
          <Form.Select 
            value={layout}
            onChange={(e) => handleLayoutChange(e.target.value)}
            disabled={layoutApplying || cytoscapeElements.length === 0}
          >
            {availableLayouts.map(layoutOption => (
              <option key={layoutOption.id} value={layoutOption.id}>
                {layoutOption.name}
              </option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            {availableLayouts.find(l => l.id === layout)?.description || 'Select a layout algorithm'}
          </Form.Text>
          
          {layoutApplying && (
            <Alert variant="info" className="mt-2 mb-0 py-2">
              <small>Applying layout...</small>
            </Alert>
          )}
        </div>

        {/* View Controls */}
        <div className="mb-4">
          <Form.Label className="fw-bold">View Controls</Form.Label>
          <div className="d-grid gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleFitToScreen}
              disabled={cytoscapeElements.length === 0}
            >
              🔍 Fit to Screen
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleResetView}
              disabled={cytoscapeElements.length === 0}
            >
              🏠 Reset View
            </Button>
          </div>
        </div>

        {/* Display Options */}
        <div className="mb-4">
          <Form.Label className="fw-bold">Display Options</Form.Label>
          
          {/* Show/Hide Elements */}
          <div className="mb-3">
            <Form.Check
              type="checkbox"
              id="show-edges"
              label="Show Edges"
              checked={showEdges}
              onChange={(e) => handleShowEdgesChange(e.target.checked)}
            />
            <Form.Check
              type="checkbox"
              id="show-labels"
              label="Show Node Labels"
              checked={showLabels}
              onChange={(e) => handleShowLabelsChange(e.target.checked)}
            />
          </div>

          {/* Node Size */}
          <Form.Group className="mb-3">
            <Form.Label>Node Size: {nodeSize.toFixed(1)}x</Form.Label>
            <Form.Range
              min="0.5"
              max="3.0"
              step="0.1"
              value={nodeSize}
              onChange={(e) => handleNodeSizeChange(parseFloat(e.target.value))}
            />
          </Form.Group>

          {/* Edge Width */}
          <Form.Group className="mb-3">
            <Form.Label>Edge Width: {edgeWidth.toFixed(1)}x</Form.Label>
            <Form.Range
              min="0.1"
              max="5.0"
              step="0.1"
              value={edgeWidth}
              onChange={(e) => handleEdgeWidthChange(parseFloat(e.target.value))}
            />
          </Form.Group>
        </div>

        {/* Color Schemes */}
        <div className="mb-4">
          <Form.Label className="fw-bold">Color Scheme</Form.Label>
          <ButtonGroup className="w-100" size="sm">
            <Button variant="outline-primary" active>
              Default
            </Button>
            <Button variant="outline-primary">
              High Contrast
            </Button>
            <Button variant="outline-primary">
              Colorblind Safe
            </Button>
          </ButtonGroup>
        </div>

        {/* Export Options */}
        <div className="mb-3">
          <Form.Label className="fw-bold">Export</Form.Label>
          <div className="d-grid gap-2">
            <ButtonGroup>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleExport('png')}
                disabled={cytoscapeElements.length === 0}
              >
                PNG
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleExport('svg')}
                disabled={cytoscapeElements.length === 0}
              >
                SVG
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={cytoscapeElements.length === 0}
              >
                PDF
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-3 pt-3 border-top">
          <small className="text-muted">
            <div><strong>Elements:</strong> {cytoscapeElements.length}</div>
            <div><strong>Nodes:</strong> {cytoscapeElements.filter(el => !el.data?.source).length}</div>
            <div><strong>Edges:</strong> {cytoscapeElements.filter(el => el.data?.source).length}</div>
            <div><strong>Layout:</strong> {layout}</div>
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default VisualizationControls;