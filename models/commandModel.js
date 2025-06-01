const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
  commandId: {
    type: String,
    required: true,
    unique: true,
    default: () => require('crypto').randomBytes(16).toString('hex')
  },
  
  type: {
    type: String,
    enum: ['manual', 'ai', 'automation', 'scene', 'schedule'],
    required: true
  },
  
  source: {
    type: String,
    enum: ['user', 'ai_assistant', 'automation', 'external_api', 'voice_command', 'mobile_app', 'web_app'],
    required: true
  },
  
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  command: {
    action: {
      type: String,
      required: true,
      trim: true
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal'
    }
  },
  
  originalInput: {
    type: String,
    trim: true
  },
  
  aiProcessing: {
    prompt: String,
    model: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    processingTime: Number,
    tokenUsage: {
      input: Number,
      output: Number,
      total: Number
    },
    interpretation: {
      intent: String,
      entities: [{
        type: String,
        value: String,
        confidence: Number
      }],
      deviceMatch: {
        matched: Boolean,
        confidence: Number,
        alternatives: [String]
      }
    }
  },
  
  execution: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'confirmed', 'failed', 'timeout', 'cancelled'],
      default: 'pending'
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    retryAfter: Date,
    scheduledFor: Date
  },
  
  response: {
    success: {
      type: Boolean,
      default: false
    },
    message: String,
    errorCode: String,
    deviceResponse: mongoose.Schema.Types.Mixed,
    httpStatus: Number,
    responseTime: Number
  },
  
  automation: {
    triggered: {
      type: Boolean,
      default: false
    },
    triggerType: {
      type: String,
      enum: ['time', 'sensor', 'condition', 'scene', 'voice']
    },
    triggerData: mongoose.Schema.Types.Mixed,
    ruleId: String
  },
  
  batch: {
    isBatch: {
      type: Boolean,
      default: false
    },
    batchId: String,
    sequenceNumber: Number,
    dependsOn: [String]
  },
  
  context: {
    sessionId: String,
    conversationId: String,
    platform: {
      type: String,
      enum: ['web', 'mobile', 'voice', 'api', 'automation']
    },
    userAgent: String,
    ipAddress: String,
    location: {
      country: String,
      city: String,
      timezone: String
    }
  },
  
  metadata: {
    tags: [String],
    category: String,
    notes: String,
    cost: Number,
    energyImpact: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
commandSchema.virtual('isSuccessful').get(function() {
  return this.response.success === true;
});

commandSchema.virtual('executionDuration').get(function() {
  if (this.execution.startTime && this.execution.endTime) {
    return this.execution.endTime - this.execution.startTime;
  }
  return null;
});

commandSchema.virtual('isExpired').get(function() {
  if (!this.execution.scheduledFor) return false;
  const timeout = 5 * 60 * 1000; // 5 dakika timeout
  return Date.now() > (this.execution.scheduledFor.getTime() + timeout);
});

commandSchema.virtual('canRetry').get(function() {
  return this.execution.attempts < this.execution.maxAttempts && 
         this.execution.status === 'failed' &&
         !this.isExpired;
});

// Indexes
commandSchema.index({ device: 1, createdAt: -1 });
commandSchema.index({ user: 1, createdAt: -1 });
commandSchema.index({ 'execution.status': 1 });
commandSchema.index({ commandId: 1 });
commandSchema.index({ type: 1, source: 1 });
commandSchema.index({ 'execution.scheduledFor': 1 });
commandSchema.index({ 'batch.batchId': 1 });
commandSchema.index({ createdAt: -1 });

// Pre-save middleware
commandSchema.pre('save', function(next) {
  // Execution duration hesapla
  if (this.execution.startTime && this.execution.endTime) {
    this.execution.duration = this.execution.endTime - this.execution.startTime;
  }
  
  next();
});

// Instance methods
commandSchema.methods.markAsProcessing = function() {
  this.execution.status = 'processing';
  this.execution.startTime = new Date();
  this.execution.attempts += 1;
  
  return this.save();
};

commandSchema.methods.markAsSuccess = function(message = null, deviceResponse = null) {
  this.execution.status = 'confirmed';
  this.execution.endTime = new Date();
  this.response.success = true;
  this.response.message = message;
  this.response.deviceResponse = deviceResponse;
  
  return this.save();
};

commandSchema.methods.markAsFailed = function(error, errorCode = null, httpStatus = null) {
  this.execution.status = 'failed';
  this.execution.endTime = new Date();
  this.response.success = false;
  this.response.message = error;
  this.response.errorCode = errorCode;
  this.response.httpStatus = httpStatus;
  
  // Retry logic
  if (this.canRetry) {
    const retryDelay = Math.pow(2, this.execution.attempts) * 1000; // Exponential backoff
    this.execution.retryAfter = new Date(Date.now() + retryDelay);
  }
  
  return this.save();
};

commandSchema.methods.cancel = function(reason = 'Cancelled by user') {
  this.execution.status = 'cancelled';
  this.execution.endTime = new Date();
  this.response.message = reason;
  
  return this.save();
};

commandSchema.methods.schedule = function(executeAt) {
  this.execution.scheduledFor = executeAt;
  this.execution.status = 'pending';
  
  return this.save();
};

commandSchema.methods.clone = function() {
  const clonedCommand = new this.constructor({
    type: this.type,
    source: this.source,
    device: this.device,
    user: this.user,
    command: this.command,
    originalInput: this.originalInput,
    metadata: this.metadata
  });
  
  return clonedCommand;
};

// Static methods
commandSchema.statics.findPendingCommands = function() {
  return this.find({
    'execution.status': 'pending',
    $or: [
      { 'execution.scheduledFor': { $lte: new Date() } },
      { 'execution.scheduledFor': { $exists: false } }
    ]
  }).populate('device user');
};

commandSchema.statics.findFailedCommands = function() {
  return this.find({
    'execution.status': 'failed',
    'execution.attempts': { $lt: this.execution.maxAttempts }
  }).populate('device user');
};

commandSchema.statics.findByDevice = function(deviceId, limit = 50) {
  return this.find({ device: deviceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'firstName lastName email');
};

commandSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('device', 'name type location');
};

commandSchema.statics.getCommandStats = async function(filter = {}) {
  const matchStage = { ...filter };
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCommands: { $sum: 1 },
        successfulCommands: {
          $sum: { $cond: [{ $eq: ['$response.success', true] }, 1, 0] }
        },
        failedCommands: {
          $sum: { $cond: [{ $eq: ['$response.success', false] }, 1, 0] }
        },
        pendingCommands: {
          $sum: { $cond: [{ $eq: ['$execution.status', 'pending'] }, 1, 0] }
        },
        avgResponseTime: { $avg: '$response.responseTime' }
      }
    }
  ]);
  
  const commandsByType = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        successRate: {
          $avg: { $cond: [{ $eq: ['$response.success', true] }, 1, 0] }
        }
      }
    }
  ]);
  
  const commandsBySource = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    ...stats[0] || {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      pendingCommands: 0,
      avgResponseTime: 0
    },
    byType: commandsByType.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        successRate: Math.round(item.successRate * 100)
      };
      return acc;
    }, {}),
    bySource: commandsBySource.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

commandSchema.statics.cleanupOldCommands = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    'execution.status': { $in: ['confirmed', 'failed', 'cancelled'] }
  });
};

const Command = mongoose.model('Command', commandSchema);

module.exports = Command;