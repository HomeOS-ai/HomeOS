// backend/services/llmEngine.js
const axios = require('axios');
const config = require('../config/index.js'); // config yolunu kontrol et
const logger = require('../utils/logger');

class LLMEngine {
  constructor() {
    this.providers = {
      // TinyLlama için 'local' sağlayıcıyı tanımlıyoruz
      local: {
        baseURL: config.llmChatbot.localLlmUrl,
        model: config.llmChatbot.localLlmModel,
        apiKey: null // Yerel LLM için API anahtarı genellikle gerekmez
      }
      // DeepSeek ve OpenAI gibi diğer sağlayıcılar buradan kaldırıldı
    };

    this.currentProvider = config.llmChatbot.provider; // config'den 'local' gelmeli
    this.maxTokens = config.llmChatbot.maxTokens;
    this.temperature = config.llmChatbot.temperature;

    this.initializeClient();
  }

  /**
   * HTTP client'ı başlatır
   */
  initializeClient() {
    const provider = this.providers[this.currentProvider];

    if (!provider) {
      throw new Error(`Desteklenmeyen LLM provider: ${this.currentProvider}`);
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    this.apiClient = axios.create({
      baseURL: provider.baseURL,
      timeout: 60000, // LLM yanıtları uzun sürebilir, timeout'u artırdık
      headers
    });

    logger.info(`LLM Engine başlatıldı: ${this.currentProvider} (Model: ${provider.model})`);
  }

  /**
   * Doğal dil komutunu cihaz kontrolüne çevirir
   * @param {string} userInput - Kullanıcı girdisi
   * @param {Array} availableDevices - Mevcut cihazlar
   * @returns {Object} Komut objesi
   */
  async parseNaturalLanguageCommand(userInput, availableDevices = []) {
    const systemPrompt = this.createSmartHomeSystemPrompt(availableDevices);

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userInput
      }
    ];

    try {
      // generateCompletion metodu Ollama'nın /api/generate endpoint'ini çağıracak şekilde güncellendi
      const response = await this.generateCompletion(messages);
      const parsedCommand = this.parseCommandResponse(response); // LLM'den gelen metin yanıtını parse et

      logger.info('Doğal dil komutu işlendi:', { userInput, parsedCommand });
      return parsedCommand;
    } catch (error) {
      logger.error('Doğal dil komutu işlenemedi:', error.response?.data || error.message);
      throw new Error('Komut anlaşılamadı, lütfen daha açık bir şekilde belirtin');
    }
  }

  /**
   * LLM'den completion alır (Ollama /api/generate endpoint'ine uyumlu)
   * @param {Array} messages - Mesaj dizisi (sadece son mesajı prompt olarak kullanır)
   * @param {Object} options - İsteğe bağlı parametreler
   * @returns {string} LLM yanıtı (metin olarak)
   */
  async generateCompletion(messages, options = {}) {
    const provider = this.providers[this.currentProvider];

    if (!provider) {
      throw new Error(`Geçerli LLM sağlayıcısı yok: ${this.currentProvider}`);
    }

    const requestData = {
      model: provider.model,
      prompt: messages[messages.length - 1].content, // Son mesajı prompt olarak gönder
      stream: false, // stream özelliği kapatıldı
      options: { // Ollama'nın 'options' alanına parametreleri ekle
        temperature: options.temperature || this.temperature,
        num_predict: options.maxTokens || this.maxTokens, // max_tokens yerine num_predict
      }
    };

    try {
      // Ollama'nın /api/generate endpoint'ini çağırıyoruz
      const response = await this.apiClient.post('/api/generate', requestData);

      if (response.data && response.data.response) {
        return response.data.response.trim(); // Ollama'dan gelen 'response' alanını döndür
      } else {
        throw new Error('LLM yanıtı alınamadı veya formatı beklenenden farklı.');
      }
    } catch (error) {
      logger.error('LLM API hatası (Ollama):', error.response?.data || error.message);
      throw new Error('Yapay zeka servisi şu anda kullanılamıyor');
    }
  }

  /**
   * Akıllı ev sistemi için sistem promptu oluşturur
   * @param {Array} devices - Mevcut cihazlar
   * @returns {string} Sistem promptu
   */
  createSmartHomeSystemPrompt(devices) {
    const deviceList = devices.map(device =>
      `- ${device.name} (${device.type}): ID=${device.id}, Durum=${device.status}`
    ).join('\n');

    return `Sen bir akıllı ev asistanısın. Kullanıcının doğal dil komutlarını cihaz kontrol komutlarına çeviriyorsun.

MEVCUT CİHAZLAR:
${deviceList || 'Henüz kayıtlı cihaz yok'}

GÖREVİN:
1. Kullanıcının istediği aksiyonu anla
2. Hangi cihaz(lar)ın etkileneceğini belirle
3. JSON formatında komut üret

ÇIKTI FORMATI (sadece JSON döndür):
{
  "action": "control|status|scene",
  "devices": [
    {
      "id": "device_id",
      "command": "on|off|toggle|set",
      "parameters": {
        "brightness": 80,
        "color": "blue",
        "temperature": 22
      }
    }
  ],
  "scene": "scene_name",
  "success": true,
  "message": "Açıklama mesajı"
}

KURALLAR:
- Sadece mevcut cihazları kullan
- Belirsiz komutlarda kullanıcıdan açıklama iste
- Her zaman JSON formatında yanıt ver
- Türkçe açıklama mesajları kullan`;
  }

  /**
   * LLM yanıtını komut objesine çevirir (Ollama'dan metin yanıtı bekler)
   * @param {string} response - LLM yanıtı (metin olarak)
   * @returns {Object} Komut objesi
   */
  parseCommandResponse(response) {
    try {
      // Yanıtın içinde JSON arar
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM yanıtında JSON formatında bir komut bulunamadı.');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.action) {
        throw new Error('LLM yanıtında aksiyon belirtilmemiş.');
      }

      return {
        action: parsed.action,
        devices: parsed.devices || [],
        scene: parsed.scene || null,
        parameters: parsed.parameters || {},
        success: parsed.success !== false,
        message: parsed.message || 'Komut işlendi'
      };
    } catch (error) {
      logger.error('LLM yanıtı parse edilemedi:', error.message);
      return {
        action: 'error',
        devices: [],
        success: false,
        message: 'Komut anlaşılamadı veya parse edilemedi, lütfen daha açık bir şekilde belirtin.'
      };
    }
  }

  // Diğer yardımcı metodlar aynı kalır

  /**
   * Provider değiştirir
   * @param {string} provider - Yeni provider adı
   */
  switchProvider(provider) {
    if (!this.providers[provider]) {
      throw new Error(`Desteklenmeyen provider: ${provider}`);
    }
    this.currentProvider = provider;
    this.initializeClient();
    logger.info(`LLM provider değiştirildi: ${provider}`);
  }

  /**
   * Mevcut provider'ı döner
   * @returns {string} Aktif provider
   */
  getCurrentProvider() {
    return this.currentProvider;
  }

  /**
   * LLM parametrelerini günceller
   * @param {Object} params - Yeni parametreler
   */
  updateParameters(params) {
    if (params.maxTokens) this.maxTokens = params.maxTokens;
    if (params.temperature) this.temperature = params.temperature;
    logger.info('LLM parametreleri güncellendi:', params);
  }

  /**
   * Provider durumunu kontrol eder
   * @param {string} provider - Kontrol edilecek provider
   * @returns {boolean} Provider kullanılabilir mi?
   */
  async testProvider(provider = this.currentProvider) {
    const originalProvider = this.currentProvider;

    try {
      if (provider !== this.currentProvider) {
        this.switchProvider(provider);
      }

      const testMessages = [
        {
          role: 'user',
          content: 'Test mesajı - sadece "OK" yanıtı ver'
        }
      ];

      // generateCompletion Ollama generate API'sine göre ayarlandı
      await this.generateCompletion(testMessages, { maxTokens: 10 });
      return true;
    } catch (error) {
      logger.error(`Provider test başarısız (${provider}):`, error.response?.data || error.message);
      return false;
    } finally {
      if (provider !== originalProvider) {
        this.switchProvider(originalProvider);
      }
    }
  }

  /**
   * Desteklenen provider'ları listeler
   * @returns {Array} Provider listesi
   */
  getSupportedProviders() {
    return Object.keys(this.providers);
  }

  /**
   * LLM istatistiklerini döner
   * @returns {Object} Kullanım istatistikleri
   */
  getStats() {
    return {
      currentProvider: this.currentProvider,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      supportedProviders: this.getSupportedProviders()
    };
  }
}

module.exports = new LLMEngine();
