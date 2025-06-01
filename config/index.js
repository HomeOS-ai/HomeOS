require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smarthome',
    dbName: process.env.DB_NAME || 'smarthome'
  },
  
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    clientId: process.env.MQTT_CLIENT_ID || 'smart-home-backend'
  },
  
  homeAssistant: {
    url: process.env.HOME_ASSISTANT_URL || 'http://localhost:8123',
    token: process.env.HOME_ASSISTANT_TOKEN || ''
  },
  
  llm: {
    provider: process.env.LLM_PROVIDER || 'deepseek',
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    }
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 dakika
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  }
};

// Gerekli konfigürasyonları kontrol et
const requiredConfigs = [
  'JWT_SECRET',
  'MONGODB_URI'
];

const missingConfigs = requiredConfigs.filter(key => !process.env[key]);

if (missingConfigs.length > 0 && config.server.nodeEnv === 'production') {
  console.error('Eksik konfigürasyonlar:', missingConfigs);
  process.exit(1);
}

module.exports = config;