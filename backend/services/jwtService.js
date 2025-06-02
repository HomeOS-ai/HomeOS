const jwt = require('jsonwebtoken');
const config = require('../config');

class JWTService {
  /**
   * JWT token oluşturur
   * @param {Object} payload - Token içeriği (user id, email vs.)
   * @param {string} expiresIn - Token süresi (örn: '24h', '7d')
   * @returns {string} JWT token
   */
  generateToken(payload, expiresIn = '24h') {
    try {
      return jwt.sign(payload, config.TOKEN_SECRET, {
        expiresIn,
        issuer: 'smart-home-system',
        audience: 'smart-home-users'
      });
    } catch (error) {
      throw new Error(`Token oluşturma hatası: ${error.message}`);
    }
  }

  /**
   * JWT token doğrular
   * @param {string} token - Doğrulanacak token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.TOKEN_SECRET, {
        issuer: 'smart-home-system',
        audience: 'smart-home-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token süresi dolmuş');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Geçersiz token');
      } else {
        throw new Error(`Token doğrulama hatası: ${error.message}`);
      }
    }
  }

  /**
   * Refresh token oluşturur
   * @param {Object} payload - Token içeriği
   * @returns {string} Refresh token
   */
  generateRefreshToken(payload) {
    return this.generateToken(payload, '7d');
  }

  /**
   * Token'dan kullanıcı bilgilerini çıkarır
   * @param {string} token - JWT token
   * @returns {Object} Kullanıcı bilgileri
   */
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      throw new Error(`Token decode hatası: ${error.message}`);
    }
  }

  /**
   * Token süresini kontrol eder
   * @param {string} token - Kontrol edilecek token
   * @returns {boolean} Token geçerli mi?
   */
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Token'dan kullanıcı ID'sini çıkarır
   * @param {string} token - JWT token
   * @returns {string} Kullanıcı ID
   */
  getUserIdFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
      return decoded.userId;
    } catch (error) {
      throw new Error('Token\'dan kullanıcı ID alınamadı');
    }
  }
}

module.exports = new JWTService();