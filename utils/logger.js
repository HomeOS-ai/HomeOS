const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Logs dizinini oluştur
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format oluştur
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Logger oluştur
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: { service: 'smart-home-backend' },
  transports: [
    // Dosyaya yazma
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Hata logları için ayrı dosya
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Development ortamında console'a da yazdır
if (config.server.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// HTTP request logger için middleware
logger.httpLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

// MQTT logger
logger.mqtt = {
  connected: (brokerUrl) => logger.info(`MQTT Connected to ${brokerUrl}`),
  disconnected: () => logger.warn('MQTT Disconnected'),
  error: (error) => logger.error('MQTT Error:', error),
  message: (topic, message) => logger.debug(`MQTT Message - Topic: ${topic}, Message: ${message}`),
  published: (topic, message) => logger.debug(`MQTT Published - Topic: ${topic}, Message: ${message}`)
};

// Device logger
logger.device = {
  added: (deviceId, deviceName) => logger.info(`Device added: ${deviceName} (${deviceId})`),
  removed: (deviceId, deviceName) => logger.info(`Device removed: ${deviceName} (${deviceId})`),
  updated: (deviceId, deviceName) => logger.info(`Device updated: ${deviceName} (${deviceId})`),
  commandExecuted: (deviceId, command) => logger.info(`Command executed on device ${deviceId}: ${command}`),
  statusChanged: (deviceId, oldStatus, newStatus) => logger.info(`Device ${deviceId} status changed: ${oldStatus} -> ${newStatus}`)
};

// Authentication logger
logger.auth = {
  login: (userId, ip) => logger.info(`User login: ${userId} from ${ip}`),
  loginFailed: (email, ip) => logger.warn(`Failed login attempt: ${email} from ${ip}`),
  register: (userId, email) => logger.info(`User registered: ${email} (${userId})`),
  tokenExpired: (userId) => logger.warn(`Token expired for user: ${userId}`),
  unauthorized: (ip, endpoint) => logger.warn(`Unauthorized access attempt from ${ip} to ${endpoint}`)
};

module.exports = logger;