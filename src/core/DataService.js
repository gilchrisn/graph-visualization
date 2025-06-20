import AlgorithmRegistry from './AlgorithmRegistry';

class DataService {
  constructor() {
    this.apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3002/api';
    this.cache = new Map();
  }

  /**
   * Process dataset with specified algorithm
   * @param {string} algorithmId - Algorithm identifier
   * @param {Object} files - File objects
   * @param {Object} parameters - Algorithm parameters
   */
  async processDataset(algorithmId, files, parameters) {
    try {
      console.log(`DataService: Processing ${algorithmId} dataset with params:`, parameters);
      
      switch (algorithmId) {
        case 'homogeneous':
          return await this._processHomogeneous(files, parameters);
        case 'heterogeneous':
          return await this._processHeterogeneous(files, parameters);
        case 'scar':
          return await this._processScar(files, parameters);
        default:
          throw new Error(`Unknown algorithm: ${algorithmId}`);
      }
    } catch (error) {
      console.error(`DataService.processDataset failed:`, error);
      throw error;
    }
  }

  /**
   * Get hierarchy data for any algorithm
   */
  async getHierarchyData(algorithmId, datasetId, parameters) {
    const cacheKey = `hierarchy_${algorithmId}_${datasetId}_${JSON.stringify(parameters)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams();
      if (algorithmId !== 'homogeneous') {
        params.append('processingType', algorithmId);
      }
      
      const url = `${this.apiBaseUrl}/hierarchy/${datasetId}/${parameters.k}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get hierarchy data');
      }
      
      this.cache.set(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error(`DataService.getHierarchyData failed:`, error);
      throw error;
    }
  }

  /**
   * Get supernode data for visualization
   */
  async getSupernodeData(algorithmId, datasetId, supernodeId, parameters) {
    try {
      const params = new URLSearchParams();
      if (algorithmId !== 'homogeneous') {
        params.append('processingType', algorithmId);
      }
      
      const url = `${this.apiBaseUrl}/coordinates/${datasetId}/${parameters.k}/${supernodeId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get supernode data');
      }
      
      return result;
      
    } catch (error) {
      console.error(`DataService.getSupernodeData failed:`, error);
      throw error;
    }
  }

  /**
   * Get node statistics
   */
  async getNodeStatistics(algorithmId, datasetId, nodeId, parameters) {
    try {
      const params = new URLSearchParams();
      if (algorithmId !== 'homogeneous') {
        params.append('processingType', algorithmId);
      }
      
      const url = `${this.apiBaseUrl}/node/${datasetId}/${parameters.k}/${nodeId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get node statistics');
      }
      
      return result;
      
    } catch (error) {
      console.error(`DataService.getNodeStatistics failed:`, error);
      throw error;
    }
  }

  /**
   * Run algorithm comparison - Now supports any compatible algorithm pair
   */
  async runComparison(algorithmConfigs) {
    try {
      console.log('DataService: Running comparison with configs:', algorithmConfigs);
      
      // Get algorithm IDs dynamically
      const algorithmIds = Object.keys(algorithmConfigs);
      
      if (algorithmIds.length !== 2) {
        throw new Error('Comparison requires exactly 2 algorithms');
      }
      
      const [algorithm1Id, algorithm2Id] = algorithmIds;
      
      // Verify algorithms are compatible for comparison
      if (!AlgorithmRegistry.areAlgorithmsCompatible(algorithm1Id, algorithm2Id)) {
        throw new Error(`Algorithms ${algorithm1Id} and ${algorithm2Id} are not compatible for comparison`);
      }
      
      // Get graph type to determine the comparison endpoint and file handling
      const graphType = AlgorithmRegistry.getGraphTypeForAlgorithm(algorithm1Id);
      
      if (!graphType) {
        throw new Error(`Could not determine graph type for algorithms ${algorithm1Id} and ${algorithm2Id}`);
      }
      
      // Prepare comparison request based on graph type
      if (graphType.id === 'homogeneous') {
        return await this._runHomogeneousComparison(algorithmConfigs);
      } else if (graphType.id === 'heterogeneous') {
        return await this._runHeterogeneousComparison(algorithmConfigs);
      } else {
        throw new Error(`Unsupported graph type for comparison: ${graphType.id}`);
      }
      
    } catch (error) {
      console.error(`DataService.runComparison failed:`, error);
      throw error;
    }
  }

  /**
   * Run comparison for homogeneous algorithms
   */
  async _runHomogeneousComparison(algorithmConfigs) {
    const algorithmIds = Object.keys(algorithmConfigs);
    const [algorithm1Id, algorithm2Id] = algorithmIds;
    
    try {
      const formData = new FormData();
      
      // Add files (same files used for both algorithms in homogeneous comparison)
      const files = algorithmConfigs[algorithm1Id].files;
      Object.entries(files).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });
      
      // Add algorithm configurations dynamically
      formData.append('algorithms', JSON.stringify({
        [algorithm1Id]: algorithmConfigs[algorithm1Id].parameters,
        [algorithm2Id]: algorithmConfigs[algorithm2Id].parameters
      }));
      
      // Add comparison metadata
      formData.append('comparisonType', 'homogeneous');
      formData.append('algorithm1', algorithm1Id);
      formData.append('algorithm2', algorithm2Id);
      
      const response = await fetch(`${this.apiBaseUrl}/compare-homogeneous`, {
        method: 'POST',
        body: formData,
        timeout: 300000 // 5 minutes
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Homogeneous comparison failed');
      }
      
      return this._normalizeComparisonResult(result, algorithm1Id, algorithm2Id);
      
    } catch (error) {
      console.error(`Homogeneous comparison failed:`, error);
      throw error;
    }
  }

  /**
   * Run comparison for heterogeneous algorithms
   */
  async _runHeterogeneousComparison(algorithmConfigs) {
    const algorithmIds = Object.keys(algorithmConfigs);
    const [algorithm1Id, algorithm2Id] = algorithmIds;
    
    try {
      const formData = new FormData();
      
      // Add files (same files used for both algorithms in heterogeneous comparison)
      const files = algorithmConfigs[algorithm1Id].files;
      Object.entries(files).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });
      
      // Add algorithm configurations dynamically
      formData.append('algorithms', JSON.stringify({
        [algorithm1Id]: algorithmConfigs[algorithm1Id].parameters,
        [algorithm2Id]: algorithmConfigs[algorithm2Id].parameters
      }));
      
      // Add comparison metadata
      formData.append('comparisonType', 'heterogeneous');
      formData.append('algorithm1', algorithm1Id);
      formData.append('algorithm2', algorithm2Id);
      
      // For backward compatibility with existing backend that expects 'heterogeneous' and 'scar'
      // TODO: Update this when backend is updated to handle generic algorithm pairs
      if (true) { // Temporary condition to use legacy endpoint
      // if (algorithmIds.includes('heterogeneous') && algorithmIds.includes('scar')) {
        // Use legacy endpoint for heterogeneous vs scar

        console.log(algorithmConfigs.heterogeneous.parameters);
        console.log(algorithmConfigs.scar.parameters);
        formData.append('heterogeneous', JSON.stringify(algorithmConfigs.heterogeneous.parameters));
        formData.append('scar', JSON.stringify(algorithmConfigs.scar.parameters));
        
        const response = await fetch(`${this.apiBaseUrl}/compare`, {
          method: 'POST',
          body: formData,
          timeout: 300000
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Comparison failed');
        }
        
        return result;
      } else {
        // Use new generic endpoint
        const response = await fetch(`${this.apiBaseUrl}/compare-heterogeneous`, {
          method: 'POST',
          body: formData,
          timeout: 300000
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Heterogeneous comparison failed');
        }
        
        return this._normalizeComparisonResult(result, algorithm1Id, algorithm2Id);
      }
      
    } catch (error) {
      console.error(`Heterogeneous comparison failed:`, error);
      throw error;
    }
  }

  /**
   * Normalize comparison result to have consistent structure
   */
  _normalizeComparisonResult(result, algorithm1Id, algorithm2Id) {
    // Ensure the result has the expected structure for the frontend
    if (!result.comparison) {
      // If the backend returns a different structure, normalize it
      result.comparison = {
        [algorithm1Id]: result[algorithm1Id] || {},
        [algorithm2Id]: result[algorithm2Id] || {},
        metrics: result.metrics || {},
        timestamp: new Date().toISOString()
      };
    }
    
    return result;
  }

  // Private methods for specific algorithm processing (unchanged)
  async _processHomogeneous(files, parameters) {
    // Upload step
    const formData = new FormData();
    formData.append('edgeList', files.edgeListFile);
    formData.append('attributes', files.attributesFile);
    formData.append('k', parameters.k);
    
    const uploadResponse = await fetch(`${this.apiBaseUrl}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success) {
      throw new Error(uploadResult.message || 'Upload failed');
    }
    
    // Process step
    const processResponse = await fetch(`${this.apiBaseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId: uploadResult.datasetId,
        k: parameters.k
      })
    });
    
    if (!processResponse.ok) {
      throw new Error(`Processing failed: ${processResponse.statusText}`);
    }
    
    const processResult = await processResponse.json();
    if (!processResult.success) {
      throw new Error(processResult.message || 'Processing failed');
    }
    
    return processResult;
  }

  async _processHeterogeneous(files, parameters) {
    // Upload step
    const formData = new FormData();
    formData.append('infoFile', files.infoFile);
    formData.append('linkFile', files.linkFile);
    formData.append('nodeFile', files.nodeFile);
    formData.append('metaFile', files.metaFile);
    formData.append('k', parameters.k);
    
    const uploadResponse = await fetch(`${this.apiBaseUrl}/upload-heterogeneous`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success) {
      throw new Error(uploadResult.message || 'Upload failed');
    }
    
    // Process step
    const processResponse = await fetch(`${this.apiBaseUrl}/process-heterogeneous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId: uploadResult.datasetId,
        k: parameters.k
      })
    });
    
    if (!processResponse.ok) {
      throw new Error(`Processing failed: ${processResponse.statusText}`);
    }
    
    const processResult = await processResponse.json();
    if (!processResult.success) {
      throw new Error(processResult.message || 'Processing failed');
    }
    
    return processResult;
  }

  async _processScar(files, parameters) {
    // Upload step
    const formData = new FormData();
    formData.append('infoFile', files.infoFile);
    formData.append('linkFile', files.linkFile);
    formData.append('nodeFile', files.nodeFile);
    formData.append('metaFile', files.metaFile);
    formData.append('k', parameters.k);
    formData.append('nk', parameters.nk);
    formData.append('th', parameters.th);
    
    console.log('🟡 Uploading SCAR files with parameters:', parameters);
    
    const uploadResponse = await fetch(`${this.apiBaseUrl}/upload-scar`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success) {
      throw new Error(uploadResult.message || 'Upload failed');
    }
    
    // Process step
    const processResponse = await fetch(`${this.apiBaseUrl}/process-scar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId: uploadResult.datasetId,
        k: parameters.k,
        nk: parameters.nk,
        th: parameters.th
      })
    });
    
    if (!processResponse.ok) {
      throw new Error(`Processing failed: ${processResponse.statusText}`);
    }
    
    const processResult = await processResponse.json();
    if (!processResult.success) {
      throw new Error(processResult.message || 'Processing failed');
    }
    
    return processResult;
  }

  // Utility methods
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export default new DataService();