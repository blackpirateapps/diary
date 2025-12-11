// storageUtils.js
export const getByteSize = (str) => new Blob([str]).size;

export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export const safeLocalStorageSet = (key, value) => {
  try {
    const size = getByteSize(value);
    const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB safety limit
    
    if (size > MAX_SIZE) {
      console.warn(`Data too large for localStorage: ${formatBytes(size)}`);
      return { success: false, reason: 'size', size };
    }
    
    localStorage.setItem(key, value);
    return { success: true, size };
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.error('localStorage quota exceeded');
      return { success: false, reason: 'quota', error: e };
    }
    console.error('localStorage error:', e);
    return { success: false, reason: 'error', error: e };
  }
};

export const safeLocalStorageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('localStorage read error:', e);
    return null;
  }
};

export const safeLocalStorageRemove = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('localStorage remove error:', e);
    return false;
  }
};