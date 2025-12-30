import mongoose from 'mongoose';

const onboardedUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    chatId: {
      type: String,
      trim: true,
    },
    providerId: {
      type: String,
      trim: true,
    },
    providerMessagingId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

onboardedUserSchema.index({ name: 1 });

const OnboardedUser = mongoose.model('OnboardedUser', onboardedUserSchema);

// Campaign schema
const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'running', 'paused', 'completed', 'expired'],
      default: 'draft',
    },
    userIds: [{
      type: String,
      required: true,
    }],
    userCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
campaignSchema.index({ name: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ expiresAt: 1 });

// Pre-save middleware to update user count
campaignSchema.pre('save', function(next) {
  this.userCount = this.userIds ? this.userIds.length : 0;
  next();
});

const Campaign = mongoose.model('Campaign', campaignSchema);

// User Status tracking schema
const userStatusSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    profilePictureData: {
      type: String,
      trim: true,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    provider: {
      type: String,
      enum: ['INSTAGRAM', 'FACEBOOK', 'TWITTER'],
      default: 'INSTAGRAM',
    },
    providerId: {
      type: String,
      trim: true,
    },
    providerMessagingId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['contacted', 'onboarded', 'active'],
      default: 'contacted',
    },
    statusHistory: [{
      status: {
        type: String,
        enum: ['contacted', 'onboarded', 'active'],
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      notes: {
        type: String,
        trim: true,
      },
    }],
    lastContacted: {
      type: Date,
      default: Date.now,
    },
    lastMessageSent: {
      type: Date,
    },
    campaignIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    }],
    messageCount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ['global_search', 'followers', 'following', 'direct'],
      default: 'direct',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// userStatusSchema.index({ userId: 1 });
userStatusSchema.index({ status: 1 });
userStatusSchema.index({ username: 1 });
userStatusSchema.index({ provider: 1 });
userStatusSchema.index({ lastContacted: -1 });
userStatusSchema.index({ source: 1 });

// Pre-save middleware to add status history
userStatusSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory = this.statusHistory || [];
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

const UserStatus = mongoose.model('UserStatus', userStatusSchema);

// Influencer Growth Tracking Schema
const influencerGrowthSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    profilePictureData: {
      type: String,
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    providerMessagingId: {
      type: String,
      trim: true,
    },
    // Growth tracking history
    growthHistory: [
      {
        followersCount: { type: Number, required: true },
        followingCount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    // When this influencer was first tracked
    firstTrackedAt: {
      type: Date,
      default: Date.now,
    },
    // Last update timestamp
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    // Latest growth metrics (calculated on refresh)
    latestGrowth: {
      followersGrowth: { type: Number, default: 0 },
      followingGrowth: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

const InfluencerGrowth = mongoose.model('InfluencerGrowth', influencerGrowthSchema);

export { OnboardedUser, Campaign, UserStatus, InfluencerGrowth };
export default OnboardedUser;

