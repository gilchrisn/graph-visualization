import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { useAppState, useDataState, useAppMode } from '../../core/AppStateManager';
import FileUpload from '../FileUpload/FileUpload';
import './Header.css';

const Header = () => {
  const { actions } = useAppState();
  const { fileUploaded, algorithm } = useDataState();
  const mode = useAppMode();

  // Handle mode switching
  const handleModeSwitch = (newMode) => {
    actions.setMode(newMode);
  };

  // Get algorithm badge variant
  const getAlgorithmBadge = (alg) => {
    switch (alg) {
      case 'homogeneous': return 'success';
      case 'heterogeneous': return 'info';
      case 'scar': return 'warning';
      default: return 'secondary';
    }
  };

  // Get mode badge variant
  const getModeBadge = (currentMode) => {
    switch (currentMode) {
      case 'single': return 'primary';
      case 'comparison': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="#home">
          PPRviz Graph Visualization
          {fileUploaded && (
            <div className="d-inline-block ms-3">
              <Badge bg={getModeBadge(mode)} className="me-2">
                {mode === 'comparison' ? 'Comparison' : 'Single'} Mode
              </Badge>
              {mode === 'single' && (
                <Badge bg={getAlgorithmBadge(algorithm)}>
                  {algorithm}
                </Badge>
              )}
            </div>
          )}
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {fileUploaded && (
              <>
                <Nav.Link 
                  href="#"
                  onClick={() => handleModeSwitch('single')}
                  className={mode === 'single' ? 'active' : ''}
                >
                  📊 Single Mode
                </Nav.Link>
                <Nav.Link 
                  href="#"
                  onClick={() => handleModeSwitch('comparison')}
                  className={mode === 'comparison' ? 'active' : ''}
                >
                  🔄 Comparison Mode
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav className="ms-auto">
            <FileUpload />
            
            <Nav.Link href="https://github.com/yourusername/pprviz-frontend" target="_blank">
              GitHub
            </Nav.Link>
            
            <Nav.Link href="#help">
              Help
            </Nav.Link>
            
            {fileUploaded && (
              <Nav.Link 
                href="#"
                onClick={() => {
                  if (window.confirm('Reset all data and start over?')) {
                    actions.resetAll();
                  }
                }}
                className="text-danger"
              >
                Reset
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;