// backend/services/haAdapter.js
const axios = require('axios');
const config = require('../config/index.js'); // config yolunu kontrol et
const logger = require('../utils/logger'); // logger modülümüz

// Home Assistant bilgileri gelene kadar simülasyon modunu aktif edelim
// Eğer config'den geçerli bir token gelmezse simülasyon aktif olur
const IS_SIMULATION_MODE = !config.homeAssistant.token || config.homeAssistant.token === 'YOUR_HA_TOKEN_HERE_UNTIL_REAL_ONE_AVAILABLE';

const haAxios = axios.create({
  baseURL: config.homeAssistant.baseUrl + '/api', // Base URL'ye /api ekliyoruz
  timeout: 10000, // Timeout ekleyelim, bağlantı kuramazsa sonsuza kadar beklemesin
  headers: {
    'Authorization': `Bearer ${config.homeAssistant.token}`,
    'Content-Type': 'application/json',
  },
});

// Axios interceptor'ları (loglama ve hata yönetimi için)
haAxios.interceptors.request.use(
  (config) => {
    logger.debug(`[HA API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('[HA API Request Error]:', error.message);
    return Promise.reject(error);
  }
);

haAxios.interceptors.response.use(
  (response) => {
    logger.debug(`[HA API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    logger.error('[HA API Response Error]:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

class HomeAssistantAdapter {
  constructor() {
    this.isConnected = false; // Bağlantı durumu
    // Bağlantıyı hemen denemek için initializeClient() burada çağrılmaz, testConnection() kullanılır
  }

  /**
   * Home Assistant bağlantısını test eder
   * @returns {boolean} Bağlantı durumu
   */
  async testConnection() {
    if (IS_SIMULATION_MODE) {
      logger.info('HomeAssistantAdapter: Bağlantı testi simülasyon modunda başarılı kabul edildi.');
      this.isConnected = true;
      return true;
    }
    try {
      const response = await haAxios.get('/config'); // /api/config endpoint'i genel konfigürasyonu verir
      this.isConnected = response.status === 200;
      logger.info('Home Assistant bağlantısı başarılı.');
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error('Home Assistant bağlantı hatası:', error.message);
      return false;
    }
  }

  /**
   * Tüm entity'leri getirir (HA states API'si)
   * @returns {Array} Entity listesi
   */
  async getDevices() {
    if (IS_SIMULATION_MODE) {
      logger.info('HomeAssistantAdapter: Cihaz listesi simülasyon modundan dönülüyor.');
      // Simüle edilmiş cihaz listesi (HA'dan gelen entity formatına daha yakın)
      return [
        { entity_id: 'light.salon_lambasi', attributes: { friendly_name: 'Salon Lambası', brightness: 0 }, state: 'off' },
        { entity_id: 'switch.mutfak_prizi', attributes: { friendly_name: 'Mutfak Prizi' }, state: 'on' },
        { entity_id: 'climate.buzdolabi', attributes: { friendly_name: 'Buzdolabı', temperature: 4 }, state: 'cool' }
      ].map(entity => ({ // Flutter'ın beklediği daha basit formata dönüştür
          id: entity.entity_id,
          name: entity.attributes.friendly_name || entity.entity_id,
          type: entity.entity_id.split('.')[0],
          state: entity.state,
          brightness: entity.attributes.brightness || undefined,
          temperature: entity.attributes.temperature || undefined,
          // ... diğer özellikler
      }));
    }
    try {
      const response = await haAxios.get('/states'); // Home Assistant'tan tüm entity durumlarını çek
      // Flutter için daha anlamlı bir formatta filtreleyip dönüştürelim
      return response.data.map(entity => ({
        id: entity.entity_id,
        name: entity.attributes.friendly_name || entity.entity_id,
        type: entity.entity_id.split('.')[0], // light, switch, climate vb.
        state: entity.state,
        brightness: entity.attributes.brightness || undefined,
        temperature: entity.attributes.temperature || undefined,
        // ... daha fazla özellik
      }));
    } catch (error) {
      logger.error('Home Assistant\'tan gerçek cihazları çekerken hata oluştu:', error.message);
      throw new Error('HA cihazları alınamadı. Hata: ' + error.message);
    }
  }

  /**
   * Servis çağırır (HA services API'si)
   * @param {string} domain - Servis alanı (örn: light, switch)
   * @param {string} service - Servis adı (örn: turn_on, turn_off)
   * @param {Object} serviceData - Servis parametreleri
   */
  async callService(domain, service, serviceData = {}) {
    if (IS_SIMULATION_MODE) {
      logger.info(`HomeAssistantAdapter: Servis çağrısı '${domain}.${service}' - '${serviceData.entity_id}' simüle ediliyor.`);
      return { message: `Komut '${service}' '${serviceData.entity_id}' cihazına gönderildi (simule edildi).` };
    }
    try {
      const response = await haAxios.post(`/services/${domain}/${service}`, serviceData);
      logger.info(`Servis çağrıldı: ${domain}.${service}`, serviceData);
      return response.data;
    } catch (error) {
      logger.error(`HA servis çağrılırken hata: ${domain}.${service} - ${serviceData.entity_id}`, error.message);
      throw new Error(`HA servisi çağrılamadı. Hata: ${error.message}`);
    }
  }

  /**
   * Işık kontrolü
   */
  async lightControl(entityId, action, options = {}) {
    const domain = 'light';
    const serviceData = { entity_id: entityId, ...options };

    switch (action) {
      case 'on':
        return await this.callService(domain, 'turn_on', serviceData);
      case 'off':
        return await this.callService(domain, 'turn_off', serviceData);
      case 'toggle':
        return await this.callService(domain, 'toggle', serviceData);
      default:
        throw new Error(`Geçersiz ışık aksiyonu: ${action}`);
    }
  }

  /**
   * Anahtar kontrolü
   */
  async switchControl(entityId, action) {
    const domain = 'switch';
    const serviceData = { entity_id: entityId };

    switch (action) {
      case 'on':
        return await this.callService(domain, 'turn_on', serviceData);
      case 'off':
        return await this.callService(domain, 'turn_off', serviceData);
      case 'toggle':
        return await this.callService(domain, 'toggle', serviceData);
      default:
        throw new Error(`Geçersiz anahtar aksiyonu: ${action}`);
    }
  }

  /**
   * Klima kontrolü
   */
  async climateControl(entityId, options = {}) {
    const domain = 'climate';
    const serviceData = { entity_id: entityId, ...options };

    if (options.temperature) {
      return await this.callService(domain, 'set_temperature', serviceData);
    }
    if (options.hvac_mode) {
      return await this.callService(domain, 'set_hvac_mode', serviceData);
    }
    if (options.fan_mode) {
      return await this.callService(domain, 'set_fan_mode', serviceData);
    }

    throw new Error('Klima kontrolü için geçerli parametre belirtilmedi');
  }

  /**
   * Medya oynatıcı kontrolü
   */
  async mediaPlayerControl(entityId, action, options = {}) {
    const domain = 'media_player';
    const serviceData = { entity_id: entityId, ...options };

    const validActions = [
      'turn_on', 'turn_off', 'toggle', 'play_media',
      'media_play', 'media_pause', 'media_stop',
      'media_next_track', 'media_previous_track',
      'volume_up', 'volume_down', 'volume_mute'
    ];

    if (!validActions.includes(action)) {
      throw new Error(`Geçersiz medya oynatıcı aksiyonu: ${action}`);
    }

    return await this.callService(domain, action, serviceData);
  }

  /**
   * Sahne (scene) aktivasyonu
   */
  async activateScene(sceneId) {
    return await this.callService('scene', 'turn_on', { entity_id: sceneId });
  }

  /**
   * Otomasyon tetikleme
   */
  async triggerAutomation(automationId) {
    return await this.callService('automation', 'trigger', { entity_id: automationId });
  }

  /**
   * Belirli domain'deki tüm entity'leri getirir
   * @param {string} domain - Entity domain'i (light, switch, sensor, vs.)
   * @returns {Array} Domain'e ait entity'ler
   */
  async getEntitiesByDomain(domain) {
    try {
      const allStates = await this.getDevices(); // getStates yerine getDevices kullanıldı
      return allStates.filter(entity => entity.id.startsWith(`${domain}.`)); // entity.entity_id yerine entity.id
    } catch (error) {
      logger.error(`Domain entity'leri alınamadı (${domain}):`, error.message);
      throw error;
    }
  }

  /**
   * Event dinleyici başlatır
   * @param {string} eventType - Dinlenecek event tipi
   */
  async subscribeToEvents(eventType = null) {
    // WebSocket bağlantısı için gelişmiş implementasyon gerekli
    // Şimdilik HTTP polling ile basit çözüm
    logger.warn('Event subscription HTTP polling ile implement edilecek');
  }

  /**
   * Home Assistant konfigürasyonunu getirir
   */
  async getConfig() {
    try {
      const response = await this.apiClient.get('/config');
      return response.data;
    } catch (error) {
      logger.error('HA konfigürasyonu alınamadı:', error.message);
      throw new Error('Home Assistant konfigürasyonu alınamadı');
    }
  }

  /**
   * Hizmetlerin listesini getirir
   */
  async getServices() {
    try {
      const response = await this.apiClient.get('/services');
      return response.data;
    } catch (error) {
      logger.error('HA servisleri alınamadı:', error.message);
      throw new Error('Home Assistant servisleri alınamadı');
    }
  }

  /**
   * Bağlantı durumunu döner
   * @returns {boolean} Bağlantı durumu
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * API client'ı yeniden yapılandırır
   * @param {Object} newConfig - Yeni konfigürasyon
   */
  reconfigure(newConfig) {
    if (newConfig.baseURL) this.baseURL = newConfig.baseURL;
    if (newConfig.token) this.token = newConfig.token;

    this.initializeClient();
    logger.info('Home Assistant adapter yeniden yapılandırıldı');
  }
}

// ÖNEMLİ: Class'ın bir instance'ını dışa aktarıyoruz ki app.js direkt metodları çağırabilsin
module.exports = new HomeAssistantAdapter();
