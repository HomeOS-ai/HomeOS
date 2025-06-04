// backend/services/mqttClient.js
const mqtt = require('mqtt');
const EventEmitter = require('events'); // Olay yayımlayıcı özelliği için
const config = require('../config/index.js'); // Düzeltilmiş config yolu
const logger = require('../utils/logger'); // Logger modülümüzü dahil et

class MQTTClient extends EventEmitter {
  constructor() {
    super(); // EventEmitter constructor'ını çağır
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5; // Maksimum yeniden bağlanma denemesi
    this.subscriptions = new Set(); // Abone olunan konuları takip etmek için

    // MQTTClient sınıfı oluşturulduğunda otomatik bağlanma
    // Bu metod app.js'te çağrılacak, burada otomatik çağırmıyoruz
    // this.connect().catch(err => logger.error('MQTT istemcisi başlangıçta bağlanamadı:', err));
  }

  /**
   * MQTT brokerına bağlanır
   */
  async connect() {
    if (this.client && this.client.connected) {
      logger.info('MQTT zaten bağlı.');
      return;
    }

    try {
      const options = {
        host: config.mqtt.host,
        port: config.mqtt.port,
        username: config.mqtt.username,
        password: config.mqtt.password,
        clientId: `smart-home-backend-${Date.now()}`, // Benzersiz client ID
        clean: true, // Temiz oturum
        reconnectPeriod: 5000, // 5 saniyede bir yeniden bağlanmayı dene
        connectTimeout: 30000, // Bağlantı zaman aşımı
        will: { // Son dilek mesajı (bağlantı koparsa yayınlanır)
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
        this.publish('smart-home/status', 'online', { retain: true }); // Online durumunu yayınla
        this.resubscribe(); // Önceki abonelikleri yeniden yap
        this.emit('connected'); // 'connected' eventi yayınla
      });

      this.client.on('error', (error) => {
        logger.error('MQTT bağlantı hatası:', error);
        this.emit('error', error);
        this.isConnected = false; // Hata durumunda bağlantı durumunu güncelle
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('MQTT bağlantısı kapandı');
        this.emit('disconnected');
      });

      this.client.on('message', (topic, message) => {
        try {
          // Mesajı JSON olarak ayrıştırmaya çalış
          const payload = JSON.parse(message.toString());
          this.handleMessage(topic, payload);
        } catch (error) {
          logger.error('MQTT mesaj parse hatası (JSON değilse):', error.message);
          // JSON olmayan mesajları da işleyebiliriz, örneğin düz string olarak
          this.handleMessage(topic, message.toString());
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        logger.warn('MQTT offline durumda');
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.warn(`MQTT yeniden bağlanmaya çalışıyor... Deneme: ${this.reconnectAttempts}`);
      });

    } catch (error) {
      logger.error('MQTT bağlantı kurma hatası:', error);
      throw error;
    }
  }

  /**
   * MQTT mesajlarını işler ve ilgili event'leri yayınlar
   * @param {string} topic - Mesaj konusu
   * @param {Object|string} payload - Mesaj içeriği (JSON veya string)
   */
  handleMessage(topic, payload) {
    logger.debug(`MQTT mesaj alındı: ${topic}`, payload); // debug seviyesinde logla

    // Cihaz durumu güncellemeleri
    if (topic.startsWith('homeassistant/sensor/') || topic.startsWith('devices/')) { // Home Assistant MQTT discovery veya özel topic
      this.emit('deviceUpdate', {
        topic,
        entityId: topic.split('/')[2] || topic.split('/')[1], // Topic yapısına göre ID al
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
      logger.error(`MQTT publish başarısız: Bağlantı yok. Konu: ${topic}`);
      throw new Error('MQTT bağlantısı yok');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const publishOptions = {
      qos: options.qos || 0, // Varsayılan QoS 0
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
      logger.error(`MQTT subscribe başarısız: Bağlantı yok. Konu: ${topic}`);
      throw new Error('MQTT bağlantısı yok');
    }

    const subscribeOptions = {
      qos: options.qos || 0 // Varsayılan QoS 0
    };

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, subscribeOptions, (error) => {
        if (error) {
          logger.error(`MQTT subscribe hatası: ${topic}`, error);
          reject(error);
        } else {
          this.subscriptions.add(topic); // Abone olunan konuları kaydet
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
      logger.warn('MQTT abonelikten çıkma başarısız: Bağlantı yok.');
      return;
    }

    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          logger.error(`MQTT unsubscribe hatası: ${topic}`, error);
          reject(error);
        } else {
          this.subscriptions.delete(topic); // Abonelikten çıkarılanı listeden sil
          logger.info(`MQTT abonelikten çıkıldı: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Önceki abonelikleri yeniden yapar (yeniden bağlanınca)
   */
  async resubscribe() {
    for (const topic of this.subscriptions) {
      try {
        await this.subscribe(topic); // QoS 0 varsayılanıyla yeniden abone ol
        logger.info(`Yeniden abone olundu: ${topic}`);
      } catch (error) {
        logger.error(`Yeniden abonelik hatası: ${topic}`, error);
      }
    }
  }

  /**
   * Cihaz kontrolü için komut gönderir (MQTT üzerinden)
   * @param {string} deviceTopic - Cihazın kontrol topic'i (örn: 'cmnd/tasmota_sonoff/POWER')
   * @param {string|Object} command - Komut verisi (örn: 'ON', 'OFF', { "state": "ON" })
   * @param {Object} options - MQTT yayın seçenekleri
   */
  async sendDeviceCommand(deviceTopic, command, options = {}) {
    await this.publish(deviceTopic, command, options);
    logger.info(`Cihaz komutu MQTT üzerinden gönderildi: ${deviceTopic}`, command);
  }

  /**
   * Cihaz durumu sorgular (MQTT üzerinden)
   * @param {string} deviceTopic - Cihazın durumu sorgulama topic'i (örn: 'cmnd/tasmota_sonoff/STATUS')
   */
  async requestDeviceStatus(deviceTopic) {
    await this.publish(deviceTopic, ''); // Boş mesajla durum sorgulama
    logger.info(`Cihaz durumu MQTT üzerinden sorgulandı: ${deviceTopic}`);
  }

  /**
   * Bağlantıyı kapatır
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.publish('smart-home/status', 'offline', { retain: true }); // Offline durumunu yayınla
      this.client.end(); // Bağlantıyı kapat
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