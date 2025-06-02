const express = require('express');
const cors = require('cors');
const config = require('./config');
const { connectDB, models } = require('./database/connection'); // connectDB ve modelleri dahil et

// Servis modüllerini dahil et (JWTService ve MQTTClient burada direkt kullanılmıyor, rotalar ve servisler kullanıyor)
const HomeAssistantAdapter = require('./services/haAdapter');
const LLMEngine = require('./services/llmEngine');
const MQTTClient = require('./services/mqttClient'); // Sadece init için

// Utils modüllerini dahil et
const logger = require('./utils/logger');
const { apiResponse } = require('./utils/helpers');

// Rota modüllerini dahil et
const devicesRoutes = require('./routes/devices'); // Cihaz rotaları
const authRoutes = require('./routes/auth');       // Kimlik doğrulama rotaları
const llmRoutes = require('./routes/llm');         // LLM rotaları

const app = express();
const port = config.port;

// Middleware'ler
app.use(express.json()); // Gelen JSON isteklerini ayrıştırma
app.use(cors());         // CORS'u etkinleştir

// Logging middleware
app.use((req, res, next) => {
  logger.info(`[HTTP] ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

// Ana sayfa rotası
app.get('/', (req, res) => {
  res.send('Akıllı Ev Sistemi Backend API\'sine Hoş Geldiniz! \nFlutter uygulamanız buradan cihaz kontrolü ve LLM ile etkileşim kuracak.');
});

// Rota Yönlendirmeleri (API prefix'leri ile)
app.use('/api/devices', devicesRoutes); // /api/devices ile başlayan istekleri devicesRoutes'a yönlendir
app.use('/api/auth', authRoutes);       // /api/auth ile başlayan istekleri authRoutes'a yönlendir
app.use('/api/llm', llmRoutes);         // /api/llm ile başlayan istekleri llmRoutes'a yönlendir


// Sunucuyu belirtilen portta dinlemeye başla
app.listen(port, '0.0.0.0', async () => {
  logger.info(`Akıllı Ev Backend sunucusu http://localhost:${port} adresinde çalışıyor`);
  
  // Veritabanı bağlantısını kur
  await connectDB(); // Burada DB'ye bağlanacak ve modelleri senkronize edecek
  
  logger.info('--- Kullanılabilir API\'ler ---');
  logger.info(`- POST /api/auth/register (Kullanıcı kaydı)`);
  logger.info(`- POST /api/auth/login (Kullanıcı girişi)`);
  logger.info(`- GET /api/devices (Home Assistant'tan tüm cihazları listeler)`);
  logger.info(`- POST /api/devices/:entity_id/:action (Home Assistant üzerinden cihaz kontrolü)`);
  logger.info(`- POST /api/llm/chat (LLM ile sohbet)`);
  logger.info('------------------------------');

  // MQTT Client'ı başlat (uygulama başladığında)
  // MQTTClient.connect().catch(err => logger.error('MQTT başlatılamadı:', err));
  
  // Home Assistant bağlantısını test et (uygulama başladığında)
  HomeAssistantAdapter.testConnection().then(connected => {
    if (!connected) {
      logger.warn('Home Assistant bağlantısı başlangıçta başarısız oldu. HA bilgilerinizi kontrol edin.');
    }
  }).catch(err => {
    logger.error('Home Assistant bağlantı testi sırasında hata:', err.message);
  });
});