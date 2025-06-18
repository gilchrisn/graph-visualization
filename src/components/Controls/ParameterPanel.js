import React, { useState } from 'react';
import { Card, Form, Button, InputGroup, Alert, Badge } from 'react-bootstrap';
import AlgorithmRegistry from '../../core/AlgorithmRegistry';

const ParameterPanel = ({ 
  algorithm, 
  parameters, 
  onParameterChange, 
  disabled = false 
}) => {
  const [localParams, setLocalParams] = useState(parameters || {});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Get algorithm configuration
  const algorithmConfig = AlgorithmRegistry.getAlgorithm(algorithm);

  // Handle parameter change locally
  const handleLocalChange = (paramId, value) => {
    const newParams = { ...localParams, [paramId]: value };
    setLocalParams(newParams);
    
    // Check if there are changes
    const changed = Object.keys(newParams).some(key => newParams[key] !== parameters[key]);
    setHasChanges(changed);

    // Validate parameter
    const param = algorithmConfig.parameterSchema.find(p => p.id === paramId);
    if (param && param.validation) {
      const isValid = param.validation(value);
      if (!isValid) {
        setValidationErrors(prev => ({
          ...prev,
          [paramId]: `Invalid value for ${param.name}`
        }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[paramId];
          return newErrors;
        });
      }
    }
  };

  // Apply parameter changes
  const handleApplyChanges = () => {
    // Validate all parameters
    const validation = AlgorithmRegistry.validateParameters(algorithm, localParams);
    if (!validation.valid) {
      setValidationErrors({ general: validation.error });
      return;
    }

    // Clear validation errors
    setValidationErrors({});
    
    // Call the parent handler
    onParameterChange(localParams);
    
    // Reset local state
    setHasChanges(false);
  };

  // Reset to original parameters
  const handleReset = () => {
    setLocalParams(parameters);
    setHasChanges(false);
    setValidationErrors({});
  };

  // Render parameter input based on type
  const renderParameterInput = (param) => {
    const value = localParams[param.id] ?? param.default;
    const hasError = validationErrors[param.id];

    switch (param.type) {
      case 'number':
        return (
          <Form.Control
            type="number"
            value={value}
            min={param.min}
            max={param.max}
            step={param.step || 1}
            onChange={(e) => handleLocalChange(param.id, parseInt(e.target.value) || param.default)}
            disabled={disabled}
            isInvalid={!!hasError}
          />
        );

      case 'range':
        return (
          <div>
            <Form.Range
              min={param.min}
              max={param.max}
              step={param.step || 0.1}
              value={value}
              onChange={(e) => handleLocalChange(param.id, parseFloat(e.target.value))}
              disabled={disabled}
            />
            <div className="d-flex justify-content-between">
              <small className="text-muted">{param.min}</small>
              <small className="fw-bold">{value}</small>
              <small className="text-muted">{param.max}</small>
            </div>
          </div>
        );

      case 'select':
        return (
          <Form.Select
            value={value}
            onChange={(e) => handleLocalChange(param.id, e.target.value)}
            disabled={disabled}
            isInvalid={!!hasError}
          >
            {param.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        );

      case 'boolean':
        return (
          <Form.Check
            type="checkbox"
            checked={value}
            onChange={(e) => handleLocalChange(param.id, e.target.checked)}
            disabled={disabled}
            label={param.checkboxLabel || 'Enable'}
          />
        );

      default:
        return (
          <Form.Control
            type="text"
            value={value}
            onChange={(e) => handleLocalChange(param.id, e.target.value)}
            disabled={disabled}
            isInvalid={!!hasError}
          />
        );
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span>Algorithm Parameters</span>
          <div>
            <Badge bg={algorithm === 'homogeneous' ? 'success' : algorithm === 'heterogeneous' ? 'info' : 'warning'}>
              {algorithm}
            </Badge>
            {hasChanges && (
              <Badge bg="warning" className="ms-2">
                Modified
              </Badge>
            )}
          </div>
        </div>
      </Card.Header>
      
      <Card.Body>
        {validationErrors.general && (
          <Alert variant="danger" className="mb-3">
            {validationErrors.general}
          </Alert>
        )}

        {algorithmConfig.parameterSchema.map(param => (
          <Form.Group key={param.id} className="mb-3">
            <Form.Label>
              {param.name}
              {param.required && <span className="text-danger">*</span>}
            </Form.Label>
            
            {param.type === 'number' ? (
              <InputGroup>
                {renderParameterInput(param)}
                {param.unit && (
                  <InputGroup.Text>{param.unit}</InputGroup.Text>
                )}
              </InputGroup>
            ) : (
              renderParameterInput(param)
            )}
            
            {validationErrors[param.id] && (
              <Form.Text className="text-danger">
                {validationErrors[param.id]}
              </Form.Text>
            )}
            
            {!validationErrors[param.id] && param.description && (
              <Form.Text className="text-muted">
                {param.description}
              </Form.Text>
            )}
            
            {param.range && (
              <Form.Text className="text-muted">
                Range: {param.min} - {param.max}
              </Form.Text>
            )}
          </Form.Group>
        ))}

        {/* Action Buttons */}
        {hasChanges && (
          <div className="d-flex gap-2 mt-3">
            <Button
              variant="primary"
              onClick={handleApplyChanges}
              disabled={disabled || Object.keys(validationErrors).length > 0}
              size="sm"
            >
              Apply Changes
            </Button>
            <Button
              variant="outline-secondary"
              onClick={handleReset}
              disabled={disabled}
              size="sm"
            >
              Reset
            </Button>
          </div>
        )}

        {/* Parameter Summary */}
        <div className="mt-3 pt-3 border-top">
          <small className="text-muted">
            <strong>Current Parameters:</strong>
            {Object.entries(localParams).map(([key, value]) => (
              <div key={key}>
                {key}: <code>{JSON.stringify(value)}</code>
              </div>
            ))}
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ParameterPanel;