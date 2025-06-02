const mqtt = require('mqtt');
const EventEmitter = require('events');
const config = require('../config/config');
const logger = require('../utils/logger');

class MQTTClient extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.subscriptions = new Set();
  }

  /**
   * MQTT brokerına bağlanır
   */
  async connect() {
    try {
      const options = {
        host: config.MQTT_HOST || 'localhost',
        port: config.MQTT_PORT || 1883,
        username: config.MQTT_USERNAME,
        password: config.MQTT_PASSWORD,
        clientId: `smart-home-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        will: {
          topic: 'smart-home/status',
          payload: 'offline',
          qos: 1,
          retain: true
        }
      };

      this.client = mqtt.connect(options);
      
      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('MQTT bağlantısı başarılı');
        
        // Status mesajı gönder
        this.publish('smart-home/status', 'online', { retain: true });
        
        // Önceki abonelikleri yeniden yap
        this.resubscribe();
        
        this.emit('connected');
      });

      this.client.on('error', (error) => {
        logger.error('MQTT bağlantı hatası:', error);
        this.emit('error', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('MQTT bağlantısı kapandı');
        this.emit('disconnected');
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          this.handleMessage(topic, payload);
        } catch (error) {
          logger.error('MQTT mesaj parse hatası:', error);
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        logger.warn('MQTT offline durumda');
      });

    } catch (error) {
      logger.error('MQTT bağlantı kurma hatası:', error);
      throw error;
    }
  }

  /**
   * MQTT mesajlarını işler
   * @param {string} topic - Mesaj konusu
   * @param {Object} payload - Mesaj içeriği
   */
  handleMessage(topic, payload) {
    logger.info(`MQTT mesaj alındı: ${topic}`, payload);
    
    // Cihaz durumu güncellemeleri
    if (topic.startsWith('devices/')) {
      this.emit('deviceUpdate', {
        topic,
        deviceId: topic.split('/')[1],
        data: payload
      });
    }
    
    // Sensor verileri
    if (topic.startsWith('sensors/')) {
      this.emit('sensorData', {
        topic,
        sensorId: topic.split('/')[1],
        data: payload
      });
    }
    
    // Genel mesaj eventi
    this.emit('message', { topic, payload });
  }

  /**
   * Bir konuya mesaj yayınlar
   * @param {string} topic - Yayın konusu
   * @param {string|Object} message - Gönderilecek mesaj
   * @param {Object} options - MQTT seçenekleri
   */
  async publish(topic, message, options = {}) {
    if (!this.isConnected) {
      throw new Error('MQTT bağlantısı yok');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const publishOptions = {
      qos: options.qos || 1,
      retain: options.retain || false
    };

    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, publishOptions, (error) => {
        if (error) {
          logger.error(`MQTT publish hatası: ${topic}`, error);
          reject(error);
        } else {
          logger.info(`MQTT mesaj gönderildi: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Bir konuya abone olur
   * @param {string} topic - Abone olunacak konu
   * @param {Object} options - Abonelik seçenekleri
   */
  async subscribe(topic, options = {}) {
    if (!this.isConnected) {
      throw new Error('MQTT bağlantısı yok');
    }

    const subscribeOptions = {
      qos: options.qos || 1
    };

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, subscribeOptions, (error) => {
        if (error) {
          logger.error(`MQTT subscribe hatası: ${topic}`, error);
          reject(error);
        } else {
          this.subscriptions.add(topic);
          logger.info(`MQTT konusuna abone olundu: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Abonelikten çıkar
   * @param {string} topic - Çıkılacak konu
   */
  async unsubscribe(topic) {
    if (!this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          logger.error(`MQTT unsubscribe hatası: ${topic}`, error);
          reject(error);
        } else {
          this.subscriptions.delete(topic);
          logger.info(`MQTT abonelikten çıkıldı: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Önceki abonelikleri yeniden yapar
   */
  async resubscribe() {
    for (const topic of this.subscriptions) {
      try {
        await this.client.subscribe(topic);
        logger.info(`Yeniden abone olundu: ${topic}`);
      } catch (error) {
        logger.error(`Yeniden abonelik hatası: ${topic}`, error);
      }
    }
  }

  /**
   * Cihaz kontrolü için komut gönderir
   * @param {string} deviceId - Cihaz ID
   * @param {Object} command - Komut verisi
   */
  async sendDeviceCommand(deviceId, command) {
    const topic = `devices/${deviceId}/command`;
    await this.publish(topic, command);
    
    logger.info(`Cihaz komutu gönderildi: ${deviceId}`, command);
  }

  /**
   * Cihaz durumu sorgular
   * @param {string} deviceId - Cihaz ID
   */
  async requestDeviceStatus(deviceId) {
    const topic = `devices/${deviceId}/status/request`;
    await this.publish(topic, { timestamp: Date.now() });
  }

  /**
   * Bağlantıyı kapatır
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.publish('smart-home/status', 'offline', { retain: true });
      this.client.end();
      this.isConnected = false;
      logger.info('MQTT bağlantısı kapatıldı');
    }
  }

  /**
   * Bağlantı durumunu döner
   * @returns {boolean} Bağlı mı?
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Aktif abonelikleri döner
   * @returns {Array} Abonelik listesi
   */
  getSubscriptions() {
    return Array.from(this.subscriptions);
  }
}

module.exports = new MQTTClient();