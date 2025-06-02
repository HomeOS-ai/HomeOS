const express = require('express');
const router = express.Router(); // Yeni bir Router instance'ı oluştur
const HomeAssistantAdapter = require('../services/haAdapter'); // HA servis modülümüz
const { apiResponse } = require('../utils/helpers'); // apiResponse yardımcı fonksiyonumuz
const logger = require('../utils/logger'); // logger modülümüz

// JWT doğrulama middleware'ı (burada da dahil edebiliriz, app.js'ten de alabiliriz)
// const authenticateToken = require('../middleware/authMiddleware'); // Eğer middleware klasörü oluşturursak

// [GET] /api/devices
// Tüm akıllı cihazları ve durumlarını almak için
router.get('/', async (req, res) => {
  logger.info('GET /api/devices isteği alındı (HA).');
  try {
    const devices = await HomeAssistantAdapter.getDevices();
    res.json(apiResponse.success(devices));
  } catch (error) {
    logger.error('Cihazları çekerken hata oluştu:', error.message);
    res.status(500).json(apiResponse.error('Cihazlar alınamadı.', 'HA_DEVICE_FETCH_ERROR', error.message));
  }
});

// [POST] /api/devices/:entity_id/:action
// Belirli bir cihazın durumunu değiştirmek veya bir servis çağırmak için
router.post('/:entity_id/:action', async (req, res) => {
  const entityId = req.params.entity_id;
  const action = req.params.action;
  const data = req.body;

  logger.info(`POST /api/devices/<span class="math-inline">\{entityId\}/</span>{action} isteği alındı. Veri:`, data);

  const [domain, _] = entityId.split('.'); // entity_id'den domaini al

  try {
    const haResponse = await HomeAssistantAdapter.callService(domain, action, { entity_id: entityId, ...data });
    res.json(apiResponse.success({
      message: `Komut '<span class="math-inline">\{action\}' '</span>{entityId}' cihazına başarıyla gönderildi.`,
      entityId: entityId,
      action: action,
      dataSent: data,
      haResponse: haResponse
    }, 'Cihaz komutu başarılı.'));
  } catch (error) {
    logger.error(`Cihaz '${entityId}' kontrol edilirken hata oluştu:`, error.message);
    res.status(500).json(apiResponse.error('Cihaz kontrol edilemedi.', 'HA_DEVICE_CONTROL_ERROR', error.message));
  }
});

module.exports = router;