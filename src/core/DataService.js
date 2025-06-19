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
   * Run algorithm comparison
   */
  async runComparison(algorithmConfigs) {
    try {
      const formData = new FormData();
      
      // Add files from the first algorithm config (assuming same files for both)
      const files = algorithmConfigs.heterogeneous.files;
      Object.entries(files).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });
      
      // Add algorithm parameters
      formData.append('heterogeneous', JSON.stringify(algorithmConfigs.heterogeneous.parameters));
      formData.append('scar', JSON.stringify(algorithmConfigs.scar.parameters));
      
      const response = await fetch(`${this.apiBaseUrl}/compare`, {
        method: 'POST',
        body: formData,
        timeout: 300000 // 5 minutes
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Comparison failed');
      }
      
      return result;
      
    } catch (error) {
      console.error(`DataService.runComparison failed:`, error);
      throw error;
    }
  }

  // Private methods for specific algorithm processing
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
    
    console.log('🔄 Uploading SCAR files with parameters:', parameters);
    
    const uploadResponse = await fetch(`${this.apiBaseUrl}/upload-scar`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful:', uploadResult);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.message || 'Upload failed');
    }
    
    // Process step
    const processPayload = {
      datasetId: uploadResult.datasetId,
      k: parameters.k,
      nk: parameters.nk,
      th: parameters.th
    };
    
    console.log('🔄 Processing SCAR with payload:', processPayload);
    
    const processResponse = await fetch(`${this.apiBaseUrl}/process-scar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processPayload)
    });
    
    if (!processResponse.ok) {
      // Get detailed error information
      let errorDetails;
      try {
        errorDetails = await processResponse.json();
        console.error('❌ Processing failed with details:', errorDetails);
      } catch (e) {
        errorDetails = await processResponse.text();
        console.error('❌ Processing failed with text:', errorDetails);
      }
      
      throw new Error(`Processing failed: ${processResponse.statusText}. Details: ${JSON.stringify(errorDetails)}`);
    }
    
    const processResult = await processResponse.json();
    console.log('✅ Processing successful:', processResult);
    
    if (!processResult.success) {
      throw new Error(processResult.message || 'Processing failed');
    }
    
    return processResult;
  }
}

// Export singleton instance
export default new DataService();