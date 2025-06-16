// src/components/FileUpload/FileUpload.js - Updated to support heterogeneous and SCAR processing
import React, { useState } from 'react';
import { Button, Modal, Form, Alert, Spinner, Card, Row, Col, Badge } from 'react-bootstrap';
import { useGraph } from '../../context/GraphContext';
import api from '../../services/api';
import './FileUpload.css';

const FileUpload = () => {
  const {
    setLoading,
    setError,
    setDataset,
    setFileUploaded,
    setEdgeListFile,
    setAttributesFile,
    setCurrentSupernode,
    setBreadcrumbPath,
    k,
    setK,
    setProcessingStep,
    setHierarchyData,
    setMappingData,
    setProcessingType,
    processingType
  } = useGraph();

  const [showModal, setShowModal] = useState(false);
  const [localProcessingType, setLocalProcessingType] = useState(processingType || 'homogeneous');
  
  // Homogeneous files
  const [localEdgeListFile, setLocalEdgeListFile] = useState(null);
  const [localAttributesFile, setLocalAttributesFile] = useState(null);
  
  // Heterogeneous/SCAR files (4 files with specific naming)
  const [localInfoFile, setLocalInfoFile] = useState(null);
  const [localLinkFile, setLocalLinkFile] = useState(null);
  const [localNodeFile, setLocalNodeFile] = useState(null);
  const [localMetaFile, setLocalMetaFile] = useState(null);
  
  const [localK, setLocalK] = useState(k);
  const [localNk, setLocalNk] = useState(10); // SCAR specific
  const [localTh, setLocalTh] = useState(0.5); // SCAR specific
  const [uploadError, setUploadError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setUploadError(null);
    // Reset all files
    setLocalEdgeListFile(null);
    setLocalAttributesFile(null);
    setLocalInfoFile(null);
    setLocalLinkFile(null);
    setLocalNodeFile(null);
    setLocalMetaFile(null);
  };

  const handleProcessingTypeChange = (e) => {
    const newType = e.target.value;
    setLocalProcessingType(newType);
    setUploadError(null);
    
    // Reset all files when switching types
    setLocalEdgeListFile(null);
    setLocalAttributesFile(null);
    setLocalInfoFile(null);
    setLocalLinkFile(null);
    setLocalNodeFile(null);
    setLocalMetaFile(null);
  };

  // File change handlers
  const handleEdgeListChange = (e) => setLocalEdgeListFile(e.target.files[0]);
  const handleAttributesChange = (e) => setLocalAttributesFile(e.target.files[0]);
  const handleInfoFileChange = (e) => setLocalInfoFile(e.target.files[0]);
  const handleLinkFileChange = (e) => setLocalLinkFile(e.target.files[0]);
  const handleNodeFileChange = (e) => setLocalNodeFile(e.target.files[0]);
  const handleMetaFileChange = (e) => setLocalMetaFile(e.target.files[0]);

  const handleKChange = (e) => {
    const newK = parseInt(e.target.value, 10);
    if (!isNaN(newK) && newK > 0) {
      setLocalK(newK);
    }
  };

  const handleNkChange = (e) => {
    const newNk = parseInt(e.target.value, 10);
    if (!isNaN(newNk) && newNk > 0) {
      setLocalNk(newNk);
    }
  };

  const handleThChange = (e) => {
    const newTh = parseFloat(e.target.value);
    if (!isNaN(newTh) && newTh >= 0 && newTh <= 1) {
      setLocalTh(newTh);
    }
  };

  // Validation functions
  const validateHomogeneousFiles = () => {
    if (!localEdgeListFile || !localAttributesFile) {
      setUploadError('Please upload both the edge list and attributes files.');
      return false;
    }
    return true;
  };

  const validateHeterogeneousFiles = () => {
    if (!localInfoFile || !localLinkFile || !localNodeFile || !localMetaFile) {
      setUploadError('Please upload all 4 required files: info, link, node, and meta files.');
      return false;
    }
    
    // Extract dataset name from one of the files and validate naming
    const infoFileName = localInfoFile.name;
    const expectedDatasetName = infoFileName.replace('_info.dat', '');
    
    const expectedFiles = {
      info: `${expectedDatasetName}_info.dat`,
      link: `${expectedDatasetName}_link.dat`,
      node: `${expectedDatasetName}_node.dat`,
      meta: `${expectedDatasetName}_meta.dat`
    };
    
    const actualFiles = {
      info: localInfoFile.name,
      link: localLinkFile.name,
      node: localNodeFile.name,
      meta: localMetaFile.name
    };
    
    for (const [type, expectedName] of Object.entries(expectedFiles)) {
      if (actualFiles[type] !== expectedName) {
        setUploadError(`File naming mismatch for ${type} file. Expected: ${expectedName}, got: ${actualFiles[type]}`);
        return false;
      }
    }
    
    return true;
  };

  const processFiles = async () => {
    setProcessing(true);
    setUploadError(null);

    try {
      // Set the processing type in global context
      setProcessingType(localProcessingType);
      setK(localK);

      let uploadResult, processResult, datasetId;

      if (localProcessingType === 'homogeneous') {
        // Validate homogeneous files
        if (!validateHomogeneousFiles()) {
          setProcessing(false);
          return;
        }

        // Set files in global context
        setEdgeListFile(localEdgeListFile);
        setAttributesFile(localAttributesFile);

        // Step 1: Upload homogeneous files
        setProcessingStep('Uploading homogeneous files...');
        uploadResult = await api.uploadFiles(localEdgeListFile, localAttributesFile, localK);
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.message || 'Failed to upload homogeneous files');
        }
        
        datasetId = uploadResult.datasetId;
        
        // Step 2: Process homogeneous dataset
        setProcessingStep('Processing homogeneous dataset...');
        processResult = await api.processDataset(datasetId, localK);
        
      } else if (localProcessingType === 'heterogeneous') {
        // Validate heterogeneous files
        if (!validateHeterogeneousFiles()) {
          setProcessing(false);
          return;
        }

        // Step 1: Upload heterogeneous files
        setProcessingStep('Uploading heterogeneous files...');
        uploadResult = await api.uploadFilesHeterogeneous(
          localInfoFile, localLinkFile, localNodeFile, localMetaFile, localK
        );
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.message || 'Failed to upload heterogeneous files');
        }
        
        datasetId = uploadResult.datasetId;
        
        // Step 2: Process heterogeneous dataset
        setProcessingStep('Processing heterogeneous dataset...');
        processResult = await api.processDatasetHeterogeneous(datasetId, localK);
        
      } else if (localProcessingType === 'scar') {
        // Validate SCAR files (same as heterogeneous)
        if (!validateHeterogeneousFiles()) {
          setProcessing(false);
          return;
        }

        // Step 1: Upload SCAR files
        setProcessingStep('Uploading SCAR files...');
        uploadResult = await api.uploadFilesScar(
          localInfoFile, localLinkFile, localNodeFile, localMetaFile, localK, localNk, localTh
        );
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.message || 'Failed to upload SCAR files');
        }
        
        datasetId = uploadResult.datasetId;
        
        // Step 2: Process SCAR dataset
        setProcessingStep('Processing SCAR dataset...');
        processResult = await api.processDatasetScar(datasetId, localK, localNk, localTh);
      }
      
      if (!processResult.success) {
        throw new Error(processResult.message || 'Failed to process dataset');
      }
      
      // Set the final dataset ID (already includes _heterogeneous or _scar suffix)
      setDataset(processResult.result?.datasetId || datasetId);
      
      // Step 3: Get hierarchy data
      setProcessingStep('Loading hierarchy data...');
      const hierarchyResult = await api.getHierarchyData(
        processResult.result?.datasetId || datasetId, 
        localK, 
        localProcessingType
      );
      
      if (!hierarchyResult.success) {
        throw new Error(hierarchyResult.message || 'Failed to get hierarchy data');
      }
      
      // Set hierarchy and mapping data in the global context
      setHierarchyData(hierarchyResult.hierarchy);
      setMappingData(hierarchyResult.mapping);
      
      // Set the root node and breadcrumb path
      const rootNode = processResult.result?.rootNode || 'c0_l3_0';
      setCurrentSupernode(rootNode);
      setBreadcrumbPath([{ id: rootNode, label: rootNode }]);
      
      // Mark files as uploaded
      setFileUploaded(true);
      
      // Close the modal
      handleCloseModal();

      console.log(`${localProcessingType} files processed successfully`);
    } catch (err) {
      setUploadError(`Error processing ${localProcessingType} files: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Check if all required files are uploaded
  const areFilesReady = () => {
    if (localProcessingType === 'homogeneous') {
      return localEdgeListFile && localAttributesFile;
    } else {
      return localInfoFile && localLinkFile && localNodeFile && localMetaFile;
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
          {uploadError && (
            <Alert variant="danger">{uploadError}</Alert>
          )}

          {/* Processing Type Selection */}
          <Card className="mb-3">
            <Card.Header>
              <h6 className="mb-0">Processing Type</h6>
            </Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Check
                  type="radio"
                  id="homogeneous"
                  name="processingType"
                  label={
                    <div>
                      <strong>Homogeneous Graph</strong>
                      <div className="text-muted small">Traditional graph with edge list and attributes (2 files)</div>
                    </div>
                  }
                  value="homogeneous"
                  checked={localProcessingType === 'homogeneous'}
                  onChange={handleProcessingTypeChange}
                  className="mb-2"
                />
                <Form.Check
                  type="radio"
                  id="heterogeneous"
                  name="processingType"
                  label={
                    <div>
                      <strong>Heterogeneous Graph</strong>
                      <div className="text-muted small">Multi-type network with specialized files (4 files)</div>
                    </div>
                  }
                  value="heterogeneous"
                  checked={localProcessingType === 'heterogeneous'}
                  onChange={handleProcessingTypeChange}
                  className="mb-2"
                />
                <Form.Check
                  type="radio"
                  id="scar"
                  name="processingType"
                  label={
                    <div>
                      <strong>SCAR Processing</strong>
                      <div className="text-muted small">SCAR algorithm with advanced parameters (4 files)</div>
                    </div>
                  }
                  value="scar"
                  checked={localProcessingType === 'scar'}
                  onChange={handleProcessingTypeChange}
                />
              </Form.Group>
            </Card.Body>
          </Card>

          <Form>
            {/* Homogeneous File Upload */}
            {localProcessingType === 'homogeneous' && (
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">Homogeneous Graph Files</h6>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Edge List File</Form.Label>
                    <Form.Control 
                      type="file" 
                      onChange={handleEdgeListChange}
                      accept=".txt,.csv"
                    />
                    <Form.Text className="text-muted">
                      Space-separated node pairs, each on a new line
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Basic Attributes File</Form.Label>
                    <Form.Control 
                      type="file" 
                      onChange={handleAttributesChange}
                      accept=".txt,.csv"
                    />
                    <Form.Text className="text-muted">
                      Contains node and edge counts
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>
            )}

            {/* Heterogeneous/SCAR File Upload */}
            {(localProcessingType === 'heterogeneous' || localProcessingType === 'scar') && (
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">
                    {localProcessingType === 'heterogeneous' ? 'Heterogeneous' : 'SCAR'} Graph Files
                    <Badge bg="info" className="ms-2">4 files required</Badge>
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info" className="mb-3">
                    <small>
                      <strong>File naming convention:</strong> All files must follow the pattern <code>datasetName_type.dat</code><br/>
                      Example: <code>amazon_info.dat</code>, <code>amazon_link.dat</code>, <code>amazon_node.dat</code>, <code>amazon_meta.dat</code>
                    </small>
                  </Alert>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Info File (*_info.dat)</Form.Label>
                        <Form.Control 
                          type="file" 
                          onChange={handleInfoFileChange}
                          accept=".dat"
                        />
                        <Form.Text className="text-muted">
                          Graph information and metadata
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Link File (*_link.dat)</Form.Label>
                        <Form.Control 
                          type="file" 
                          onChange={handleLinkFileChange}
                          accept=".dat"
                        />
                        <Form.Text className="text-muted">
                          Edge/link information
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Node File (*_node.dat)</Form.Label>
                        <Form.Control 
                          type="file" 
                          onChange={handleNodeFileChange}
                          accept=".dat"
                        />
                        <Form.Text className="text-muted">
                          Node information and attributes
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Meta File (*_meta.dat)</Form.Label>
                        <Form.Control 
                          type="file" 
                          onChange={handleMetaFileChange}
                          accept=".dat"
                        />
                        <Form.Text className="text-muted">
                          Meta-path information
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {/* Parameters */}
            <Card className="mb-3">
              <Card.Header>
                <h6 className="mb-0">Processing Parameters</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={localProcessingType === 'scar' ? 4 : 12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Cluster Size (k)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={localK}
                        min={1}
                        onChange={handleKChange}
                      />
                      <Form.Text className="text-muted">
                        Maximum number of nodes in a supernode
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  {/* SCAR-specific parameters */}
                  {localProcessingType === 'scar' && (
                    <>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>NK Parameter</Form.Label>
                          <Form.Control 
                            type="number" 
                            value={localNk}
                            min={1}
                            onChange={handleNkChange}
                          />
                          <Form.Text className="text-muted">
                            SCAR NK parameter
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Threshold (th)</Form.Label>
                          <Form.Control 
                            type="number" 
                            value={localTh}
                            min={0}
                            max={1}
                            step={0.1}
                            onChange={handleThChange}
                          />
                          <Form.Text className="text-muted">
                            SCAR threshold (0.0 - 1.0)
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={processFiles}
            disabled={processing || !areFilesReady()}
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
                Processing {localProcessingType}...
              </>
            ) : (
              `Process ${localProcessingType} Files`
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FileUpload;