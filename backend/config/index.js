// backend/config/index.js
require('dotenv').config(); // .env dosyasındaki ortam değişkenlerini yükler

module.exports = {
  // Sunucu portu
  port: process.env.PORT || 3000,

  // Home Assistant Ayarları
  homeAssistant: {
    baseUrl: process.env.HA_BASE_URL || 'http://localhost:8123', // HA'nın IP adresi ve portu
    token: process.env.HA_TOKEN || 'YOUR_HA_TOKEN_HERE_UNTIL_REAL_ONE_AVAILABLE', // HA uzun ömürlü erişim token'ı
  },

  // LLM Chatbot Ayarları
  llmChatbot: {
    provider: process.env.LLM_PROVIDER || 'deepseek', // Kullanılacak LLM sağlayıcısı (deepseek, openai, local)
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || 'YOUR_DEEPSEEK_API_KEY_HERE',
    openaiApiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE',
    localLlmUrl: process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1', // Yerel LLM için Ollama URL'si
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  },

  // MQTT Ayarları (Eğer mqttClient.js kullanılacaksa)
  mqtt: {
    host: process.env.MQTT_HOST || 'localhost',
    port: parseInt(process.env.MQTT_PORT || '1883', 10),
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
  },

  // JWT Ayarları (Kimlik Doğrulama için)
  jwt: {
    secret: process.env.JWT_SECRET || 'a_very_secret_jwt_key_for_now_change_this_in_production', // Üretim için çok güçlü bir anahtar kullan!
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },

  // MySQL Veritabanı Ayarları (YENİ EKLENDİ)
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'your_mysql_password', // BURAYI KENDİ MySQL ŞİFRENLE DEĞİŞTİR!
    database: process.env.MYSQL_DATABASE || 'smart_home_db',
    dialect: 'mysql',
    pool: { // Bağlantı havuzu ayarları
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};