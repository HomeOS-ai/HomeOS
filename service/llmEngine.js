const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class LLMEngine {
  constructor() {
    this.providers = {
      deepseek: {
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        apiKey: config.DEEPSEEK_API_KEY
      },
      openai: {
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        apiKey: config.OPENAI_API_KEY
      },
      local: {
        baseURL: config.LOCAL_LLM_URL || 'http://localhost:11434/v1',
        model: 'llama2',
        apiKey: null
      }
    };

    this.currentProvider = config.LLM_PROVIDER || 'deepseek';
    this.maxTokens = config.LLM_MAX_TOKENS || 1000;
    this.temperature = config.LLM_TEMPERATURE || 0.7;

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
      timeout: 30000,
      headers
    });

    logger.info(`LLM Engine başlatıldı: ${this.currentProvider}`);
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
      const response = await this.generateCompletion(messages);
      const parsedCommand = this.parseCommandResponse(response);
      
      logger.info('Doğal dil komutu işlendi:', { userInput, parsedCommand });
      return parsedCommand;
    } catch (error) {
      logger.error('Doğal dil komutu işlenemedi:', error.message);
      throw new Error('Komut anlaşılamadı, lütfen daha açık bir şekilde belirtin');
    }
  }

  /**
   * LLM'den completion alır
   * @param {Array} messages - Mesaj dizisi
   * @param {Object} options - İsteğe bağlı parametreler
   * @returns {string} LLM yanıtı
   */
  async generateCompletion(messages, options = {}) {
    const provider = this.providers[this.currentProvider];
    
    const requestData = {
      model: provider.model,
      messages,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature || this.temperature,
      stream: false
    };

    try {
      const response = await this.apiClient.post('/chat/completions', requestData);
      
      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new Error('LLM yanıtı alınamadı');
      }
    } catch (error) {
      logger.error('LLM API hatası:', error.response?.data || error.message);
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
   * LLM yanıtını komut objesine çevirir
   * @param {string} response - LLM yanıtı
   * @returns {Object} Komut objesi
   */
  parseCommandResponse(response) {
    try {
      // JSON'u çıkarmaya çalış
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON formatında yanıt bulunamadı');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Gerekli alanları kontrol et
      if (!parsed.action) {
        throw new Error('Aksiyon belirtilmemiş');
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
      logger.error('Komut yanıtı parse edilemedi:', error.message);
      return {
        action: 'error',
        devices: [],
        success: false,
        message: 'Komut anlaşılamadı, lütfen daha açık bir şekilde belirtin'
      };
    }
  }

  /**
   * Cihaz önerisi yapar
   * @param {string} query - Kullanıcı sorgusu
   * @param {Array} devices - Mevcut cihazlar
   * @returns {Array} Önerilen cihazlar
   */
  async suggestDevices(query, devices) {
    const systemPrompt = `Sen bir akıllı ev asistanısın. Kullanıcının sorgusuna göre en uygun cihazları öner.

MEVCUT CİHAZLAR:
${devices.map(d => `- ${d.name} (${d.type}): ${d.description || ''}`).join('\n')}

Kullanıcı sorgusu: "${query}"

Sadece JSON formatında önerileri döndür:
{
  "suggestions": [
    {
      "id": "device_id",
      "name": "device_name",
      "reason": "öneri sebebi"
    }
  ]
}`;

    try {
      const response = await this.generateCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]);

      const parsed = JSON.parse(response);
      return parsed.suggestions || [];
    } catch (error) {
      logger.error('Cihaz önerisi oluşturulamadı:', error.message);
      return [];
    }
  }

  /**
   * Akıllı sahne önerisi yapar
   * @param {string} context - Bağlam (zaman, durum vs.)
   * @param {Array} devices - Mevcut cihazlar
   * @returns {Object} Sahne önerisi
   */
  async suggestScene(context, devices) {
    const systemPrompt = `Sen bir akıllı ev asistanısın. Verilen bağlama göre akıllı sahne önerisi yap.

MEVCUT CİHAZLAR:
${devices.map(d => `- ${d.name} (${d.type})`).join('\n')}

BAĞLAM: ${context}

Sahne önerisi JSON formatında:
{
  "scene_name": "sahne adı",
  "description": "sahne açıklaması",
  "actions": [
    {
      "device_id": "cihaz_id",
      "action": "on|off|set",
      "parameters": {}
    }
  ],
  "triggers": ["tetikleyici koşullar"]
}`;

    try {
      const response = await this.generateCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('Sahne önerisi oluşturulamadı:', error.message);
      return null;
    }
  }

  /**
   * Kullanıcı tercihlerini öğrenir
   * @param {Array} userHistory - Kullanıcı geçmişi
   * @returns {Object} Tercih analizi
   */
  async analyzeUserPreferences(userHistory) {
    const systemPrompt = `Kullanıcının akıllı ev kullanım geçmişini analiz et ve tercihlerini çıkar.

KULLANIM GEÇMİŞİ:
${userHistory.map(h => `- ${h.timestamp}: ${h.command} -> ${h.result}`).join('\n')}

Analiz sonucunu JSON formatında döndür:
{
  "preferences": {
    "favorite_devices": ["cihaz_listesi"],
    "usage_patterns": ["kullanım_desenleri"],
    "time_preferences": {},
    "automation_suggestions": ["otomasyon_önerileri"]
  },
  "insights": "genel değerlendirme"
}`;

    try {
      const response = await this.generateCompletion([
        { role: 'system', content: systemPrompt }
      ], { maxTokens: 1500 });

      return JSON.parse(response);
    } catch (error) {
      logger.error('Kullanıcı tercihleri analiz edilemedi:', error.message);
      return { preferences: {}, insights: '' };
    }
  }

  /**
   * Hata durumunda yardımcı öneriler sunar
   * @param {string} error - Hata mesajı
   * @param {string} originalCommand - Orijinal komut
   * @returns {Object} Öneriler
   */
  async suggestAlternatives(error, originalCommand) {
    const systemPrompt = `Akıllı ev komutunda hata oluştu. Kullanıcıya alternatif çözümler öner.

HATA: ${error}
ORİJİNAL KOMUT: ${originalCommand}

JSON formatında öneriler:
{
  "alternatives": [
    {
      "suggestion": "önerilen komut",
      "explanation": "açıklama"
    }
  ],
  "help_message": "yardım mesajı"
}`;

    try {
      const response = await this.generateCompletion([
        { role: 'system', content: systemPrompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('Alternatif öneriler oluşturulamadı:', error.message);
      return {
        alternatives: [],
        help_message: 'Komutunuzu daha açık bir şekilde belirtmeyi deneyin.'
      };
    }
  }

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

      await this.generateCompletion(testMessages, { maxTokens: 10 });
      return true;
    } catch (error) {
      logger.error(`Provider test başarısız (${provider}):`, error.message);
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