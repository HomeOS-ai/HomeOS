const { Sequelize, DataTypes } = require('sequelize'); // DataTypes'ı da dahil et
const config = require('../config');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  config.mysql.database,
  config.mysql.username,
  config.mysql.password,
  {
    host: config.mysql.host,
    port: config.mysql.port,
    dialect: 'mysql',
    logging: (msg) => logger.debug(`[MySQL] ${msg}`),
    pool: config.mysql.pool
  }
);

// Modelleri tanımlama veya dahil etme
// Modelleri import ederken sequelize ve DataTypes'ı argüman olarak geçiriyoruz
const Command = require('../models/commandModel')(sequelize, DataTypes);
const Device = require('../models/deviceModel')(sequelize, DataTypes);
const User = require('../models/userModel')(sequelize, DataTypes);

// Model İlişkilerini Tanımlama
// Bir kullanıcının birden fazla komutu olabilir (One-to-Many)
User.hasMany(Command, {
  foreignKey: 'userId', // Command tablosundaki foreign key
  as: 'commands' // İlişkiye verilen isim (opsiyonel)
});
Command.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Bir cihazın birden fazla komutu olabilir (One-to-Many)
Device.hasMany(Command, {
  foreignKey: 'deviceId', // Command tablosundaki foreign key
  as: 'commands'
});
Command.belongsTo(Device, {
  foreignKey: 'deviceId',
  as: 'device'
});

// Bir kullanıcının birden fazla cihazı olabilir (One-to-Many)
User.hasMany(Device, {
  foreignKey: 'ownerId', // Device tablosundaki foreign key
  as: 'ownedDevices'
});
Device.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    logger.info('MySQL veritabanı bağlantısı başarıyla kuruldu.');

    // !!! DİKKAT: 'alter: true' tabloları günceller ancak veri kaybına yol açabilir.
    // !!! Üretim ortamında dikkatli kullanılmalı, genellikle migrasyonlar tercih edilir.
    // Geliştirme aşamasında tabloları otomatik oluşturmak/güncellemek için kullanılabilir.
    await sequelize.sync({ alter: true });
    logger.info('Veritabanı modelleri senkronize edildi (tablolar oluşturuldu/güncellendi).');

  } catch (error) {
    logger.error('MySQL veritabanı bağlantı hatası ve/veya senkronizasyon hatası:', error);
    process.exit(1);
  }
}

// Sequelize instance'ını, bağlantı fonksiyonunu ve modelleri dışa aktar
module.exports = {
  sequelize,
  connectDB,
  // Modelleri de dışa aktar ki app.js veya başka modüller kullanabilsin
  models: {
    Command,
    Device,
    User
  }
};