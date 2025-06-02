// backend/utils/helpers.js
const crypto = require('crypto');

// API yanıt formatları: Frontend'e tutarlı yanıtlar döndürmek için
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

// Sayfalama yardımcıları: Büyük veri setlerini yönetmek için
const pagination = {
  getPaginationData: (page = 1, limit = 10, total = 0) => {
    const currentPage = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit))); // Maksimum 100 öğe
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

// String yardımcıları: Metin işleme için
const stringHelpers = {
  generateId: (length = 8) => {
    // Kriptografik olarak güçlü rastgele ID üretir
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  },

  slugify: (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')          // Boşlukları tirelerle değiştir
      .replace(/[^\w-]+/g, '')       // Kelime olmayan karakterleri kaldır
      .replace(/--+/g, '-')          // Birden fazla tireyi tek tireye indir
      .replace(/^-+/, '')           // Başlangıçtaki tireleri kaldır
      .replace(/-+$/, '');          // Sondaki tireleri kaldır
  },

  capitalizeFirst: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate: (str, length = 100, suffix = '...') => {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  }
};

// Tarih yardımcıları: Tarih ve saat manipülasyonu için
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

// Doğrulama yardımcıları: Gelen verileri kontrol etmek için
const validation = {
  isEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isStrongPassword: (password) => {
    // En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  },

  isValidObjectId: (id) => {
    // MongoDB ObjectId formatı için
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  },

  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    // Basit bir HTML ve script tag temizliği
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
};

// Async yardımcıları: Asenkron işlemleri yönetmek için
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
          await asyncHelpers.delay(delay * Math.pow(2, i)); // Üstel geri çekilme
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

// Cihaz durumu yardımcıları (Örnek, projenize özel olarak düzenlenmeli)
const deviceHelpers = {
  getDeviceStatus: (device) => {
    // Bu fonksiyon Home Assistant entity'leri için daha uygun hale getirilmeli
    // Örneğin, 'on' veya 'off' gibi durumları kontrol etmeli
    if (device && typeof device.state === 'string') {
        return device.state.toLowerCase(); // HA'dan gelen state doğrudan döndürülebilir
    }
    if (!device.lastSeen) return 'unknown'; // Varsayılan olarak bilinmiyor
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(device.lastSeen) > fiveMinutesAgo ? 'online' : 'offline';
  },

  formatDeviceData: (device) => {
    // Bu fonksiyon, HA entity verisini Flutter'a uygun hale getirmek için kullanılır.
    // getDevices API'sinde kullanabiliriz.
    return {
      id: device.entity_id || device._id, // HA'dan entity_id, DB'den _id
      name: device.attributes?.friendly_name || device.name || device.entity_id,
      type: device.entity_id ? device.entity_id.split('.')[0] : device.type, // HA domaini veya kendi tipi
      status: device.state ? device.state.toLowerCase() : deviceHelpers.getDeviceStatus(device), // HA state veya genel durum
      lastSeen: device.lastSeen, // Eğer varsa
      properties: device.attributes || device.properties || {}, // HA attributes veya kendi properties
      location: device.location || 'Unknown' // Eğer varsa
    };
  },

  validateDeviceCommand: (deviceType, command) => {
    // Bu fonksiyon LLM'den gelen komutları doğrulamak için kullanılabilir.
    const allowedCommands = {
      'light': ['on', 'off', 'toggle', 'dim', 'color', 'set_brightness', 'set_color_temp'],
      'switch': ['on', 'off', 'toggle'],
      'thermostat': ['set_temperature', 'set_hvac_mode', 'set_fan_mode'],
      'sensor': [], // Sensörler genellikle komut almaz
      'camera': ['record', 'snapshot', 'move'],
      'door': ['lock', 'unlock', 'open', 'close']
    };

    return allowedCommands[deviceType]?.includes(command) || false;
  }
};

// Tüm yardımcı modülleri dışa aktar
module.exports = {
  apiResponse,
  pagination,
  stringHelpers,
  dateHelpers,
  validation,
  asyncHelpers,
  deviceHelpers
};