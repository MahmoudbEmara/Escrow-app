import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

/**
 * File Storage Service
 * Handles file uploads, downloads, and management using Supabase Storage
 */

/**
 * Get storage bucket reference
 * @param {string} bucketName - Name of the storage bucket
 * @returns {object} - Storage bucket reference
 */
const getBucket = (bucketName) => {
  return supabase.storage.from(bucketName);
};

/**
 * Upload a file to Supabase Storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket (e.g., 'avatars/user123.jpg')
 * @param {object} file - File object (URI, blob, or File)
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result with public URL
 */
export const uploadFile = async (bucket, path, file, options = {}) => {
  try {
    let fileData;

    // Handle different file input types
    if (typeof file === 'string') {
      // If it's a URI (from ImagePicker or DocumentPicker)
      const response = await fetch(file);
      const blob = await response.blob();
      fileData = blob;
    } else if (file instanceof Blob || file instanceof File) {
      fileData = file;
    } else if (file.uri) {
      // React Native file object with URI
      const response = await fetch(file.uri);
      const blob = await response.blob();
      fileData = blob;
    } else {
      throw new Error('Invalid file type');
    }

    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.upload(path, fileData, {
      cacheControl: options.cacheControl || '3600',
      upsert: options.upsert || false,
      contentType: options.contentType || fileData.type,
      ...options,
    });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = bucketRef.getPublicUrl(path);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      error: null,
    };
  } catch (error) {
    console.error('Upload file error:', error);
    return {
      path: null,
      publicUrl: null,
      error: error.message || 'Failed to upload file',
    };
  }
};

/**
 * Upload an image (handles ImagePicker result)
 * @param {string} bucket - Bucket name (e.g., 'avatars', 'images')
 * @param {string} path - File path in bucket
 * @param {object} imagePickerResult - Result from expo-image-picker
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
export const uploadImage = async (bucket, path, imagePickerResult, options = {}) => {
  if (!imagePickerResult || !imagePickerResult.uri) {
    return {
      path: null,
      publicUrl: null,
      error: 'Invalid image picker result',
    };
  }

  // Determine content type
  const contentType = imagePickerResult.type || 'image/jpeg';
  
  return uploadFile(bucket, path, imagePickerResult, {
    ...options,
    contentType,
  });
};

/**
 * Upload multiple images
 * @param {string} bucket - Bucket name
 * @param {Array<object>} images - Array of image picker results
 * @param {function} pathGenerator - Function to generate path for each image (receives index)
 * @param {object} options - Upload options
 * @returns {Promise<Array<object>>} - Array of upload results
 */
export const uploadMultipleImages = async (bucket, images, pathGenerator, options = {}) => {
  try {
    const uploadPromises = images.map((image, index) => {
      const path = typeof pathGenerator === 'function' ? pathGenerator(index) : pathGenerator;
      return uploadImage(bucket, path, image, options);
    });

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Upload multiple images error:', error);
    return images.map(() => ({
      path: null,
      publicUrl: null,
      error: error.message || 'Failed to upload images',
    }));
  }
};

/**
 * Upload a video
 * @param {string} bucket - Bucket name (e.g., 'videos')
 * @param {string} path - File path in bucket
 * @param {object} videoPickerResult - Result from expo-image-picker (video)
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
export const uploadVideo = async (bucket, path, videoPickerResult, options = {}) => {
  if (!videoPickerResult || !videoPickerResult.uri) {
    return {
      path: null,
      publicUrl: null,
      error: 'Invalid video picker result',
    };
  }

  const contentType = videoPickerResult.type || 'video/mp4';
  
  return uploadFile(bucket, path, videoPickerResult, {
    ...options,
    contentType,
  });
};

/**
 * Upload a document (PDF, DOC, etc.)
 * @param {string} bucket - Bucket name (e.g., 'documents')
 * @param {string} path - File path in bucket
 * @param {object} documentPickerResult - Result from expo-document-picker
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
export const uploadDocument = async (bucket, path, documentPickerResult, options = {}) => {
  if (!documentPickerResult || !documentPickerResult.uri) {
    return {
      path: null,
      publicUrl: null,
      error: 'Invalid document picker result',
    };
  }

  const contentType = documentPickerResult.mimeType || 'application/octet-stream';
  
  return uploadFile(bucket, path, documentPickerResult, {
    ...options,
    contentType,
  });
};

/**
 * Download a file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<object>} - Downloaded file data
 */
export const downloadFile = async (bucket, path) => {
  try {
    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.download(path);

    if (error) {
      throw error;
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Download file error:', error);
    return {
      data: null,
      error: error.message || 'Failed to download file',
    };
  }
};

/**
 * Get public URL for a file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @returns {string} - Public URL
 */
export const getPublicUrl = (bucket, path) => {
  const bucketRef = getBucket(bucket);
  const { data } = bucketRef.getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Get signed URL for a private file (expires after specified time)
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<object>} - Signed URL
 */
export const getSignedUrl = async (bucket, path, expiresIn = 3600) => {
  try {
    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return {
      signedUrl: data.signedUrl,
      error: null,
    };
  } catch (error) {
    console.error('Get signed URL error:', error);
    return {
      signedUrl: null,
      error: error.message || 'Failed to get signed URL',
    };
  }
};

/**
 * List files in a bucket folder
 * @param {string} bucket - Bucket name
 * @param {string} folder - Folder path (optional)
 * @param {object} options - List options (limit, offset, sortBy)
 * @returns {Promise<object>} - List of files
 */
export const listFiles = async (bucket, folder = '', options = {}) => {
  try {
    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.list(folder, {
      limit: options.limit || 100,
      offset: options.offset || 0,
      sortBy: options.sortBy || { column: 'name', order: 'asc' },
    });

    if (error) {
      throw error;
    }

    return {
      files: data || [],
      error: null,
    };
  } catch (error) {
    console.error('List files error:', error);
    return {
      files: [],
      error: error.message || 'Failed to list files',
    };
  }
};

/**
 * Delete a file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<object>} - Deletion result
 */
export const deleteFile = async (bucket, path) => {
  try {
    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.remove([path]);

    if (error) {
      throw error;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Delete file error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete file',
    };
  }
};

/**
 * Delete multiple files
 * @param {string} bucket - Bucket name
 * @param {Array<string>} paths - Array of file paths
 * @returns {Promise<object>} - Deletion result
 */
export const deleteMultipleFiles = async (bucket, paths) => {
  try {
    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.remove(paths);

    if (error) {
      throw error;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Delete multiple files error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete files',
    };
  }
};

/**
 * Move or rename a file
 * @param {string} bucket - Bucket name
 * @param {string} fromPath - Current file path
 * @param {string} toPath - New file path
 * @returns {Promise<object>} - Move result
 */
export const moveFile = async (bucket, fromPath, toPath) => {
  try {
    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.move(fromPath, toPath);

    if (error) {
      throw error;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Move file error:', error);
    return {
      success: false,
      error: error.message || 'Failed to move file',
    };
  }
};

/**
 * Copy a file
 * @param {string} bucket - Bucket name
 * @param {string} fromPath - Source file path
 * @param {string} toPath - Destination file path
 * @returns {Promise<object>} - Copy result
 */
export const copyFile = async (bucket, fromPath, toPath) => {
  try {
    const bucketRef = getBucket(bucket);
    const { data, error } = await bucketRef.copy(fromPath, toPath);

    if (error) {
      throw error;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Copy file error:', error);
    return {
      success: false,
      error: error.message || 'Failed to copy file',
    };
  }
};

/**
 * Helper function to pick image from gallery or camera
 * @param {object} options - ImagePicker options
 * @returns {Promise<object>} - Image picker result
 */
export const pickImage = async (options = {}) => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return {
        cancelled: true,
        error: 'Permission to access media library was denied',
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing || true,
      aspect: options.aspect || [4, 3],
      quality: options.quality || 0.8,
      ...options,
    });

    return result;
  } catch (error) {
    console.error('Pick image error:', error);
    return {
      cancelled: true,
      error: error.message || 'Failed to pick image',
    };
  }
};

/**
 * Helper function to take photo with camera
 * @param {object} options - ImagePicker options
 * @returns {Promise<object>} - Image picker result
 */
export const takePhoto = async (options = {}) => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return {
        cancelled: true,
        error: 'Permission to access camera was denied',
      };
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: options.allowsEditing || true,
      aspect: options.aspect || [4, 3],
      quality: options.quality || 0.8,
      ...options,
    });

    return result;
  } catch (error) {
    console.error('Take photo error:', error);
    return {
      cancelled: true,
      error: error.message || 'Failed to take photo',
    };
  }
};

/**
 * Helper function to pick video
 * @param {object} options - ImagePicker options
 * @returns {Promise<object>} - Video picker result
 */
export const pickVideo = async (options = {}) => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return {
        cancelled: true,
        error: 'Permission to access media library was denied',
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: options.allowsEditing || false,
      quality: options.quality || 1,
      videoMaxDuration: options.videoMaxDuration || 60,
      ...options,
    });

    return result;
  } catch (error) {
    console.error('Pick video error:', error);
    return {
      cancelled: true,
      error: error.message || 'Failed to pick video',
    };
  }
};

/**
 * Helper function to pick document
 * @param {object} options - DocumentPicker options
 * @returns {Promise<object>} - Document picker result
 */
export const pickDocument = async (options = {}) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      ...options,
    });

    return result;
  } catch (error) {
    console.error('Pick document error:', error);
    return {
      cancelled: true,
      error: error.message || 'Failed to pick document',
    };
  }
};

/**
 * Upload user avatar
 * @param {string} userId - User ID
 * @param {object} imagePickerResult - Image picker result
 * @returns {Promise<object>} - Upload result
 */
export const uploadAvatar = async (userId, imagePickerResult) => {
  const timestamp = Date.now();
  const fileExtension = imagePickerResult.uri.split('.').pop();
  const path = `avatars/${userId}_${timestamp}.${fileExtension}`;
  
  return uploadImage('avatars', path, imagePickerResult);
};

/**
 * Upload transaction document/attachment
 * @param {string} transactionId - Transaction ID
 * @param {object} fileResult - File picker result (image, video, or document)
 * @param {string} fileType - File type: 'image' | 'video' | 'document'
 * @returns {Promise<object>} - Upload result
 */
export const uploadTransactionAttachment = async (transactionId, fileResult, fileType = 'document') => {
  const timestamp = Date.now();
  const bucketName = fileType === 'image' ? 'transaction-images' : 
                     fileType === 'video' ? 'transaction-videos' : 
                     'transaction-documents';
  
  let fileExtension = 'jpg';
  if (fileResult.uri) {
    const uriParts = fileResult.uri.split('.');
    fileExtension = uriParts[uriParts.length - 1] || 'jpg';
  } else if (fileResult.name) {
    const nameParts = fileResult.name.split('.');
    fileExtension = nameParts[nameParts.length - 1] || 'jpg';
  }
  
  const path = `${transactionId}/${timestamp}.${fileExtension}`;
  
  if (fileType === 'image') {
    return uploadImage(bucketName, path, fileResult);
  } else if (fileType === 'video') {
    return uploadVideo(bucketName, path, fileResult);
  } else {
    return uploadDocument(bucketName, path, fileResult);
  }
};

