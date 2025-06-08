// backend/models/commandModel.js
// Bu dosya, MySQL için Command modelini tanımlar.
module.exports = (sequelize, DataTypes) => {
  const Command = sequelize.define('Command', {
    id: { // Sequelize varsayılan olarak 'id' primary key'i oluşturur
      type: DataTypes.UUID, // UUID (Universally Unique Identifier)
      defaultValue: DataTypes.UUIDV4, // Sequelize'nin UUID üretmesini sağlar
      allowNull: false,
      primaryKey: true,
      unique: true
    },
    
    // Not: commandId yerine genellikle primary key olarak 'id' kullanılır.
    // Eğer 'commandId' adında özel bir kolon istiyorsak:
    commandUniqueId: {
      type: DataTypes.STRING(64), // Uzunluk ihtiyaca göre ayarlanabilir
      unique: true,
      allowNull: false,
      defaultValue: () => require('crypto').randomBytes(32).toString('hex') // Kendi randomId'niz
    },

    type: {
      type: DataTypes.ENUM('manual', 'ai', 'automation', 'scene', 'schedule'),
      allowNull: false
    },

    source: {
      type: DataTypes.ENUM('user', 'ai_assistant', 'automation', 'external_api', 'voice_command', 'mobile_app', 'web_app'),
      allowNull: false
    },

    // İlişkilendirmeler için foreign key'ler
    // Diğer modeller tanımlandığında burası aktif edilecek
    // deviceId: {
    //   type: DataTypes.UUID, // Device modelinin primary key'i UUID ise UUID
    //   references: {
    //     model: 'Devices', // Referenced table name
    //     key: 'id', // Referenced column name
    //   },
    //   allowNull: true // Veya false eğer komut her zaman bir cihaza bağlıysa
    // },
    // userId: {
    //   type: DataTypes.UUID, // User modelinin primary key'i UUID ise UUID
    //   references: {
    //     model: 'Users', // Referenced table name
    //     key: 'id',
    //   },
    //   allowNull: true // Veya false eğer komut her zaman bir kullanıcıya bağlıysa
    // },

    command: {
      type: DataTypes.TEXT, // MySQL 5.7+ veya MariaDB 10.2.7+ için JSON desteği
      allowNull: false
    },

    originalInput: {
      type: DataTypes.TEXT, // Daha uzun metinler için TEXT kullanabiliriz
      allowNull: true
    },

    aiProcessing: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    execution: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: { status: 'pending', attempts: 0, maxAttempts: 3 }
    },

    response: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: { success: false }
    },

    automation: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    batch: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    context: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    metadata:{ 
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize, // Sequelize instance'ını bağla
    modelName: 'Command', // Model adı
    tableName: 'Commands', // Veritabanındaki tablo adı
    timestamps: true, // `createdAt` ve `updatedAt` sütunlarını otomatik ekler
    // Indexes (MySQL için)
    indexes: [
      { fields: ['type'] },
      { fields: ['source'] },
      //{ fields: ['execution.status'] },
      { fields: ['createdAt'] },
      { fields: ['commandUniqueId'] } // Özelleştirilmiş ID için indeks
      // İlişkili kolonlar için indeksler:
      // { fields: ['deviceId'] },
      // { fields: ['userId'] },
    ]
  });

  // Burada modelin instance veya class metotlarını tanımlayabiliriz (Sequelize'e özgü)
  // Örneğin:
  // Command.prototype.markAsProcessing = async function() {
  //   this.execution.status = 'processing';
  //   this.execution.startTime = new Date();
  //   this.execution.attempts += 1;
  //   await this.save();
  // };

  return Command; // Modeli dışa aktar
};
