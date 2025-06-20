import React, { useState } from 'react';
import { Button, ButtonGroup, Modal, Form, Alert, Spinner, Card, Row, Col, Badge } from 'react-bootstrap';
import { useAppState, useLoadingState } from '../../core/AppStateManager';
import DataService from '../../core/DataService';
import AlgorithmRegistry from '../../core/AlgorithmRegistry';
import GraphTypeManager from '../../core/GraphTypeManager';
import './FileUpload.css';

const FileUpload = () => {
  const { actions } = useAppState();
  const { loading } = useLoadingState();
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'compare'
  
  // Graph type selection (step 1)
  const [selectedGraphType, setSelectedGraphType] = useState('');
  
  // File upload state (step 2)
  const [files, setFiles] = useState({});
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Algorithm selection and parameters (step 3)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [parameters, setParameters] = useState({});
  
  // Comparison mode specific state
  const [leftAlgorithm, setLeftAlgorithm] = useState('');
  const [rightAlgorithm, setRightAlgorithm] = useState('');
  const [comparisonParameters, setComparisonParameters] = useState({});

  // Get available graph types
  const availableGraphTypes = GraphTypeManager.getAllGraphTypes();

  // Handle modal open/close
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    resetAllState();
  };

  const resetAllState = () => {
    setError(null);
    setFiles({});
    setUploadMode('single');
    setSelectedGraphType('');
    setSelectedAlgorithm('');
    setParameters({});
    setLeftAlgorithm('');
    setRightAlgorithm('');
    setComparisonParameters({});
  };

  // Handle upload mode change
  const handleUploadModeChange = (mode) => {
    setUploadMode(mode);
    setError(null);
    setFiles({});
    setSelectedGraphType('');
    setSelectedAlgorithm('');
    setParameters({});
    setLeftAlgorithm('');
    setRightAlgorithm('');
    setComparisonParameters({});
  };

  // Handle graph type selection (step 1)
  const handleGraphTypeChange = (graphTypeId) => {
    setSelectedGraphType(graphTypeId);
    setFiles({});
    setError(null);
    
    if (uploadMode === 'single') {
      // Reset algorithm selection for single mode
      setSelectedAlgorithm('');
      setParameters({});
    } else {
      // Reset algorithm selections for comparison mode
      setLeftAlgorithm('');
      setRightAlgorithm('');
      setComparisonParameters({});
    }
  };

  // Handle algorithm selection (single mode, step 3)
  const handleAlgorithmChange = (algorithmId) => {
    setSelectedAlgorithm(algorithmId);
    setParameters(AlgorithmRegistry.getDefaultParameters(algorithmId));
    setError(null);
  };

  // Handle left algorithm selection (comparison mode)
  const handleLeftAlgorithmChange = (algorithmId) => {
    setLeftAlgorithm(algorithmId);
    setError(null);
  };

  // Handle right algorithm selection (comparison mode)
  const handleRightAlgorithmChange = (algorithmId) => {
    setRightAlgorithm(algorithmId);
    setError(null);
  };

  // Update comparison parameters when algorithms change
  React.useEffect(() => {
    const newParams = {};
    if (leftAlgorithm) {
      newParams[leftAlgorithm] = AlgorithmRegistry.getDefaultParameters(leftAlgorithm);
    }
    if (rightAlgorithm) {
      newParams[rightAlgorithm] = AlgorithmRegistry.getDefaultParameters(rightAlgorithm);
    }
    setComparisonParameters(newParams);
  }, [leftAlgorithm, rightAlgorithm]);

  // Handle file changes (step 2)
  const handleFileChange = (fileType, file) => {
    setFiles(prev => ({ ...prev, [fileType]: file }));
    setError(null);
  };

  // Handle parameter changes (single mode)
  const handleParameterChange = (paramId, value) => {
    setParameters(prev => ({ ...prev, [paramId]: value }));
  };

  // Handle comparison parameter changes
  const handleComparisonParameterChange = (algorithmId, paramId, value) => {
    setComparisonParameters(prev => ({
      ...prev,
      [algorithmId]: {
        ...prev[algorithmId],
        [paramId]: value
      }
    }));
  };

  // Get algorithms available for selected graph type (single mode)
  const getAvailableAlgorithms = () => {
    if (!selectedGraphType) return [];
    try {
      return GraphTypeManager.getAlgorithmsForGraphType(selectedGraphType).map(algorithmId => 
        AlgorithmRegistry.getAlgorithm(algorithmId)
      );
    } catch (error) {
      return [];
    }
  };

  // Get file requirements for current graph type
  const getFileRequirements = () => {
    if (!selectedGraphType) return null;
    try {
      return GraphTypeManager.getGraphType(selectedGraphType).fileRequirements;
    } catch (error) {
      return null;
    }
  };

  // Get current algorithm config (single mode)
  const getCurrentAlgorithm = () => {
    if (!selectedAlgorithm) return null;
    try {
      return AlgorithmRegistry.getAlgorithm(selectedAlgorithm);
    } catch (error) {
      return null;
    }
  };

  // Generate file input fields
  const renderFileInputs = (fileRequirements) => {
    if (!fileRequirements) return null;

    return fileRequirements.types.map(fileType => {
      const fieldName = `${fileType}File`;
      
      return (
        <Form.Group key={fileType} className="mb-3">
          <Form.Label>
            {fileType.charAt(0).toUpperCase() + fileType.slice(1)} File
            {fileRequirements.naming && (
              <small className="text-muted ms-2">(*_{fileType}.{fileRequirements.extensions[0].replace('.', '')})</small>
            )}
          </Form.Label>
          <Form.Control
            type="file"
            accept={fileRequirements.extensions.join(',')}
            onChange={(e) => handleFileChange(fieldName, e.target.files[0])}
          />
          <Form.Text className="text-muted">
            {fileRequirements.descriptions[fileType]}
          </Form.Text>
        </Form.Group>
      );
    });
  };

  // Generate parameter inputs
  const renderParameterInputs = (algorithm, currentParams, onParamChange) => {
    return algorithm.parameterSchema.map(param => (
      <Form.Group key={param.id} className="mb-3">
        <Form.Label>{param.name}</Form.Label>
        {param.type === 'number' ? (
          <Form.Control
            type="number"
            value={currentParams[param.id] || param.default}
            min={param.min}
            max={param.max}
            onChange={(e) => onParamChange(param.id, parseInt(e.target.value) || param.default)}
          />
        ) : param.type === 'range' ? (
          <>
            <Form.Range
              min={param.min}
              max={param.max}
              step={param.step}
              value={currentParams[param.id] || param.default}
              onChange={(e) => onParamChange(param.id, parseFloat(e.target.value))}
            />
            <Form.Text className="text-muted">
              Current value: {currentParams[param.id] || param.default}
            </Form.Text>
          </>
        ) : null}
        <Form.Text className="text-muted">{param.description}</Form.Text>
      </Form.Group>
    ));
  };

  // Check if ready to process
  const isReadyToProcess = () => {
    if (!selectedGraphType) return false;
    
    const fileReqs = getFileRequirements();
    if (!fileReqs) return false;

    // Check if all required files are uploaded
    const filesReady = fileReqs.types.every(type => files[`${type}File`]);
    if (!filesReady) return false;

    if (uploadMode === 'single') {
      return selectedAlgorithm && Object.keys(parameters).length > 0;
    } else {
      return leftAlgorithm && rightAlgorithm && leftAlgorithm !== rightAlgorithm && Object.keys(comparisonParameters).length === 2;
    }
  };

  // Process files for single algorithm mode
  const processSingleMode = async () => {
    setProcessing(true);
    setError(null);

    try {
      const currentAlg = getCurrentAlgorithm();
      if (!currentAlg) throw new Error('No algorithm selected');

      // Validate files
      const fileValidation = AlgorithmRegistry.validateFiles(selectedAlgorithm, files);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.error);
      }

      // Validate parameters
      const paramValidation = AlgorithmRegistry.validateParameters(selectedAlgorithm, parameters);
      if (!paramValidation.valid) {
        throw new Error(paramValidation.error);
      }

      // Update app state
      actions.setMode('single');
      actions.setAlgorithm(selectedAlgorithm);
      actions.setLoading(true);
      actions.setProcessingStep('Processing dataset...');

      // Process using DataService
      const result = await DataService.processDataset(selectedAlgorithm, files, parameters);
      
      if (!result.success) {
        throw new Error(result.message || 'Processing failed');
      }

      // Load hierarchy data
      const hierarchyResult = await DataService.getHierarchyData(
        selectedAlgorithm,
        result.result?.datasetId || result.datasetId,
        parameters
      );

      if (!hierarchyResult.success) {
        throw new Error(hierarchyResult.message || 'Failed to load hierarchy data');
      }

      // Update app state with results
      actions.setDataset(result.result?.datasetId || result.datasetId);
      actions.setHierarchyData(hierarchyResult.hierarchy);
      actions.setMappingData(hierarchyResult.mapping);
      actions.setFileUploaded(true);

      // Set initial navigation
      const rootNode = result.result?.rootNode || 'c0_l3_0';
      actions.setBreadcrumbPath([{ id: rootNode, label: rootNode }]);
      actions.setCurrentSupernode(rootNode);

      // Close modal
      handleCloseModal();
      
      console.log(`✅ Single mode processing completed for ${selectedAlgorithm}`);
      
    } catch (err) {
      setError(err.message);
      console.error('Single mode processing failed:', err);
    } finally {
      setProcessing(false);
      actions.setLoading(false);
    }
  };

  // Process files for comparison mode
  const processComparisonMode = async () => {
    if (!leftAlgorithm || !rightAlgorithm) {
      setError('Please select both algorithms to compare');
      return;
    }

    if (leftAlgorithm === rightAlgorithm) {
      setError('Please select two different algorithms to compare');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const algorithm1 = AlgorithmRegistry.getAlgorithm(leftAlgorithm);
      const algorithm2 = AlgorithmRegistry.getAlgorithm(rightAlgorithm);

      // Validate files for both algorithms
      const fileValidation1 = algorithm1.validateFiles(files);
      if (!fileValidation1.valid) {
        throw new Error(`${algorithm1.name}: ${fileValidation1.error}`);
      }

      const fileValidation2 = algorithm2.validateFiles(files);
      if (!fileValidation2.valid) {
        throw new Error(`${algorithm2.name}: ${fileValidation2.error}`);
      }

      // Validate parameters for both algorithms
      const param1Validation = AlgorithmRegistry.validateParameters(leftAlgorithm, comparisonParameters[leftAlgorithm]);
      if (!param1Validation.valid) {
        throw new Error(`${algorithm1.name} params: ${param1Validation.error}`);
      }

      const param2Validation = AlgorithmRegistry.validateParameters(rightAlgorithm, comparisonParameters[rightAlgorithm]);
      if (!param2Validation.valid) {
        throw new Error(`${algorithm2.name} params: ${param2Validation.error}`);
      }

      // Update app state
      actions.setMode('comparison');
      actions.setLoading(true);
      actions.setProcessingStep(`Running ${algorithm1.name} vs ${algorithm2.name} comparison...`);
      actions.setComparisonFiles(files);

      // Run comparison using DataService
      const comparisonConfig = {
        [leftAlgorithm]: {
          files: files,
          parameters: comparisonParameters[leftAlgorithm]
        },
        [rightAlgorithm]: {
          files: files,
          parameters: comparisonParameters[rightAlgorithm]
        }
      };

      const comparisonResult = await DataService.runComparison(comparisonConfig);

      if (!comparisonResult.success) {
        throw new Error(comparisonResult.message || 'Comparison failed');
      }

      // Update app state with comparison results
      actions.setComparisonData(comparisonResult.comparison);
      actions.setComparisonMetrics(comparisonResult.comparison.metrics);
      actions.setFileUploaded(true);

      // Close modal
      handleCloseModal();
      
      console.log(`✅ Comparison mode processing completed: ${algorithm1.name} vs ${algorithm2.name}`);
      
    } catch (err) {
      setError(err.message);
      console.error('Comparison mode processing failed:', err);
    } finally {
      setProcessing(false);
      actions.setLoading(false);
    }
  };

  // Main processing function
  const processFiles = async () => {
    if (uploadMode === 'compare') {
      await processComparisonMode();
    } else {
      await processSingleMode();
    }
  };

  // Get step description
  const getStepDescription = () => {
    if (!selectedGraphType) {
      return "Select your graph type to continue";
    }
    
    const fileReqs = getFileRequirements();
    const filesUploaded = fileReqs ? fileReqs.types.every(type => files[`${type}File`]) : false;
    
    if (!filesUploaded) {
      return "Upload your graph files";
    }
    
    if (uploadMode === 'single' && !selectedAlgorithm) {
      return "Select an algorithm to process your graph";
    }
    
    if (uploadMode === 'compare' && (!leftAlgorithm || !rightAlgorithm)) {
      return "Select algorithms for left and right comparison";
    }
    
    if (uploadMode === 'compare' && leftAlgorithm === rightAlgorithm) {
      return "Please select two different algorithms";
    }
    
    return "Ready to process!";
  };

  return (
    <>
      <Button variant="outline-light" onClick={handleShowModal} className="btn-upload">
        Upload Files
      </Button>

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload Graph Files</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger">{error}</Alert>
          )}

          {/* Progress indicator */}
          <div className="mb-3">
            <small className="text-muted">
              <strong>Step:</strong> {getStepDescription()}
            </small>
          </div>

          {/* Upload Mode Selection */}
          <Card className="mb-3">
            <Card.Header>
              <h6 className="mb-0">Step 1: Upload Mode</h6>
            </Card.Header>
            <Card.Body>
              <ButtonGroup className="w-100">
                <Button
                  variant={uploadMode === 'single' ? 'primary' : 'outline-primary'}
                  onClick={() => handleUploadModeChange('single')}
                >
                  🔍 Single Algorithm
                </Button>
                <Button
                  variant={uploadMode === 'compare' ? 'primary' : 'outline-primary'}
                  onClick={() => handleUploadModeChange('compare')}
                >
                  ⚖️ Compare Algorithms
                </Button>
              </ButtonGroup>
              <Form.Text className="text-muted mt-2">
                {uploadMode === 'single' 
                  ? 'Run one algorithm and explore the results'
                  : 'Compare two algorithms on the same dataset'
                }
              </Form.Text>
            </Card.Body>
          </Card>

          {/* Graph Type Selection */}
          <Card className="mb-3">
            <Card.Header>
              <h6 className="mb-0">Step 2: Graph Type</h6>
            </Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Label>Select your graph type</Form.Label>
                <Form.Select 
                  value={selectedGraphType} 
                  onChange={(e) => handleGraphTypeChange(e.target.value)}
                >
                  <option value="">Choose graph type...</option>
                  {availableGraphTypes.map(graphType => (
                    <option key={graphType.id} value={graphType.id}>
                      {graphType.name}
                    </option>
                  ))}
                </Form.Select>
                {selectedGraphType && (
                  <Form.Text className="text-muted">
                    {GraphTypeManager.getGraphType(selectedGraphType).description}
                  </Form.Text>
                )}
              </Form.Group>
            </Card.Body>
          </Card>

          {/* File Upload Section */}
          {selectedGraphType && (
            <Card className="mb-3">
              <Card.Header>
                <h6 className="mb-0">
                  Step 3: Upload Files 
                  <Badge bg="info" className="ms-2">
                    {getFileRequirements()?.count} files required
                  </Badge>
                </h6>
              </Card.Header>
              <Card.Body>
                {getFileRequirements()?.naming && (
                  <Alert variant="info" className="mb-3">
                    <small>
                      <strong>File naming convention:</strong> {getFileRequirements().naming}
                    </small>
                  </Alert>
                )}
                {renderFileInputs(getFileRequirements())}
              </Card.Body>
            </Card>
          )}

          {/* Algorithm Selection and Parameters */}
          {selectedGraphType && getFileRequirements()?.types.every(type => files[`${type}File`]) && (
            <>
              {/* Single Algorithm Mode */}
              {uploadMode === 'single' && (
                <>
                  {/* Algorithm Selection */}
                  <Card className="mb-3">
                    <Card.Header>
                      <h6 className="mb-0">Step 4: Algorithm Selection</h6>
                    </Card.Header>
                    <Card.Body>
                      <Form.Group>
                        <Form.Label>Choose Algorithm</Form.Label>
                        <Form.Select value={selectedAlgorithm} onChange={(e) => handleAlgorithmChange(e.target.value)}>
                          <option value="">Select algorithm...</option>
                          {getAvailableAlgorithms().map(algorithm => (
                            <option key={algorithm.id} value={algorithm.id}>
                              {algorithm.name}
                            </option>
                          ))}
                        </Form.Select>
                        {selectedAlgorithm && (
                          <Form.Text className="text-muted">
                            {getCurrentAlgorithm()?.description}
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Card.Body>
                  </Card>

                  {/* Parameters */}
                  {selectedAlgorithm && (
                    <Card className="mb-3">
                      <Card.Header>
                        <h6 className="mb-0">Step 5: Algorithm Parameters</h6>
                      </Card.Header>
                      <Card.Body>
                        {renderParameterInputs(getCurrentAlgorithm(), parameters, handleParameterChange)}
                      </Card.Body>
                    </Card>
                  )}
                </>
              )}

              {/* Comparison Mode */}
              {uploadMode === 'compare' && (
                <>
                  {/* Algorithm Selection */}
                  <Card className="mb-3">
                    <Card.Header>
                      <h6 className="mb-0">Step 4: Select Algorithms to Compare</h6>
                    </Card.Header>
                    <Card.Body>
                      {getAvailableAlgorithms().length >= 2 ? (
                        <Row>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>🔵 Left Algorithm</Form.Label>
                              <Form.Select 
                                value={leftAlgorithm} 
                                onChange={(e) => handleLeftAlgorithmChange(e.target.value)}
                              >
                                <option value="">Select left algorithm...</option>
                                {getAvailableAlgorithms().map(algorithm => (
                                  <option key={algorithm.id} value={algorithm.id}>
                                    {algorithm.name}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>🔴 Right Algorithm</Form.Label>
                              <Form.Select 
                                value={rightAlgorithm} 
                                onChange={(e) => handleRightAlgorithmChange(e.target.value)}
                              >
                                <option value="">Select right algorithm...</option>
                                {getAvailableAlgorithms().map(algorithm => (
                                  <option 
                                    key={algorithm.id} 
                                    value={algorithm.id}
                                    disabled={algorithm.id === leftAlgorithm}
                                  >
                                    {algorithm.name}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                      ) : (
                        <Alert variant="warning">
                          No algorithm pairs available for comparison with {GraphTypeManager.getGraphType(selectedGraphType).name} graphs.
                          You need at least 2 algorithms that support the same graph type.
                        </Alert>
                      )}

                      {leftAlgorithm === rightAlgorithm && leftAlgorithm && (
                        <Alert variant="warning" className="mt-2">
                          Please select two different algorithms to compare.
                        </Alert>
                      )}
                    </Card.Body>
                  </Card>

                  {/* Algorithm Parameters for Comparison */}
                  {leftAlgorithm && rightAlgorithm && leftAlgorithm !== rightAlgorithm && (
                    <Card className="mb-3">
                      <Card.Header>
                        <h6 className="mb-0">Step 5: Algorithm Parameters</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <h6>🔵 {AlgorithmRegistry.getAlgorithm(leftAlgorithm).name}</h6>
                            {renderParameterInputs(
                              AlgorithmRegistry.getAlgorithm(leftAlgorithm),
                              comparisonParameters[leftAlgorithm] || {},
                              (paramId, value) => handleComparisonParameterChange(leftAlgorithm, paramId, value)
                            )}
                          </Col>

                          <Col md={6}>
                            <h6>🔴 {AlgorithmRegistry.getAlgorithm(rightAlgorithm).name}</h6>
                            {renderParameterInputs(
                              AlgorithmRegistry.getAlgorithm(rightAlgorithm),
                              comparisonParameters[rightAlgorithm] || {},
                              (paramId, value) => handleComparisonParameterChange(rightAlgorithm, paramId, value)
                            )}
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          
          <Button 
            variant={uploadMode === 'compare' ? 'warning' : 'primary'}
            onClick={processFiles}
            disabled={processing || loading || !isReadyToProcess()}
          >
            {processing ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                {uploadMode === 'compare' 
                  ? 'Running Comparison...' 
                  : `Processing ${selectedAlgorithm}...`
                }
              </>
            ) : (
              uploadMode === 'compare' 
                ? `⚖️ Compare Algorithms` 
                : `🔍 Process with ${selectedAlgorithm ? getCurrentAlgorithm()?.name : 'Algorithm'}`
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FileUpload;