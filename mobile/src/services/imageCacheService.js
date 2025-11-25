import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

const CACHE_DIR = `${FileSystem.cacheDirectory}profile-images/`;

const ensureCacheDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

const getCachedImagePath = (imageUrl) => {
  if (!imageUrl) return null;
  const urlParts = imageUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const userId = urlParts[urlParts.length - 2] || 'unknown';
  return `${CACHE_DIR}${userId}_${fileName}`;
};

export const getCachedImageUri = async (imageUrl) => {
  if (!imageUrl) return null;

  try {
    await ensureCacheDir();
    const cachedPath = getCachedImagePath(imageUrl);
    
    const fileInfo = await FileSystem.getInfoAsync(cachedPath);
    if (fileInfo.exists) {
      return fileInfo.uri;
    }

    const downloadResult = await FileSystem.downloadAsync(imageUrl, cachedPath);
    if (downloadResult.status === 200) {
      return downloadResult.uri;
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error caching image:', error);
    return imageUrl;
  }
};

export const preloadImages = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) return;
  
  try {
    await ensureCacheDir();
    const cachePromises = imageUrls
      .filter(url => url)
      .map(url => getCachedImageUri(url));
    
    await Promise.all(cachePromises);
  } catch (error) {
    console.error('Error preloading images:', error);
  }
};

export const clearImageCache = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
};

export const getCacheSize = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) return 0;
    
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
      if (fileInfo.exists && fileInfo.size) {
        totalSize += fileInfo.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

