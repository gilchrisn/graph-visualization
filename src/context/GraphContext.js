import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
const GraphContext = createContext();

// Custom hook for using the graph context
export const useGraph = () => useContext(GraphContext);

// Provider component
export const GraphProvider = ({ children }) => {
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataset, setDataset] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [edgeListFile, setEdgeListFile] = useState(null);
  const [attributesFile, setAttributesFile] = useState(null);
  const [hierarchyData, setHierarchyData] = useState({});
  const [mappingData, setMappingData] = useState({});
  const [currentSupernode, setCurrentSupernode] = useState('');
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);
  const [cytoscapeElements, setCytoscapeElements] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeStatistics, setNodeStatistics] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  const [k, setK] = useState(25); // Default cluster size
  
  // NEW: Processing type support
  const [processingType, setProcessingType] = useState('homogeneous'); // 'homogeneous', 'heterogeneous', 'scar'
  
  // NEW: Additional SCAR parameters
  const [nk, setNk] = useState(10); // NK parameter for SCAR
  const [th, setTh] = useState(0.5); // Threshold parameter for SCAR

  // Reset error when any major state changes
  useEffect(() => {
    setError(null);
  }, [dataset, currentSupernode, k, processingType]);

  // Reset data when switching processing types
  useEffect(() => {
    if (processingType) {
      // Clear previous data when switching processing types
      setDataset('');
      setFileUploaded(false);
      setCurrentSupernode('');
      setBreadcrumbPath([]);
      setCytoscapeElements([]);
      setHierarchyData({});
      setMappingData({});
      setSelectedNode(null);
      setNodeStatistics(null);
      setEdgeListFile(null);
      setAttributesFile(null);
    }
  }, [processingType]);

  // Value object to be provided by the context
  const value = {
    // Existing state
    loading,
    setLoading,
    error,
    setError,
    dataset,
    setDataset,
    fileUploaded,
    setFileUploaded,
    edgeListFile,
    setEdgeListFile,
    attributesFile,
    setAttributesFile,
    hierarchyData,
    setHierarchyData,
    mappingData,
    setMappingData,
    currentSupernode,
    setCurrentSupernode,
    breadcrumbPath,
    setBreadcrumbPath,
    cytoscapeElements,
    setCytoscapeElements,
    selectedNode,
    setSelectedNode,
    nodeStatistics,
    setNodeStatistics,
    processingStep,
    setProcessingStep,
    k,
    setK,
    
    // NEW: Processing type and SCAR parameters
    processingType,
    setProcessingType,
    nk,
    setNk,
    th,
    setTh
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
};