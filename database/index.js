const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      // MongoDB bağlantı seçenekleri
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0
      };

      this.connection = await mongoose.connect(config.database.mongoUri, options);
      
      logger.info('MongoDB bağlantısı başarılı');
      
      // Bağlantı olaylarını dinle
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB bağlantı hatası:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB bağlantısı kesildi');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB yeniden bağlandı');
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB bağlantı hatası:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        logger.info('MongoDB bağlantısı kapatıldı');
      }
    } catch (error) {
      logger.error('MongoDB bağlantı kapatma hatası:', error);
      throw error;
    }
  }

  // Veritabanı durumunu kontrol et
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      status: states[mongoose.connection.readyState],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  // Veritabanı istatistiklerini al
  async getStats() {
    try {
      const admin = mongoose.connection.db.admin();
      const stats = await admin.serverStatus();
      return {
        version: stats.version,
        uptime: stats.uptime,
        connections: stats.connections,
        memory: stats.mem
      };
    } catch (error) {
      logger.error('Veritabanı istatistikleri alınamadı:', error);
      return null;
    }
  }

  // Graceful shutdown için
  async gracefulShutdown(signal) {
    logger.info(`${signal} sinyali alındı. Veritabanı bağlantısı kapatılıyor...`);
    try {
      await this.disconnect();
      process.exit(0);
    } catch (error) {
      logger.error('Graceful shutdown hatası:', error);
      process.exit(1);
    }
  }
}

const database = new Database();

// Process signals için event listeners
process.on('SIGINT', () => database.gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => database.gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => database.gracefulShutdown('SIGUSR2')); // nodemon için

module.exports = database;