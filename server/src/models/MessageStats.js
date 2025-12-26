import mongoose from 'mongoose';

const messageStatsSchema = new mongoose.Schema({
  totalMessagesSent: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Ensure only one document exists for message stats
messageStatsSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingStats = await this.constructor.findOne({});
    if (existingStats) {
      // Update existing document instead of creating new one
      existingStats.totalMessagesSent = this.totalMessagesSent;
      existingStats.lastUpdated = new Date();
      await existingStats.save();
      next(new Error('MessageStats document already exists. Use update instead.'));
      return;
    }
  }
  next();
});

// Static method to get or create stats
messageStatsSchema.statics.getStats = async function() {
  let stats = await this.findOne({});
  if (!stats) {
    stats = await this.create({ totalMessagesSent: 0 });
  }
  return stats;
};

// Static method to increment message count
messageStatsSchema.statics.incrementMessageCount = async function() {
  const stats = await this.getStats();
  stats.totalMessagesSent += 1;
  stats.lastUpdated = new Date();
  await stats.save();
  return stats.totalMessagesSent;
};

const MessageStats = mongoose.model('MessageStats', messageStatsSchema);

export default MessageStats;
