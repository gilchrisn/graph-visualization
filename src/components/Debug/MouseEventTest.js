// components/Debug/MouseEventTest.js - Simple test to verify mouse events work
import React, { useRef, useState, useEffect } from 'react';
import { Card, Button, Alert, Badge } from 'react-bootstrap';
import CytoscapeComponent from 'react-cytoscapejs';

const MouseEventTest = () => {
  const cyRef = useRef(null);
  const [mouseEvents, setMouseEvents] = useState([]);
  const [isTracking, setIsTracking] = useState(false);

  // Simple test data
  const testElements = [
    { data: { id: 'a', label: 'Node A' }, position: { x: 100, y: 100 } },
    { data: { id: 'b', label: 'Node B' }, position: { x: 200, y: 150 } },
    { data: { id: 'c', label: 'Node C' }, position: { x: 150, y: 250 } },
    { data: { id: 'ab', source: 'a', target: 'b' } },
    { data: { id: 'bc', source: 'b', target: 'c' } }
  ];

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#fff',
        'width': 30,
        'height': 30
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#ccc'
      }
    }
  ];

  // Mouse move handler
  const handleMouseMove = (event) => {
    if (!isTracking) return;
    
    const newEvent = {
      time: Date.now(),
      type: 'mousemove',
      renderedPosition: event.renderedPosition,
      position: event.position,
      originalEvent: !!event.originalEvent
    };
    
    setMouseEvents(prev => {
      const updated = [newEvent, ...prev.slice(0, 9)]; // Keep last 10 events
      return updated;
    });
    
    console.log('🖱️ Mouse move:', newEvent);
  };

  // Toggle tracking
  const toggleTracking = () => {
    if (!isTracking) {
      // Start tracking
      if (cyRef.current) {
        cyRef.current.on('mousemove', handleMouseMove);
        setIsTracking(true);
        setMouseEvents([]);
        console.log('✅ Mouse tracking started');
      } else {
        console.error('❌ No Cytoscape instance');
      }
    } else {
      // Stop tracking
      if (cyRef.current) {
        cyRef.current.removeListener('mousemove', handleMouseMove);
        setIsTracking(false);
        console.log('🛑 Mouse tracking stopped');
      }
    }
  };

  // Test fisheye manually
  const testFisheyeManual = () => {
    console.log('🧪 Testing manual position update...');
    if (cyRef.current) {
      const cy = cyRef.current;
      const nodeA = cy.getElementById('a');
      const nodeB = cy.getElementById('b');
      
      // Move nodes manually to test updates
      nodeA.position({ x: 150 + Math.random() * 100, y: 120 + Math.random() * 100 });
      nodeB.position({ x: 180 + Math.random() * 100, y: 180 + Math.random() * 100 });
      
      console.log('✅ Manual position update completed');
    }
  };

  // Clear events
  const clearEvents = () => {
    setMouseEvents([]);
  };

  // Setup basic events when Cytoscape is ready
  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      
      cy.ready(() => {
        console.log('🎯 Test Cytoscape ready');
        
        // Test basic click events
        cy.on('tap', 'node', (event) => {
          const node = event.target;
          console.log('🖱️ Node clicked:', node.id());
          
          const clickEvent = {
            time: Date.now(),
            type: 'click',
            nodeId: node.id(),
            renderedPosition: node.renderedPosition(),
            position: node.position()
          };
          
          setMouseEvents(prev => [clickEvent, ...prev.slice(0, 9)]);
        });
      });
    }
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5>Mouse Event Debug Test</h5>
            <Badge bg={isTracking ? "success" : "secondary"}>
              {isTracking ? "Tracking" : "Stopped"}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Test Graph */}
          <div style={{ height: '300px', border: '1px solid #ddd', marginBottom: '15px' }}>
            <CytoscapeComponent
              elements={testElements}
              stylesheet={stylesheet}
              layout={{ name: 'preset' }}
              style={{ width: '100%', height: '100%' }}
              cy={(cy) => { 
                cyRef.current = cy;
                console.log('🔧 Test Cytoscape instance set');
              }}
            />
          </div>
          
          {/* Controls */}
          <div className="d-flex gap-2 mb-3">
            <Button 
              variant={isTracking ? "danger" : "primary"}
              onClick={toggleTracking}
              disabled={!cyRef.current}
            >
              {isTracking ? "Stop" : "Start"} Mouse Tracking
            </Button>
            
            <Button 
              variant="info"
              onClick={testFisheyeManual}
              disabled={!cyRef.current}
            >
              🧪 Test Manual Move
            </Button>
            
            <Button 
              variant="secondary"
              onClick={clearEvents}
            >
              Clear Events
            </Button>
          </div>
          
          {/* Event Log */}
          <div>
            <h6>Recent Events ({mouseEvents.length}/10):</h6>
            {mouseEvents.length === 0 ? (
              <Alert variant="info">
                No events captured yet. Start tracking and move mouse over the graph.
              </Alert>
            ) : (
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {mouseEvents.map((event, index) => (
                  <div key={event.time} style={{ 
                    marginBottom: '5px',
                    opacity: 1 - (index * 0.1)
                  }}>
                    <strong>{event.type}</strong> @ {new Date(event.time).toLocaleTimeString()}
                    {event.renderedPosition && (
                      <span> - Rendered: ({event.renderedPosition.x.toFixed(1)}, {event.renderedPosition.y.toFixed(1)})</span>
                    )}
                    {event.position && (
                      <span> - Graph: ({event.position.x.toFixed(1)}, {event.position.y.toFixed(1)})</span>
                    )}
                    {event.nodeId && (
                      <span> - Node: {event.nodeId}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Instructions */}
          <Alert variant="success" className="mt-3">
            <small>
              <strong>Debug Instructions:</strong><br/>
              1. Click "Start Mouse Tracking"<br/>
              2. Move mouse over the graph area<br/>
              3. Click on nodes<br/>
              4. Check if events appear in the log<br/>
              5. Use "Test Manual Move" to verify position updates work
            </small>
          </Alert>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MouseEventTest;