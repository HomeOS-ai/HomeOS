const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class HomeAssistantAdapter {
  constructor() {
    this.baseURL = config.HA_BASE_URL || 'http://localhost:8123';
    this.token = config.HA_TOKEN;
    this.apiClient = null;
    this.isConnected = false;
    
    this.initializeClient();
  }

  /**
   * HTTP client'ı başlatır
   */
  initializeClient() {
    this.apiClient = axios.create({
      baseURL: `${this.baseURL}/api`,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug(`HA API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('HA API Request hatası:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.debug(`HA API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('HA API Response hatası:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Home Assistant bağlantısını test eder
   * @returns {boolean} Bağlantı durumu
   */
  async testConnection() {
    try {
      const response = await this.apiClient.get('/');
      this.isConnected = response.status === 200;
      logger.info('Home Assistant bağlantısı başarılı');
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error('Home Assistant bağlantı hatası:', error.message);
      return false;
    }
  }

  /**
   * Tüm entity'leri getirir
   * @returns {Array} Entity listesi
   */
  async getStates() {
    try {
      const response = await this.apiClient.get('/states');
      return response.data;
    } catch (error) {
      logger.error('Entity listesi alınamadı:', error.message);
      throw new Error('Home Assistant entity listesi alınamadı');
    }
  }

  /**
   * Belirli bir entity'nin durumunu getirir
   * @param {string} entityId - Entity ID (örn: light.living_room)
   * @returns {Object} Entity durumu
   */
  async getState(entityId) {
    try {
      const response = await this.apiClient.get(`/states/${entityId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Entity bulunamadı: ${entityId}`);
      }
      logger.error(`Entity durumu alınamadı (${entityId}):`, error.message);
      throw new Error(`Entity durumu alınamadı: ${entityId}`);
    }
  }

  /**
   * Entity durumunu günceller
   * @param {string} entityId - Entity ID
   * @param {string} state - Yeni durum
   * @param {Object} attributes - İlave özellikler
   */
  async setState(entityId, state, attributes = {}) {
    try {
      const data = {
        state,
        attributes
      };
      
      const response = await this.apiClient.post(`/states/${entityId}`, data);
      logger.info(`Entity durumu güncellendi: ${entityId} -> ${state}`);
      return response.data;
    } catch (error) {
      logger.error(`Entity durumu güncellenemedi (${entityId}):`, error.message);
      throw new Error(`Entity durumu güncellenemedi: ${entityId}`);
    }
  }

  /**
   * Servis çağırır (ana kontrol metodu)
   * @param {string} domain - Servis alanı (örn: light, switch)
   * @param {string} service - Servis adı (örn: turn_on, turn_off)
   * @param {Object} serviceData - Servis parametreleri
   */
  async callService(domain, service, serviceData = {}) {
    try {
      const data = {
        ...serviceData
      };

      const response = await this.apiClient.post(`/services/${domain}/${service}`, data);
      logger.info(`Servis çağrıldı: ${domain}.${service}`, serviceData);
      return response.data;
    } catch (error) {
      logger.error(`Servis çağrısı başarısız (${domain}.${service}):`, error.message);
      throw new Error(`Servis çağrısı başarısız: ${domain}.${service}`);
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
      const allStates = await this.getStates();
      return allStates.filter(entity => entity.entity_id.startsWith(`${domain}.`));
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

module.exports = new HomeAssistantAdapter();