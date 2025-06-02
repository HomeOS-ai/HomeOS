// backend/utils/logger.js

// Bu basit bir logger modülüdür.
// Daha gelişmiş projelerde Winston veya Bunyan gibi kütüphaneler kullanılabilir.

const logger = {
    // Bilgi mesajları için
    info: (...args) => console.log(`[INFO] [${new Date().toISOString()}]`, ...args),

    // Uyarı mesajları için
    warn: (...args) => console.warn(`[WARN] [${new Date().toISOString()}]`, ...args),

    // Hata mesajları için
    error: (...args) => console.error(`[ERROR] [${new Date().toISOString()}]`, ...args),

    // Detaylı hata ayıklama mesajları için (genellikle sadece geliştirme ortamında aktif olur)
    debug: (...args) => console.debug(`[DEBUG] [${new Date().toISOString()}]`, ...args)
};

module.exports = logger;