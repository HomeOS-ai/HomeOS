const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Cihaz adı zorunludur'],
    trim: true,
    maxlength: [100, 'Cihaz adı en fazla 100 karakter olabilir']
  },
  
  deviceId: {
    type: String,
    required: [true, 'Cihaz ID zorunludur'],
    unique: true,
    trim: true
  },
  
  type: {
    type: String,
    required: [true, 'Cihaz tipi zorunludur'],
    enum: {
      values: ['light', 'switch', 'thermostat', 'sensor', 'camera', 'door', 'blinds', 'fan', 'air_conditioner', 'tv', 'speaker', 'vacuum', 'washing_machine', 'dishwasher', 'oven', 'refrigerator', 'security_system', 'garage_door', 'water_heater', 'irrigation'],
      message: 'Geçersiz cihaz tipi'
    }
  },
  
  category: {
    type: String,
    enum: ['lighting', 'climate', 'security', 'entertainment', 'appliance', 'sensor', 'automation'],
    required: true
  },
  
  manufacturer: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  
  model: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  
  version: {
    type: String,
    trim: true,
    default: '1.0.0'
  },
  
  location: {
    room: {
      type: String,
      required: [true, 'Oda bilgisi zorunludur'],
      trim: true
    },
    floor: {
      type: String,
      default: 'Ground Floor'
    },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 }
    }
  },
  
  properties: {
    // Cihaza özel özellikler (JSON formatında)
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  capabilities: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['boolean', 'number', 'string', 'color', 'percentage'],
      required: true
    },
    readable: {
      type: Boolean,
      default: true
    },
    writable: {
      type: Boolean,
      default: true
    },
    min: Number,
    max: Number,
    unit: String,
    options: [String]
  }],
  
  status: {
    type: String,
    enum: ['online', 'offline', 'error', 'maintenance'],
    default: 'offline'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVisible: {
    type: Boolean,
    default: true
  },
  
  connectionType: {
    type: String,
    enum: ['wifi', 'zigbee', 'zwave', 'bluetooth', 'wired', 'mqtt'],
    required: true
  },
  
  configuration: {
    mqttTopic: {
      type: String,
      trim: true
    },
    haEntityId: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true,
      match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Geçerli bir IP adresi giriniz']
    },
    macAddress: {
      type: String,
      trim: true,
      match: [/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Geçerli bir MAC adresi giriniz']
    },
    port: {
      type: Number,
      min: 1,
      max: 65535
    },
    apiKey: String,
    refreshInterval: {
      type: Number,
      default: 30,
      min: 1
    }
  },
  
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  lastCommand: {
    command: String,
    timestamp: Date,
    success: Boolean,
    error: String
  },
  
  statistics: {
    totalCommands: {
      type: Number,
      default: 0
    },
    successfulCommands: {
      type: Number,
      default: 0
    },
    lastErrorCount: {
      type: Number,
      default: 0
    },
    uptime: {
      type: Number,
      default: 0
    }
  },
  
  energyConsumption: {
    current: {
      type: Number,
      default: 0
    },
    daily: {
      type: Number,
      default: 0
    },
    monthly: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      default: 'kWh'
    }
  },
  
  automation: {
    schedules: [{
      name: String,
      enabled: {
        type: Boolean,
        default: true
      },
      trigger: {
        type: {
          type: String,
          enum: ['time', 'sunrise', 'sunset', 'sensor']
        },
        time: String,
        days: [String],
        condition: String
      },
      action: {
        command: String,
        parameters: mongoose.Schema.Types.Mixed
      }
    }],
    
    scenes: [{
      name: String,
      enabled: {
        type: Boolean,
        default: true
      },
      state: mongoose.Schema.Types.Mixed
    }]
  },
  
  tags: [String],
  
  notes: {
    type: String,
    maxlength: 500
  },
  
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
deviceSchema.virtual('isOnline').get(function() {
  if (!this.lastSeen) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo;
});

deviceSchema.virtual('batteryLevel').get(function() {
  return this.properties?.battery?.level || null;
});

deviceSchema.virtual('signalStrength').get(function() {
  return this.properties?.signal?.strength || null;
});

deviceSchema.virtual('successRate').get(function() {
  if (this.statistics.totalCommands === 0) return 100;
  return Math.round((this.statistics.successfulCommands / this.statistics.totalCommands) * 100);
});

// Indexes
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ type: 1 });
deviceSchema.index({ 'location.room': 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ owner: 1 });
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ lastSeen: 1 });
deviceSchema.index({ tags: 1 });

// Instance methods
deviceSchema.methods.updateStatus = function(status) {
  const previousStatus = this.status;
  this.status = status;
  this.lastSeen = new Date();
  
  // Uptime hesapla
  if (status === 'online' && previousStatus !== 'online') {
    this.statistics.uptime = Date.now();
  }
  
  return this.save();
};

deviceSchema.methods.executeCommand = function(command, parameters = {}, success = true, error = null) {
  this.lastCommand = {
    command,
    timestamp: new Date(),
    success,
    error
  };
  
  this.statistics.totalCommands += 1;
  if (success) {
    this.statistics.successfulCommands += 1;
    this.statistics.lastErrorCount = 0;
  } else {
    this.statistics.lastErrorCount += 1;
  }
  
  this.lastSeen = new Date();
  
  return this.save();
};

deviceSchema.methods.updateProperty = function(property, value) {
  if (!this.properties) this.properties = {};
  this.properties[property] = value;
  this.lastSeen = new Date();
  this.markModified('properties');
  
  return this.save();
};

deviceSchema.methods.addSchedule = function(schedule) {
  if (!this.automation) this.automation = { schedules: [], scenes: [] };
  this.automation.schedules.push(schedule);
  
  return this.save();
};

deviceSchema.methods.addScene = function(scene) {
  if (!this.automation) this.automation = { schedules: [], scenes: [] };
  this.automation.scenes.push(scene);
  
  return this.save();
};

deviceSchema.methods.getCapability = function(name) {
  return this.capabilities.find(cap => cap.name === name);
};

deviceSchema.methods.hasCapability = function(name) {
  return this.capabilities.some(cap => cap.name === name);
};

// Static methods
deviceSchema.statics.findByRoom = function(room) {
  return this.find({ 'location.room': room, isActive: true });
};

deviceSchema.statics.findByType = function(type) {
  return this.find({ type, isActive: true });
};

deviceSchema.statics.findOnlineDevices = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.find({ 
    lastSeen: { $gte: fiveMinutesAgo },
    isActive: true 
  });
};

deviceSchema.statics.findOfflineDevices = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.find({ 
    lastSeen: { $lt: fiveMinutesAgo },
    isActive: true 
  });
};

deviceSchema.statics.getDeviceStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalDevices: { $sum: 1 },
        activeDevices: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        onlineDevices: {
          $sum: { 
            $cond: [
              { 
                $gte: ['$lastSeen', new Date(Date.now() - 5 * 60 * 1000)] 
              }, 
              1, 
              0
            ] 
          }
        }
      }
    }
  ]);
  
  const typeStats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const roomStats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$location.room',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    ...stats[0] || { totalDevices: 0, activeDevices: 0, onlineDevices: 0 },
    byType: typeStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byRoom: roomStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;