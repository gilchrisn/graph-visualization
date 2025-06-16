import axios from 'axios';

// Base URL for the API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3002/api';

/**
 * Enhanced API service for PPRviz with support for heterogeneous and SCAR processing
 */
const api = {
  /**
   * Upload homogeneous files to the backend
   * @param {File} edgeListFile - Edge list file
   * @param {File} attributesFile - Attributes file
   * @param {number} k - Cluster size
   * @returns {Promise} - Promise with response data
   */
  uploadFiles: async (edgeListFile, attributesFile, k) => {
    const formData = new FormData();
    formData.append('edgeList', edgeListFile);
    formData.append('attributes', attributesFile);
    formData.append('k', k);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200) {
        console.log('Homogeneous files uploaded successfully:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Error uploading homogeneous files:', error);
      throw new Error('Failed to upload homogeneous files: ' + (error.response?.data?.message || error.message));
    }
  },

  /**
   * Upload heterogeneous files to the backend
   * @param {File} infoFile - Info file (*_info.dat)
   * @param {File} linkFile - Link file (*_link.dat)
   * @param {File} nodeFile - Node file (*_node.dat)
   * @param {File} metaFile - Meta file (*_meta.dat)
   * @param {number} k - Cluster size
   * @returns {Promise} - Promise with response data
   */
  uploadFilesHeterogeneous: async (infoFile, linkFile, nodeFile, metaFile, k) => {
    const formData = new FormData();
    formData.append('infoFile', infoFile);
    formData.append('linkFile', linkFile);
    formData.append('nodeFile', nodeFile);
    formData.append('metaFile', metaFile);
    formData.append('k', k);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/upload-heterogeneous`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200) {
        console.log('Heterogeneous files uploaded successfully:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Error uploading heterogeneous files:', error);
      throw new Error('Failed to upload heterogeneous files: ' + (error.response?.data?.message || error.message));
    }
  },

  /**
   * Upload SCAR files to the backend
   * @param {File} infoFile - Info file (*_info.dat)
   * @param {File} linkFile - Link file (*_link.dat)
   * @param {File} nodeFile - Node file (*_node.dat)
   * @param {File} metaFile - Meta file (*_meta.dat)
   * @param {number} k - Cluster size
   * @param {number} nk - NK parameter
   * @param {number} th - Threshold parameter
   * @returns {Promise} - Promise with response data
   */
  uploadFilesScar: async (infoFile, linkFile, nodeFile, metaFile, k, nk, th) => {
    const formData = new FormData();
    formData.append('infoFile', infoFile);
    formData.append('linkFile', linkFile);
    formData.append('nodeFile', nodeFile);
    formData.append('metaFile', metaFile);
    formData.append('k', k);
    formData.append('nk', nk);
    formData.append('th', th);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/upload-scar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200) {
        console.log('SCAR files uploaded successfully:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Error uploading SCAR files:', error);
      throw new Error('Failed to upload SCAR files: ' + (error.response?.data?.message || error.message));
    }
  },
  
  /**
   * Process homogeneous dataset
   * @param {string} datasetId - Dataset ID
   * @param {number} k - Cluster size
   * @returns {Promise} - Promise with response data
   */
  processDataset: async (datasetId, k) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/process`, {
        datasetId,
        k
      });

      if (response.status === 200) {
        console.log('Homogeneous dataset processed successfully:', response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error processing homogeneous dataset:', error);
      throw new Error('Failed to process homogeneous dataset: ' + (error.response?.data?.message || error.message));
    }
  },

  /**
   * Process heterogeneous dataset
   * @param {string} datasetId - Dataset ID (without _heterogeneous suffix)
   * @param {number} k - Cluster size
   * @returns {Promise} - Promise with response data
   */
  processDatasetHeterogeneous: async (datasetId, k) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/process-heterogeneous`, {
        datasetId,
        k
      });

      if (response.status === 200) {
        console.log('Heterogeneous dataset processed successfully:', response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error processing heterogeneous dataset:', error);
      throw new Error('Failed to process heterogeneous dataset: ' + (error.response?.data?.message || error.message));
    }
  },

  /**
   * Process SCAR dataset
   * @param {string} datasetId - Dataset ID (without _scar suffix)
   * @param {number} k - Cluster size
   * @param {number} nk - NK parameter
   * @param {number} th - Threshold parameter
   * @returns {Promise} - Promise with response data
   */
  processDatasetScar: async (datasetId, k, nk, th) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/process-scar`, {
        datasetId,
        k,
        nk,
        th
      });

      if (response.status === 200) {
        console.log('SCAR dataset processed successfully:', response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error processing SCAR dataset:', error);
      throw new Error('Failed to process SCAR dataset: ' + (error.response?.data?.message || error.message));
    }
  },
  
  /**
   * Get hierarchy data with processing type support
   * @param {string} datasetId - Dataset ID (with suffix like _heterogeneous or _scar)
   * @param {number} k - Cluster size
   * @param {string} processingType - Processing type ('louvain', 'heterogeneous', 'scar')
   * @returns {Promise} - Promise with response data
   */
  getHierarchyData: async (datasetId, k, processingType = 'louvain') => {
    try {
      const params = new URLSearchParams();
      if (processingType && processingType !== 'homogeneous') {
        params.append('processingType', processingType);
      }
      
      const url = `${API_BASE_URL}/hierarchy/${datasetId}/${k}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);

      if (response.status === 200) {
        console.log('Hierarchy data retrieved successfully:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Error getting hierarchy data:', error);
      throw new Error('Failed to get hierarchy data: ' + (error.response?.data?.message || error.message));
    }
  },
  
  /**
   * Get coordinates for a supernode with processing type support
   * @param {string} datasetId - Dataset ID (with suffix)
   * @param {number} k - Cluster size
   * @param {string} supernodeId - Supernode ID
   * @param {string} processingType - Processing type ('louvain', 'heterogeneous', 'scar')
   * @returns {Promise} - Promise with response data
   */
  getSupernodeCoordinates: async (datasetId, k, supernodeId, processingType = 'louvain') => {
    try {
      const params = new URLSearchParams();
      if (processingType && processingType !== 'homogeneous') {
        params.append('processingType', processingType);
      }
      
      const url = `${API_BASE_URL}/coordinates/${datasetId}/${k}/${supernodeId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      if (response.status === 200) {
        console.log('Supernode coordinates retrieved successfully:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Error getting supernode coordinates:', error);
      throw new Error('Failed to get coordinates: ' + (error.response?.data?.message || error.message));
    }
  },
  
  /**
   * Get node statistics with processing type support
   * @param {string} datasetId - Dataset ID (with suffix)
   * @param {number} k - Cluster size
   * @param {string} nodeId - Node ID
   * @param {string} processingType - Processing type ('louvain', 'heterogeneous', 'scar')
   * @returns {Promise} - Promise with response data
   */
  getNodeStatistics: async (datasetId, k, nodeId, processingType = 'louvain') => {
    try {
      const params = new URLSearchParams();
      if (processingType && processingType !== 'homogeneous') {
        params.append('processingType', processingType);
      }
      
      const url = `${API_BASE_URL}/node/${datasetId}/${k}/${nodeId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      
      if (response.status === 200) {
        console.log('Node statistics retrieved successfully:', response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting node statistics:', error);
      throw new Error('Failed to get node statistics: ' + (error.response?.data?.message || error.message));
    }
  }
};

export default api;