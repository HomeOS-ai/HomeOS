const express = require('express');
const router = express.Router();
const { models } = require('../database/connection'); // Modelleri database bağlantısından al
const JWTService = require('../services/jwtService'); // JWT servisimiz
const { apiResponse } = require('../utils/helpers'); // apiResponse yardımcı fonksiyonumuz
const logger = require('../utils/logger'); // logger modülümüz

// Kullanıcı Kaydı Rotası
router.post('/register', async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  logger.info(`Kayıt isteği alındı: ${username}`);
  try {
    const newUser = await models.User.create({
      username,
      email,
      password, // User modelindeki hook sayesinde hashlenecek
      firstName,
      lastName
    });
    const token = JWTService.generateToken({ userId: newUser.id, username: newUser.username });
    return res.status(201).json(apiResponse.success({ userId: newUser.id, username: newUser.username, token }, 'Kayıt başarılı.'));
  } catch (error) {
    logger.error('Kayıt hatası:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(apiResponse.error('Bu kullanıcı adı veya e-posta zaten kullanılıyor.', 'DUPLICATE_ENTRY'));
    }
    return res.status(500).json(apiResponse.error('Kayıt yapılırken bir hata oluştu.', 'REGISTER_ERROR', error.message));
  }
});

// Kullanıcı Giriş Rotası
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  logger.info(`Giriş isteği alındı: ${username}`);
  try {
    const user = await models.User.findOne({ where: { username: username } });
    if (!user) {
      return res.status(401).json(apiResponse.error('Kullanıcı adı veya şifre yanlış', 'INVALID_CREDENTIALS'));
    }
    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      return res.status(401).json(apiResponse.error('Kullanıcı adı veya şifre yanlış', 'INVALID_CREDENTIALS'));
    }
    const token = JWTService.generateToken({ userId: user.id, username: user.username });
    await user.update({ lastLogin: new Date() });
    return res.json(apiResponse.success({ userId: user.id, username: user.username, token }, 'Giriş başarılı.'));
  } catch (error) {
    logger.error('Giriş hatası:', error);
    return res.status(500).json(apiResponse.error('Giriş yapılırken bir hata oluştu.', 'LOGIN_ERROR', error.message));
  }
});

module.exports = router;