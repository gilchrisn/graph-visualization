import React from 'react';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Header from './components/Layout/Header';
import GraphVisualization from './components/GraphVisualization/GraphVisualization';
import { GraphProvider } from './context/GraphContext';

import MouseEventTest from './components/Debug/MouseEventTest';

function App() {
  return (
    <GraphProvider>
      <div className="App">
        <Header />
        <Container fluid className="main-container">
          <GraphVisualization />
        </Container>
      </div>
      <MouseEventTest />
    </GraphProvider>
  );
}

export default App;