// src/components/Debug/FisheyeTestComponent.js - For testing fisheye functionality

import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Alert, Form, Row, Col, Badge } from 'react-bootstrap';
import CytoscapeComponent from 'react-cytoscapejs';
import { usePPRvizFisheye } from '../../utils/fisheyeManager';
import { cytoscapeStylesheet, setupCytoscapeEvents } from '../../utils/cytoscapeConfig';

/**
 * Test component for debugging fisheye implementation
 * This component can be temporarily added to test fisheye functionality
 */
const FisheyeTestComponent = () => {
  const cyRef = useRef(null);
  const [testMode, setTestMode] = useState('simple');
  const [magnification, setMagnification] = useState(3.0);
  const [elements, setElements] = useState([]);
  const [debugInfo, setDebugInfo] = useState('');

  const {
    initializeFisheye,
    applyFisheyeAt,
    resetFisheye,
    isFisheyeActive,
    lastError
  } = usePPRvizFisheye();

  // Generate test data
  const generateTestData = (mode) => {
    let testElements = [];
    
    switch (mode) {
      case 'simple':
        // Simple 5-node test
        testElements = [
          // Nodes
          { data: { id: 'n1', label: 'Node 1', size: 30, type: 'supernode' }, position: { x: 100, y: 100 } },
          { data: { id: 'n2', label: 'Node 2', size: 25, type: 'leaf' }, position: { x: 200, y: 150 } },
          { data: { id: 'n3', label: 'Node 3', size: 35, type: 'supernode' }, position: { x: 300, y: 100 } },
          { data: { id: 'n4', label: 'Node 4', size: 20, type: 'leaf' }, position: { x: 150, y: 250 } },
          { data: { id: 'n5', label: 'Node 5', size: 28, type: 'leaf' }, position: { x: 250, y: 200 } },
          // Edges
          { data: { id: 'e1', source: 'n1', target: 'n2' } },
          { data: { id: 'e2', source: 'n2', target: 'n3' } },
          { data: { id: 'e3', source: 'n3', target: 'n4' } },
          { data: { id: 'e4', source: 'n4', target: 'n5' } },
          { data: { id: 'e5', source: 'n5', target: 'n1' } }
        ];
        break;
        
      case 'grid':
        // Grid layout test
        testElements = [];
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            const id = `n_${i}_${j}`;
            testElements.push({
              data: { 
                id, 
                label: `${i},${j}`, 
                size: 20 + Math.random() * 15,
                type: Math.random() > 0.5 ? 'supernode' : 'leaf',
                metadata: {
                  importance: Math.random() * 0.001,
                  degree: Math.floor(Math.random() * 10) + 1
                }
              },
              position: { x: 100 + i * 80, y: 100 + j * 80 }
            });
            
            // Add edges to neighbors
            if (i > 0) {
              testElements.push({
                data: { 
                  id: `e_${i}_${j}_left`, 
                  source: id, 
                  target: `n_${i-1}_${j}` 
                }
              });
            }
            if (j > 0) {
              testElements.push({
                data: { 
                  id: `e_${i}_${j}_up`, 
                  source: id, 
                  target: `n_${i}_${j-1}` 
                }
              });
            }
          }
        }
        break;
        
      case 'cluster':
        // Clustered layout test
        testElements = [];
        const clusters = [
          { center: { x: 150, y: 150 }, nodes: 8 },
          { center: { x: 350, y: 150 }, nodes: 6 },
          { center: { x: 250, y: 300 }, nodes: 7 }
        ];
        
        clusters.forEach((cluster, clusterIdx) => {
          for (let i = 0; i < cluster.nodes; i++) {
            const angle = (2 * Math.PI * i) / cluster.nodes;
            const radius = 50 + Math.random() * 30;
            const id = `c${clusterIdx}_n${i}`;
            
            testElements.push({
              data: {
                id,
                label: `C${clusterIdx}N${i}`,
                size: 15 + Math.random() * 20,
                type: i === 0 ? 'supernode' : 'leaf',
                metadata: {
                  importance: Math.random() * 0.01,
                  degree: Math.floor(Math.random() * 15) + 2
                }
              },
              position: {
                x: cluster.center.x + Math.cos(angle) * radius,
                y: cluster.center.y + Math.sin(angle) * radius
              }
            });
            
            // Connect to center node
            if (i > 0) {
              testElements.push({
                data: {
                  id: `c${clusterIdx}_e${i}`,
                  source: `c${clusterIdx}_n0`,
                  target: id
                }
              });
            }
          }
        });
        
        // Inter-cluster connections
        testElements.push(
          { data: { id: 'inter1', source: 'c0_n0', target: 'c1_n0' } },
          { data: { id: 'inter2', source: 'c1_n0', target: 'c2_n0' } },
          { data: { id: 'inter3', source: 'c2_n0', target: 'c0_n0' } }
        );
        break;
    }
    
    return testElements;
  };

  // Initialize test data
  useEffect(() => {
    const testElements = generateTestData(testMode);
    setElements(testElements);
    setDebugInfo(`Generated ${testElements.filter(e => e.data.source).length} edges and ${testElements.filter(e => !e.data.source).length} nodes for ${testMode} test`);
  }, [testMode]);

  // Handle mouse move for fisheye
  const handleMouseMove = (event) => {
    if (!isFisheyeActive) return;
    
    const renderedPosition = event.renderedPosition;
    if (renderedPosition) {
      const transformedElements = applyFisheyeAt(
        renderedPosition.x,
        renderedPosition.y,
        magnification
      );
      
      if (transformedElements) {
        // Update debug info
        setDebugInfo(`Fisheye applied at (${renderedPosition.x.toFixed(1)}, ${renderedPosition.y.toFixed(1)}) with ${transformedElements.length} elements`);
        
        // Update Cytoscape positions
        if (cyRef.current) {
          cyRef.current.batch(() => {
            transformedElements.forEach(element => {
              if (element.position) {
                const cyElement = cyRef.current.getElementById(element.data.id);
                if (cyElement.length > 0) {
                  cyElement.position(element.position);
                }
              }
            });
          });
        }
      }
    }
  };

  // Toggle fisheye
  const toggleFisheye = () => {
    if (!isFisheyeActive) {
      const success = initializeFisheye(elements);
      if (success) {
        setDebugInfo('Fisheye initialized successfully');
        // Set up mouse tracking
        if (cyRef.current) {
          cyRef.current.on('mousemove', handleMouseMove);
        }
      } else {
        setDebugInfo('Failed to initialize fisheye');
      }
    } else {
      const restoredElements = resetFisheye();
      if (restoredElements) {
        setElements(restoredElements);
        setDebugInfo('Fisheye reset successfully');
      }
      // Remove mouse tracking
      if (cyRef.current) {
        cyRef.current.removeListener('mousemove', handleMouseMove);
      }
    }
  };

  // Handle node click
  const handleNodeClick = (event) => {
    const node = event.target;
    const position = node.renderedPosition();
    setDebugInfo(`Clicked node ${node.id()} at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
    
    if (isFisheyeActive) {
      const transformedElements = applyFisheyeAt(position.x, position.y, magnification);
      if (transformedElements && cyRef.current) {
        setElements(transformedElements);
      }
    }
  };

  // Set up events
  useEffect(() => {
    if (cyRef.current && elements.length > 0) {
      setTimeout(() => {
        if (cyRef.current) {
          setupCytoscapeEvents(cyRef, handleNodeClick);
        }
      }, 100);
    }
  }, [elements]);

  return (
    <div className="fisheye-test-component">
      <Row>
        <Col md={8}>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5>Fisheye Test Component</h5>
                <Badge bg={isFisheyeActive ? 'success' : 'secondary'}>
                  {isFisheyeActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '500px', border: '1px solid #ddd' }}>
                <CytoscapeComponent
                  elements={elements}
                  stylesheet={cytoscapeStylesheet}
                  layout={{ name: 'preset' }}
                  style={{ width: '100%', height: '100%' }}
                  cy={(cy) => { 
                    cyRef.current = cy;
                    cy.ready(() => {
                      console.log('Test Cytoscape ready with', cy.elements().length, 'elements');
                    });
                  }}
                />
              </div>
              
              {debugInfo && (
                <Alert variant="info" className="mt-2 mb-0">
                  <small>{debugInfo}</small>
                </Alert>
              )}
              
              {lastError && (
                <Alert variant="danger" className="mt-2 mb-0">
                  <small><strong>Error:</strong> {lastError}</small>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <Card.Header>Controls</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Test Mode</Form.Label>
                <Form.Select 
                  value={testMode} 
                  onChange={(e) => setTestMode(e.target.value)}
                  disabled={isFisheyeActive}
                >
                  <option value="simple">Simple (5 nodes)</option>
                  <option value="grid">Grid (25 nodes)</option>
                  <option value="cluster">Clustered (21 nodes)</option>
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Magnification: {magnification}x</Form.Label>
                <Form.Range
                  min={1}
                  max={8}
                  step={0.5}
                  value={magnification}
                  onChange={(e) => setMagnification(parseFloat(e.target.value))}
                />
              </Form.Group>
              
              <div className="d-grid gap-2">
                <Button
                  variant={isFisheyeActive ? 'danger' : 'primary'}
                  onClick={toggleFisheye}
                >
                  {isFisheyeActive ? 'Disable' : 'Enable'} Fisheye
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => {
                    const newElements = generateTestData(testMode);
                    setElements(newElements);
                    setDebugInfo('Test data regenerated');
                  }}
                  disabled={isFisheyeActive}
                >
                  Regenerate Data
                </Button>
              </div>
              
              <hr />
              
              <div className="small text-muted">
                <p><strong>Instructions:</strong></p>
                <ul className="mb-0">
                  <li>Select a test mode and click "Enable Fisheye"</li>
                  <li>Move mouse over the graph to apply fisheye effect</li>
                  <li>Click nodes to focus fisheye at that point</li>
                  <li>Adjust magnification with the slider</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FisheyeTestComponent;