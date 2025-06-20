import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { useAppState, useDataState, useAppMode, useComparisonState } from '../../core/AppStateManager';
import AlgorithmRegistry from '../../core/AlgorithmRegistry';
import FileUpload from '../FileUpload/FileUpload';
import './Header.css';

const Header = () => {
  const { actions } = useAppState();
  const { fileUploaded, algorithm } = useDataState();
  const mode = useAppMode();
  const { comparisonData } = useComparisonState();

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
      default: return 'primary';
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

  // Get comparison algorithms for display
  const getComparisonAlgorithms = () => {
    if (!comparisonData) return [];
    
    const algorithmIds = Object.keys(comparisonData).filter(key => 
      key !== 'metrics' && key !== 'timestamp' && comparisonData[key].parameters
    );
    
    return algorithmIds.map(id => {
      try {
        return AlgorithmRegistry.getAlgorithm(id);
      } catch (error) {
        console.warn(`Could not find algorithm config for: ${id}`);
        return { id, name: id };
      }
    });
  };

  // Render algorithm badges for comparison mode
  const renderComparisonBadges = () => {
    const algorithms = getComparisonAlgorithms();
    
    return algorithms.map((alg, index) => (
      <Badge 
        key={alg.id} 
        bg={getAlgorithmBadge(alg.id)} 
        className={index > 0 ? 'ms-1' : ''}
      >
        {alg.name || alg.id}
      </Badge>
    ));
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
              
              {mode === 'single' && algorithm && (
                <Badge bg={getAlgorithmBadge(algorithm)}>
                  {(() => {
                    try {
                      return AlgorithmRegistry.getAlgorithm(algorithm).name;
                    } catch (error) {
                      return algorithm;
                    }
                  })()}
                </Badge>
              )}
              
              {mode === 'comparison' && comparisonData && (
                <>{renderComparisonBadges()}</>
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
                  🔍 Single Mode
                </Nav.Link>
                
                {/* Only show comparison mode if algorithms support it */}
                {(() => {
                  // Check if current algorithm or any algorithm supports comparison
                  const hasComparisonSupport = mode === 'comparison' || 
                    (algorithm && AlgorithmRegistry.supportsComparison(algorithm)) ||
                    AlgorithmRegistry.getComparisonAlgorithms().length > 0;
                  
                  if (hasComparisonSupport) {
                    return (
                      <Nav.Link 
                        href="#"
                        onClick={() => handleModeSwitch('comparison')}
                        className={mode === 'comparison' ? 'active' : ''}
                      >
                        ⚖️ Comparison Mode
                      </Nav.Link>
                    );
                  }
                  return null;
                })()}
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