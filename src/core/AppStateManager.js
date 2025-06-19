import { createContext, useContext, useReducer, useCallback } from 'react';

// Action types
const ActionTypes = {
  // App-level actions
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_PROCESSING_STEP: 'SET_PROCESSING_STEP',
  SET_MODE: 'SET_MODE',
  
  // Data actions
  SET_DATASET: 'SET_DATASET',
  SET_ALGORITHM: 'SET_ALGORITHM',
  SET_FILE_UPLOADED: 'SET_FILE_UPLOADED',
  SET_HIERARCHY_DATA: 'SET_HIERARCHY_DATA',
  SET_MAPPING_DATA: 'SET_MAPPING_DATA',
  
  // Navigation actions
  SET_CURRENT_SUPERNODE: 'SET_CURRENT_SUPERNODE',
  SET_BREADCRUMB_PATH: 'SET_BREADCRUMB_PATH',
  NAVIGATE_TO_SUPERNODE: 'NAVIGATE_TO_SUPERNODE',
  
  // Visualization actions
  SET_CYTOSCAPE_ELEMENTS: 'SET_CYTOSCAPE_ELEMENTS',
  SET_SELECTED_NODE: 'SET_SELECTED_NODE',
  SET_NODE_STATISTICS: 'SET_NODE_STATISTICS',
  SET_LAYOUT: 'SET_LAYOUT',
  
  // Comparison actions
  SET_COMPARISON_DATA: 'SET_COMPARISON_DATA',
  SET_COMPARISON_METRICS: 'SET_COMPARISON_METRICS',
  UPDATE_COMPARISON_STATE: 'UPDATE_COMPARISON_STATE',
  SET_COMPARISON_FILES: 'SET_COMPARISON_FILES',
  
  // Reset actions
  RESET_ALL: 'RESET_ALL',
  RESET_VISUALIZATION: 'RESET_VISUALIZATION',

};

// Initial state
const initialState = {
  // App-level state
  loading: false,
  error: null,
  processingStep: '',
  mode: 'single', // 'single' | 'comparison'
  
  // Data state
  dataset: '',
  algorithm: 'homogeneous',
  fileUploaded: false,
  hierarchyData: {},
  mappingData: {},
  
  // Navigation state
  currentSupernode: '',
  breadcrumbPath: [],
  
  // Visualization state
  cytoscapeElements: [],
  selectedNode: null,
  nodeStatistics: null,
  layout: 'preset',
  
  // Comparison state
  comparisonData: null,
  comparisonMetrics: null,
  comparisonState: {
    heterogeneous: {
      currentSupernode: '',
      breadcrumbPath: [],
      cytoscapeElements: [],
      selectedNode: null,
      nodeStatistics: null
    },
    scar: {
      currentSupernode: '',
      breadcrumbPath: [],
      cytoscapeElements: [],
      selectedNode: null,
      nodeStatistics: null
    }
  },
  comparisonFiles: null, 
};

// Reducer function
function appStateReducer(state, action) {
  switch (action.type) {
    // App-level reducers
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
      
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
      
    case ActionTypes.SET_PROCESSING_STEP:
      return { ...state, processingStep: action.payload };
    
    case ActionTypes.SET_COMPARISON_FILES:
      return { ...state, comparisonFiles: action.payload };

    case ActionTypes.SET_MODE:
      // Reset relevant state when switching modes
      if (action.payload === 'comparison') {
        return {
          ...state,
          mode: action.payload,
          // Clear single mode state
          dataset: '',
          currentSupernode: '',
          breadcrumbPath: [],
          cytoscapeElements: [],
          selectedNode: null,
          nodeStatistics: null
        };
      } else {
        return {
          ...state,
          mode: action.payload,
          // Clear comparison state
          comparisonData: null,
          comparisonMetrics: null,
          comparisonFiles: null,
          comparisonState: initialState.comparisonState
        };
      }
      
    // Data reducers
    case ActionTypes.SET_DATASET:
      return { ...state, dataset: action.payload };
      
    case ActionTypes.SET_ALGORITHM:
      return { ...state, algorithm: action.payload };
      
    case ActionTypes.SET_FILE_UPLOADED:
      return { ...state, fileUploaded: action.payload };
      
    case ActionTypes.SET_HIERARCHY_DATA:
      return { ...state, hierarchyData: action.payload };
      
    case ActionTypes.SET_MAPPING_DATA:
      return { ...state, mappingData: action.payload };
      
    // Navigation reducers
    case ActionTypes.SET_CURRENT_SUPERNODE:
      return { ...state, currentSupernode: action.payload };
      
    case ActionTypes.SET_BREADCRUMB_PATH:
      return { ...state, breadcrumbPath: action.payload };
      
    case ActionTypes.NAVIGATE_TO_SUPERNODE: {
      const { supernodeId } = action.payload;
      const newBreadcrumb = { id: supernodeId, label: supernodeId };
      return {
        ...state,
        currentSupernode: supernodeId,
        breadcrumbPath: [...state.breadcrumbPath, newBreadcrumb],
        selectedNode: null,
        nodeStatistics: null
      };
    }
    
    // Visualization reducers
    case ActionTypes.SET_CYTOSCAPE_ELEMENTS:
      return { ...state, cytoscapeElements: action.payload };
      
    case ActionTypes.SET_SELECTED_NODE:
      return { ...state, selectedNode: action.payload };
      
    case ActionTypes.SET_NODE_STATISTICS:
      return { ...state, nodeStatistics: action.payload };
      
    case ActionTypes.SET_LAYOUT:
      return { ...state, layout: action.payload };
      
    // Comparison reducers
    case ActionTypes.SET_COMPARISON_DATA:
      return { ...state, comparisonData: action.payload };
      
    case ActionTypes.SET_COMPARISON_METRICS:
      return { ...state, comparisonMetrics: action.payload };
      
    case ActionTypes.UPDATE_COMPARISON_STATE: {
      const { algorithm, updates } = action.payload;
      return {
        ...state,
        comparisonState: {
          ...state.comparisonState,
          [algorithm]: {
            ...state.comparisonState[algorithm],
            ...updates
          }
        }
      };
    }


    
    // Reset reducers
    case ActionTypes.RESET_ALL:
      return { ...initialState };
      
    case ActionTypes.RESET_VISUALIZATION:
      return {
        ...state,
        cytoscapeElements: [],
        selectedNode: null,
        nodeStatistics: null,
        currentSupernode: '',
        breadcrumbPath: []
      };
      
    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

// Context
const AppStateContext = createContext();

// Provider component
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Action creators
  const actions = {
    // App-level actions
    setLoading: useCallback((loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    }, []),
    
    setError: useCallback((error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    }, []),
    
    setProcessingStep: useCallback((step) => {
      dispatch({ type: ActionTypes.SET_PROCESSING_STEP, payload: step });
    }, []),
    
    setMode: useCallback((mode) => {
      dispatch({ type: ActionTypes.SET_MODE, payload: mode });
    }, []),
    
    // Data actions
    setDataset: useCallback((dataset) => {
      dispatch({ type: ActionTypes.SET_DATASET, payload: dataset });
    }, []),
    
    setAlgorithm: useCallback((algorithm) => {
      dispatch({ type: ActionTypes.SET_ALGORITHM, payload: algorithm });
    }, []),
    
    setFileUploaded: useCallback((uploaded) => {
      dispatch({ type: ActionTypes.SET_FILE_UPLOADED, payload: uploaded });
    }, []),
    
    setHierarchyData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_HIERARCHY_DATA, payload: data });
    }, []),
    
    setMappingData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_MAPPING_DATA, payload: data });
    }, []),
    
    // Navigation actions
    setCurrentSupernode: useCallback((supernodeId) => {
      dispatch({ type: ActionTypes.SET_CURRENT_SUPERNODE, payload: supernodeId });
    }, []),
    
    setBreadcrumbPath: useCallback((path) => {
      dispatch({ type: ActionTypes.SET_BREADCRUMB_PATH, payload: path });
    }, []),
    
    navigateToSupernode: useCallback((supernodeId) => {
      dispatch({ type: ActionTypes.NAVIGATE_TO_SUPERNODE, payload: { supernodeId } });
    }, []),
    
    // Visualization actions
    setCytoscapeElements: useCallback((elements) => {
      dispatch({ type: ActionTypes.SET_CYTOSCAPE_ELEMENTS, payload: elements });
    }, []),
    
    setSelectedNode: useCallback((node) => {
      dispatch({ type: ActionTypes.SET_SELECTED_NODE, payload: node });
    }, []),
    
    setNodeStatistics: useCallback((stats) => {
      dispatch({ type: ActionTypes.SET_NODE_STATISTICS, payload: stats });
    }, []),
    
    setLayout: useCallback((layout) => {
      dispatch({ type: ActionTypes.SET_LAYOUT, payload: layout });
    }, []),
    
    // Comparison actions
    setComparisonData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_COMPARISON_DATA, payload: data });
    }, []),
    
    setComparisonMetrics: useCallback((metrics) => {
      dispatch({ type: ActionTypes.SET_COMPARISON_METRICS, payload: metrics });
    }, []),
    
    updateComparisonState: useCallback((algorithm, updates) => {
      dispatch({ type: ActionTypes.UPDATE_COMPARISON_STATE, payload: { algorithm, updates } });
    }, []),

    setComparisonFiles: useCallback((files) => {
      dispatch({ type: ActionTypes.SET_COMPARISON_FILES, payload: files });
    }, []),
    
    // Reset actions
    resetAll: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_ALL });
    }, []),
    
    resetVisualization: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_VISUALIZATION });
    }, [])
  };

  return (
    <AppStateContext.Provider value={{ state, actions }}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook to use app state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

// Selector hooks for specific state slices
export function useAppMode() {
  const { state } = useAppState();
  return state.mode;
}

export function useDataState() {
  const { state } = useAppState();
  return {
    dataset: state.dataset,
    algorithm: state.algorithm,
    fileUploaded: state.fileUploaded,
    hierarchyData: state.hierarchyData,
    mappingData: state.mappingData
  };
}

export function useVisualizationState() {
  const { state } = useAppState();
  return {
    cytoscapeElements: state.cytoscapeElements,
    selectedNode: state.selectedNode,
    nodeStatistics: state.nodeStatistics,
    layout: state.layout,
    currentSupernode: state.currentSupernode,
    breadcrumbPath: state.breadcrumbPath
  };
}

export function useComparisonState() {
  const { state } = useAppState();
  return {
    comparisonData: state.comparisonData,
    comparisonMetrics: state.comparisonMetrics,
    comparisonState: state.comparisonState,
    comparisonFiles: state.comparisonFiles 
  };
}

export function useLoadingState() {
  const { state } = useAppState();
  return {
    loading: state.loading,
    error: state.error,
    processingStep: state.processingStep
  };
}

export { ActionTypes };