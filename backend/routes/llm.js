const express = require('express');
const router = express.Router();
const LLMEngine = require('../services/llmEngine'); // LLM servis modülümüz
const { apiResponse } = require('../utils/helpers'); // apiResponse yardımcı fonksiyonumuz
const logger = require('../utils/logger'); // logger modülümüz

// LLM Chatbot Rotası
router.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    logger.info(`LLM Chat isteği alındı: "${userMessage}"`);

    if (!userMessage) {
        return res.status(400).json(apiResponse.error('Mesaj boş olamaz.', 'EMPTY_MESSAGE'));
    }

    try {
        // LLMEngine'ın parseNaturalLanguageCommand metodu, komutu ayrıştırabilir
        const llmResponse = await LLMEngine.parseNaturalLanguageCommand(userMessage, []); // Cihaz listesi henüz geçilmiyor
        
        res.json(apiResponse.success({
            response: llmResponse.message || llmResponse.response, // LLM'den gelen yanıta göre
            parsedCommand: llmResponse // LLM'den dönen komut yapısı
        }, 'LLM yanıtı başarılı.'));
    } catch (error) {
        logger.error('LLM servisine bağlanırken hata:', error.message);
        res.status(500).json(apiResponse.error('LLM servisine ulaşılamıyor veya hata döndü.', 'LLM_SERVICE_ERROR', error.message));
    }
});

module.exports = router;