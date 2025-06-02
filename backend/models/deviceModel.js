// backend/models/deviceModel.js
// Bu dosya, MySQL için Device modelini tanımlar.
module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    id: { // Sequelize varsayılan olarak 'id' primary key'i oluşturur
      type: DataTypes.UUID, // UUID (Universally Unique Identifier) kullanıyoruz
      defaultValue: DataTypes.UUIDV4, // Sequelize'nin otomatik UUID üretmesini sağlar
      allowNull: false,
      primaryKey: true,
      unique: true
    },
    
    // Home Assistant'taki entity_id ile eşleşmesi için
    haEntityId: {
      type: DataTypes.STRING(255), // HA entity_id'ler genellikle stringtir
      allowNull: false,
      unique: true // Her HA entity_id tekil olmalı
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    type: { // Cihazın tipi (light, switch, thermostat vb.)
      type: DataTypes.ENUM(
        'light', 'switch', 'thermostat', 'sensor', 'camera', 'door', 
        'blinds', 'fan', 'air_conditioner', 'tv', 'speaker', 'vacuum', 
        'washing_machine', 'dishwasher', 'oven', 'refrigerator', 
        'security_system', 'garage_door', 'water_heater', 'irrigation'
      ),
      allowNull: false
    },

    category: {
      type: DataTypes.ENUM('lighting', 'climate', 'security', 'entertainment', 'appliance', 'sensor', 'automation'),
      allowNull: false
    },

    manufacturer: {
      type: DataTypes.STRING(100),
      defaultValue: 'Unknown',
      allowNull: true
    },

    model: {
      type: DataTypes.STRING(100),
      defaultValue: 'Unknown',
      allowNull: true
    },

    version: {
      type: DataTypes.STRING(50),
      defaultValue: '1.0.0',
      allowNull: true
    },

    locationRoom: { // location objesi yerine ayrı kolonlar
      type: DataTypes.STRING(100),
      allowNull: false
    },
    locationFloor: {
      type: DataTypes.STRING(100),
      defaultValue: 'Ground Floor',
      allowNull: true
    },
    locationPosition: { // JSON olarak koordinatlar
      type: DataTypes.JSON,
      defaultValue: { x: 0, y: 0, z: 0 },
      allowNull: true
    },
    
    properties: { // Cihaza özel özellikler (JSON formatında)
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true
    },
    
    capabilities: { // Cihazın yetenekleri (JSON formatında)
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true
    },
    
    status: {
      type: DataTypes.ENUM('online', 'offline', 'error', 'maintenance', 'unknown'), // 'unknown' ekledim
      defaultValue: 'unknown', // Başlangıç durumu bilinmiyor olabilir
      allowNull: false
    },
    
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    
    isVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    
    connectionType: {
      type: DataTypes.ENUM('wifi', 'zigbee', 'zwave', 'bluetooth', 'wired', 'mqtt', 'api'), // 'api' ekledim
      allowNull: false
    },
    
    configuration: { // Cihazın bağlantı konfigürasyonu (JSON formatında)
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true
    },
    
    lastSeen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW, // Otomatik olarak güncel zamanı atar
      allowNull: true
    },
    
    lastCommand: { // Son komut bilgisi (JSON formatında)
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true
    },
    
    statistics: { // İstatistikler (JSON formatında)
      type: DataTypes.JSON,
      defaultValue: { totalCommands: 0, successfulCommands: 0, lastErrorCount: 0, uptime: 0 },
      allowNull: true
    },
    
    energyConsumption: { // Enerji tüketimi (JSON formatında)
      type: DataTypes.JSON,
      defaultValue: { current: 0, daily: 0, monthly: 0, unit: 'kWh' },
      allowNull: true
    },
    
    automation: { // Otomasyon bilgileri (JSON formatında)
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true
    },
    
    tags: { // Etiketler (JSON formatında string array olarak saklanabilir)
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true
    },
    
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    
    // ownerId: { // Bu alan User modeli ile ilişki kurulduğunda aktif edilecek
    //   type: DataTypes.UUID, // User modelinin primary key'i UUID ise UUID
    //   references: {
    //     model: 'Users', // 'Users' tablosuna referans verir
    //     key: 'id',
    //   },
    //   allowNull: true // Veya false eğer her cihazın bir sahibi varsa
    // }
  }, {
    sequelize, // Sequelize instance'ını bağla
    modelName: 'Device', // Model adı
    tableName: 'Devices', // Veritabanındaki tablo adı (çoğul olması standarttır)
    timestamps: true, // `createdAt` ve `updatedAt` sütunlarını otomatik ekler
    indexes: [ // MySQL indeksleri
      { fields: ['haEntityId'], unique: true },
      { fields: ['type'] },
      { fields: ['locationRoom'] }, // location.room yerine locationRoom
      { fields: ['status'] },
      // { fields: ['ownerId'] }, // ownerId için indeks (ilişki kurulunca)
      { fields: ['isActive'] },
      { fields: ['lastSeen'] },
      { fields: ['tags'] } // JSON tipinde indeksleme için MySQL 8+ ve sanal sütun gerekebilir
    ],
    // Instance methods ve Class methods (önceki Mongoose'taki gibi) burada tanımlanabilir
    // Ancak Sequelize'de bu metodlar farklı yazılır (örneğin Model.prototype.metodAdi = function() {} veya Model.staticMetod = function() {})
    // Şimdilik sadece model tanımına odaklanıyoruz.
    // Örnek bir instance metodu:
    // instanceMethods: {
    //   updateStatus: async function(status) {
    //     this.status = status;
    //     this.lastSeen = new Date();
    //     await this.save();
    //   }
    // }
  });

  return Device; // Modeli dışa aktar
};