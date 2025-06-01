const crypto = require('crypto');

// API response formatları
const apiResponse = {
  success: (data = null, message = 'Success') => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }),

  error: (message = 'An error occurred', errorCode = null, details = null) => ({
    success: false,
    error: {
      message,
      code: errorCode,
      details
    },
    timestamp: new Date().toISOString()
  }),

  validation: (errors) => ({
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    },
    timestamp: new Date().toISOString()
  })
};

// Sayfalama yardımcıları
const pagination = {
  getPaginationData: (page = 1, limit = 10, total = 0) => {
    const currentPage = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit))); // Max 100 item
    const totalPages = Math.ceil(total / pageSize);
    const skip = (currentPage - 1) * pageSize;

    return {
      currentPage,
      pageSize,
      totalPages,
      totalItems: total,
      skip,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  },

  getPaginatedResponse: (data, paginationData) => ({
    items: data,
    pagination: {
      currentPage: paginationData.currentPage,
      pageSize: paginationData.pageSize,
      totalPages: paginationData.totalPages,
      totalItems: paginationData.totalItems,
      hasNext: paginationData.hasNext,
      hasPrev: paginationData.hasPrev
    }
  })
};

// String yardımcıları
const stringHelpers = {
  generateId: (length = 8) => {
    return crypto.randomBytes(length).toString('hex');
  },

  slugify: (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  },

  capitalizeFirst: (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate: (str, length = 100, suffix = '...') => {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  }
};

// Tarih yardımcıları
const dateHelpers = {
  formatDate: (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  isExpired: (date) => {
    return new Date(date) < new Date();
  },

  timeAgo: (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} saniye önce`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    return `${Math.floor(diffInSeconds / 86400)} gün önce`;
  }
};

// Validation yardımcıları
const validation = {
  isEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isStrongPassword: (password) => {
    // En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  },

  isValidObjectId: (id) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  },

  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
};

// Async yardımcıları
const asyncHelpers = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  retry: async (fn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          await asyncHelpers.delay(delay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  },

  timeout: (promise, ms) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), ms)
      )
    ]);
  }
};

// Cihaz durumu yardımcıları
const deviceHelpers = {
  getDeviceStatus: (device) => {
    if (!device.lastSeen) return 'unknown';
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(device.lastSeen) > fiveMinutesAgo ? 'online' : 'offline';
  },

  formatDeviceData: (device) => {
    return {
      id: device._id,
      name: device.name,
      type: device.type,
      status: deviceHelpers.getDeviceStatus(device),
      lastSeen: device.lastSeen,
      properties: device.properties || {},
      location: device.location || 'Belirtilmemiş'
    };
  },

  validateDeviceCommand: (deviceType, command) => {
    const allowedCommands = {
      'light': ['on', 'off', 'dim', 'color'],
      'switch': ['on', 'off'],
      'thermostat': ['set_temperature', 'set_mode'],
      'sensor': [], // Sensörler komut almaz
      'camera': ['record', 'snapshot', 'move'],
      'door': ['lock', 'unlock', 'open', 'close']
    };

    return allowedCommands[deviceType]?.includes(command) || false;
  }
};

module.exports = {
  apiResponse,
  pagination,
  stringHelpers,
  dateHelpers,
  validation,
  asyncHelpers,
  deviceHelpers
};