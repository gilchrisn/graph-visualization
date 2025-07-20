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
      console.log(`📋 Using cached hierarchy data for ${algorithmId}`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`🔄 Loading hierarchy data for ${algorithmId}:`, { datasetId, parameters });

      // FIXED: Build URL without processingType parameter for main algorithms
      const k = parameters?.k || 25;
      const url = `${this.apiBaseUrl}/hierarchy/${datasetId}/${k}`;
      
      console.log(`🌐 Fetching hierarchy: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get hierarchy data');
      }
      
      this.cache.set(cacheKey, result);
      console.log(`✅ Hierarchy data loaded for ${algorithmId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ DataService.getHierarchyData failed for ${algorithmId}:`, error);
      throw error;
    }
  }

  /**
   * Get supernode data for visualization
   */

async getSupernodeData(algorithmId, datasetId, supernodeId, parameters) {
  console.log('🔍 DATASERVICE.getSupernodeData ENTRY:', {
    algorithmId,
    datasetId,
    supernodeId,
    parameters,
    timestamp: new Date().toISOString()
  });
  
  const requestId = `req-${Date.now()}`;
  
  try {
    console.log(`🚀 [${requestId}] DataService.getSupernodeData called:`, {
      algorithmId,
      datasetId, 
      supernodeId,
      parameters,
      timestamp: new Date().toISOString()
    });

    const url = `${this.apiBaseUrl}/coordinates/${datasetId}/${algorithmId}/${supernodeId}`;
    
  console.log('🔍 ABOUT TO FETCH:', {
    url,
    algorithmId,
    datasetId,
    supernodeId,
    fullParameters: parameters
  });
    console.log(`🌐 [${requestId}] Making fetch request to: ${url}`);
    
    const response = await fetch(url);
    
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] HTTP Error:`, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        url: url
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to get supernode data');
    }

    if (!result.nodes) {
      console.warn(`⚠️ [${requestId}] No nodes in response, providing empty array`);
      result.nodes = [];
    }

    console.log(`✅ [${requestId}] DataService.getSupernodeData completed successfully`);
    return result;
    
  } catch (error) {
    console.error(`❌ [${requestId}] DataService.getSupernodeData failed:`, {
      algorithmId,
      datasetId,
      supernodeId,
      error: error.message,
      stack: error.stack
    });
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
      console.log('🔄 DataService: Running comparison with configs:', algorithmConfigs);
      
      const algorithmIds = Object.keys(algorithmConfigs);
      
      if (algorithmIds.length !== 2) {
        throw new Error('Comparison requires exactly 2 algorithms');
      }
      
      const [algorithm1Id, algorithm2Id] = algorithmIds;
      
      // FIXED: Handle the legacy heterogeneous vs scar comparison
      if ((algorithmIds.includes('heterogeneous') && algorithmIds.includes('scar')) ||
          (algorithmIds.includes('scar') && algorithmIds.includes('heterogeneous'))) {
        return await this._runHeterogeneousComparison(algorithmConfigs);
      } else {
        // For other combinations, use generic approach
        throw new Error(`Comparison between ${algorithm1Id} and ${algorithm2Id} not yet supported`);
      }
      
    } catch (error) {
      console.error(`❌ DataService.runComparison failed:`, error);
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
    try {
      const formData = new FormData();
      
      // FIXED: Get files from either algorithm config (they're the same)
      const files = algorithmConfigs.heterogeneous?.files || algorithmConfigs.scar?.files;
      
      if (!files) {
        throw new Error('No files found in algorithm configurations');
      }

      // Add files to form data
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          console.log(`📁 Adding file: ${key} = ${file.name}`);
          formData.append(key, file);
        }
      });
      
      // FIXED: Add algorithm parameters in the exact format backend expects
      formData.append('heterogeneous', JSON.stringify(
        algorithmConfigs.heterogeneous?.parameters || { k: 25 }
      ));
      formData.append('scar', JSON.stringify(
        algorithmConfigs.scar?.parameters || { k: 25, nk: 10, th: 0.5 }
      ));

      console.log('🚀 Sending comparison request to /api/compare');
      
      const response = await fetch(`${this.apiBaseUrl}/compare`, {
        method: 'POST',
        body: formData,
        timeout: 300000 // 5 minutes
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📥 Raw comparison response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Comparison failed');
      }

      // FIXED: The backend returns the correct structure, just pass it through
      console.log('✅ Comparison completed successfully');
      return result; // Don't normalize, backend structure is correct
      
    } catch (error) {
      console.error(`❌ Heterogeneous comparison failed:`, error);
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
    formData.append('graphFile', files.graphFile); 
    formData.append('propertiesFile', files.propertiesFile); 
    formData.append('pathFile', files.pathFile);
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
    formData.append('graphFile', files.graphFile);
    formData.append('propertiesFile', files.propertiesFile);
    formData.append('pathFile', files.pathFile);
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

  // Add this method to DataService.js - don't touch any existing methods
async reprocessWithNewParameters(algorithmId, existingDatasetId, newParameters) {
  try {
    switch (algorithmId) {
      case 'scar':
        return await this._reprocessScarOnly(existingDatasetId, newParameters);
      case 'heterogeneous':
        return await this._reprocessHeterogeneousOnly(existingDatasetId, newParameters);
      default:
        throw new Error(`Reprocessing not supported for ${algorithmId}`);
    }
  } catch (error) {
    console.error(`Reprocessing failed:`, error);
    throw error;
  }
}

async _reprocessScarOnly(datasetId, parameters) {
  // Skip upload, go straight to process
  const processResponse = await fetch(`${this.apiBaseUrl}/process-scar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      datasetId: datasetId,
      k: parameters.k,
      nk: parameters.nk,
      th: parameters.th
    })
  });
  
  if (!processResponse.ok) {
    throw new Error(`Processing failed: ${processResponse.statusText}`);
  }
  
  return await processResponse.json();
}

async _reprocessHeterogeneousOnly(datasetId, parameters) {
  // Same pattern for heterogeneous
  const processResponse = await fetch(`${this.apiBaseUrl}/process-heterogeneous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      datasetId: datasetId,
      k: parameters.k
    })
  });
  
  if (!processResponse.ok) {
    throw new Error(`Processing failed: ${processResponse.statusText}`);
  }
  
  return await processResponse.json();
}

  // Utility methods
  clearCache() {
    this.cache.clear();
    console.log('🗑️ DataService cache cleared');
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