// src/App.js - Refactored with new architecture

import React from 'react';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Header from './components/Layout/Header';
import ModeContainer from './modes/ModeContainer';
import { AppStateProvider } from './core/AppStateManager';


function App() {
  return (
    <AppStateProvider>
      <div className="App">
        <Header />
        <Container fluid className="main-container">
          <ModeContainer />
        </Container>
      </div>
    </AppStateProvider>
  );
}

export default App;