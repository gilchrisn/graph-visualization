import React, { useState } from 'react';
import { Button, ButtonGroup, Modal, Form, Alert, Spinner, Card, Row, Col, Badge } from 'react-bootstrap';
import { useAppState, useLoadingState } from '../../core/AppStateManager';
import DataService from '../../core/DataService';
import AlgorithmRegistry from '../../core/AlgorithmRegistry';
import './FileUpload.css';

const FileUpload = () => {
  const { actions } = useAppState();
  const { loading } = useLoadingState();
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'compare'
  
  // Algorithm and files state
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('homogeneous');
  const [files, setFiles] = useState({});
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Parameters state
  const [parameters, setParameters] = useState(
    AlgorithmRegistry.getDefaultParameters('homogeneous')
  );
  
  // Comparison mode parameters
  const [comparisonParams, setComparisonParams] = useState({
    heterogeneous: AlgorithmRegistry.getDefaultParameters('heterogeneous'),
    scar: AlgorithmRegistry.getDefaultParameters('scar')
  });

  // Get available algorithms from registry
  const availableAlgorithms = AlgorithmRegistry.getAllAlgorithms();
  const currentAlgorithm = AlgorithmRegistry.getAlgorithm(selectedAlgorithm);
  const comparisonAlgorithms = AlgorithmRegistry.getComparisonAlgorithms();

  // Handle modal open/close
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setError(null);
    setFiles({});
    setUploadMode('single');
    setSelectedAlgorithm('homogeneous');
    setParameters(AlgorithmRegistry.getDefaultParameters('homogeneous'));
  };

  // Handle upload mode change
  const handleUploadModeChange = (mode) => {
    setUploadMode(mode);
    setError(null);
    setFiles({});
    
    if (mode === 'single') {
      setSelectedAlgorithm('homogeneous');
      setParameters(AlgorithmRegistry.getDefaultParameters('homogeneous'));
    }
  };

  // Handle algorithm selection (single mode only)
  const handleAlgorithmChange = (algorithmId) => {
    setSelectedAlgorithm(algorithmId);
    setFiles({});
    setParameters(AlgorithmRegistry.getDefaultParameters(algorithmId));
    setError(null);
  };

  // Handle file changes
  const handleFileChange = (fileType, file) => {
    setFiles(prev => ({ ...prev, [fileType]: file }));
    setError(null);
  };

  // Handle parameter changes (single mode)
  const handleParameterChange = (paramId, value) => {
    setParameters(prev => ({ ...prev, [paramId]: value }));
  };

  // Handle comparison parameter changes
  const handleComparisonParameterChange = (algorithm, paramId, value) => {
    setComparisonParams(prev => ({
      ...prev,
      [algorithm]: {
        ...prev[algorithm],
        [paramId]: value
      }
    }));
  };

  // Generate file input fields dynamically from algorithm config
  const renderFileInputs = (algorithm) => {
    return algorithm.fileRequirements.types.map(fileType => {
      const fieldName = `${fileType}File`;
      
      return (
        <Form.Group key={fileType} className="mb-3">
          <Form.Label>
            {fileType.charAt(0).toUpperCase() + fileType.slice(1)} File
            {algorithm.fileRequirements.naming && (
              <small className="text-muted ms-2">(*_{fileType}.{algorithm.fileRequirements.extensions[0].replace('.', '')})</small>
            )}
          </Form.Label>
          <Form.Control
            type="file"
            accept={algorithm.fileRequirements.extensions.join(',')}
            onChange={(e) => handleFileChange(fieldName, e.target.files[0])}
          />
          <Form.Text className="text-muted">
            {algorithm.fileRequirements.descriptions[fileType]}
          </Form.Text>
        </Form.Group>
      );
    });
  };

  // Generate parameter inputs dynamically from algorithm schema
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

  // Check if files are ready for processing
  const areFilesReady = () => {
    if (uploadMode === 'compare') {
      // For comparison, need the 4 heterogeneous/SCAR files
      const required = ['infoFile', 'linkFile', 'nodeFile', 'metaFile'];
      return required.every(fileType => files[fileType]);
    } else {
      // For single mode, check based on selected algorithm
      const requiredTypes = currentAlgorithm.fileRequirements.types;
      return requiredTypes.every(type => files[`${type}File`]);
    }
  };

  // Process files for single algorithm mode
  const processSingleMode = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Validate files using registry
      const fileValidation = AlgorithmRegistry.validateFiles(selectedAlgorithm, files);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.error);
      }

      // Validate parameters using registry
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
    setProcessing(true);
    setError(null);

    try {
      // Validate files for comparison (needs heterogeneous files)
      const heteroAlgorithm = AlgorithmRegistry.getAlgorithm('heterogeneous');
      const fileValidation = heteroAlgorithm.validateFiles(files);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.error);
      }

      // Validate parameters for both algorithms
      const heteroValidation = AlgorithmRegistry.validateParameters('heterogeneous', comparisonParams.heterogeneous);
      if (!heteroValidation.valid) {
        throw new Error(`Heterogeneous params: ${heteroValidation.error}`);
      }

      const scarValidation = AlgorithmRegistry.validateParameters('scar', comparisonParams.scar);
      if (!scarValidation.valid) {
        throw new Error(`SCAR params: ${scarValidation.error}`);
      }

      // Update app state
      actions.setMode('comparison');
      actions.setLoading(true);
      actions.setProcessingStep('Running algorithm comparison...');

      // Run comparison using DataService
      const comparisonResult = await DataService.runComparison({
        heterogeneous: {
          files: files,
          parameters: comparisonParams.heterogeneous
        },
        scar: {
          files: files,
          parameters: comparisonParams.scar
        }
      });

      if (!comparisonResult.success) {
        throw new Error(comparisonResult.message || 'Comparison failed');
      }

      // Update app state with comparison results
      actions.setComparisonData(comparisonResult.comparison);
      actions.setComparisonMetrics(comparisonResult.comparison.metrics);
      actions.setFileUploaded(true);

      // Close modal
      handleCloseModal();
      
      console.log('✅ Comparison mode processing completed');
      
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

          {/* Upload Mode Selection */}
          <Card className="mb-3">
            <Card.Header>
              <h6 className="mb-0">Upload Mode</h6>
            </Card.Header>
            <Card.Body>
              <ButtonGroup className="w-100">
                <Button
                  variant={uploadMode === 'single' ? 'primary' : 'outline-primary'}
                  onClick={() => handleUploadModeChange('single')}
                >
                  📊 Single Algorithm
                </Button>
                <Button
                  variant={uploadMode === 'compare' ? 'primary' : 'outline-primary'}
                  onClick={() => handleUploadModeChange('compare')}
                >
                  🔄 Compare Algorithms
                </Button>
              </ButtonGroup>
              <Form.Text className="text-muted mt-2">
                {uploadMode === 'single' 
                  ? 'Run one algorithm and explore the results'
                  : 'Run Heterogeneous vs SCAR algorithms and compare their clustering results'
                }
              </Form.Text>
            </Card.Body>
          </Card>

          {/* Single Algorithm Mode */}
          {uploadMode === 'single' && (
            <>
              {/* Algorithm Selection */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Algorithm Selection</h6>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Label>Processing Algorithm</Form.Label>
                    <Form.Select value={selectedAlgorithm} onChange={(e) => handleAlgorithmChange(e.target.value)}>
                      {availableAlgorithms.map(algorithm => (
                        <option key={algorithm.id} value={algorithm.id}>
                          {algorithm.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {currentAlgorithm.description}
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* File Upload Section */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">
                    Required Files 
                    <Badge bg="info" className="ms-2">{currentAlgorithm.fileRequirements.count} files</Badge>
                  </h6>
                </Card.Header>
                <Card.Body>
                  {currentAlgorithm.fileRequirements.naming && (
                    <Alert variant="info" className="mb-3">
                      <small>
                        <strong>File naming convention:</strong> {currentAlgorithm.fileRequirements.naming}
                      </small>
                    </Alert>
                  )}
                  {renderFileInputs(currentAlgorithm)}
                </Card.Body>
              </Card>

              {/* Parameters Section */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Algorithm Parameters</h6>
                </Card.Header>
                <Card.Body>
                  {renderParameterInputs(currentAlgorithm, parameters, handleParameterChange)}
                </Card.Body>
              </Card>
            </>
          )}

          {/* Comparison Mode */}
          {uploadMode === 'compare' && (
            <>
              {/* File Upload for Comparison */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">
                    Dataset Files <Badge bg="warning">4 files required</Badge>
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info" className="mb-3">
                    <small>
                      <strong>📊 Comparison Note:</strong> Both algorithms will use the same dataset files.<br/>
                      <strong>File naming:</strong> datasetName_type.dat (e.g., amazon_info.dat)
                    </small>
                  </Alert>
                  {renderFileInputs(AlgorithmRegistry.getAlgorithm('heterogeneous'))}
                </Card.Body>
              </Card>

              {/* Algorithm Parameters for Comparison */}
              <Row>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <h6 className="mb-0">🟢 Heterogeneous Algorithm</h6>
                    </Card.Header>
                    <Card.Body>
                      {renderParameterInputs(
                        AlgorithmRegistry.getAlgorithm('heterogeneous'),
                        comparisonParams.heterogeneous,
                        (paramId, value) => handleComparisonParameterChange('heterogeneous', paramId, value)
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <h6 className="mb-0">🟡 SCAR Algorithm</h6>
                    </Card.Header>
                    <Card.Body>
                      {renderParameterInputs(
                        AlgorithmRegistry.getAlgorithm('scar'),
                        comparisonParams.scar,
                        (paramId, value) => handleComparisonParameterChange('scar', paramId, value)
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
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
            disabled={processing || loading || !areFilesReady()}
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
                {uploadMode === 'compare' ? 'Running Comparison...' : `Processing ${currentAlgorithm.name}...`}
              </>
            ) : (
              uploadMode === 'compare' ? '🔄 Compare Algorithms' : `📊 Process ${currentAlgorithm.name}`
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FileUpload;