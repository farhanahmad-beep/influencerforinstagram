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

export { OnboardedUser, Campaign };
export default OnboardedUser;

