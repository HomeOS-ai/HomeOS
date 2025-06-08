// backend/models/userModel.js
// Bu dosya, MySQL için User modelini tanımlar.
const bcrypt = require('bcryptjs'); // Şifreleri hashlemek için bcryptjs kullanacağız

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { // Sequelize varsayılan olarak 'id' primary key'i oluşturur
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
      unique: true
    },

    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    email: {
      type: DataTypes.STRING(191), // Düzeltme: VARCHAR(255) yerine 191 yapıldı
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },

    password: {
      type: DataTypes.STRING(255), // Hashlenmiş şifreler daha uzun olabilir
      allowNull: false
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    role: { // Kullanıcı rolü (admin, user, guest vb.)
      type: DataTypes.ENUM('admin', 'user', 'guest'),
      defaultValue: 'user',
      allowNull: false
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },

    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // JWT refresh token'ı gibi oturum bilgileri burada saklanabilir
    refreshToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    // Diğer metadata veya ayarlar
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '', // Düzeltme: {} (boş obje) yerine '' (boş string) yapıldı
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true, // `createdAt` ve `updatedAt`
    indexes: [
      { fields: ['username'], unique: true },
      { fields: ['email'], unique: true },
      { fields: ['role'] }
    ],
    // Hooks: Modellerde belirli olaylar öncesi/sonrası çalışan fonksiyonlar
    hooks: {
      beforeCreate: async (user) => {
        // Kullanıcı oluşturulmadan önce şifreyi hash'le
        if (user.password) {
          const salt = await bcrypt.genSalt(10); // Tuz oluştur
          user.password = await bcrypt.hash(user.password, salt); // Şifreyi hash'le
        }
      },
      beforeUpdate: async (user) => {
        // Şifre güncelleniyorsa hash'le
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Instance method: Şifre doğrulamak için
  User.prototype.isValidPassword = async function(password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  };

  // Model ilişkilerini burada tanımlayabiliriz (örneğin User'ın Command ile)
  // User.hasMany(Command, { foreignKey: 'userId', as: 'commands' });

  return User; // Modeli dışa aktar
};
