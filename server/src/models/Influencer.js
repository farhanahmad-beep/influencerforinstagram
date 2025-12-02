import mongoose from 'mongoose';

const influencerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    profileImage: {
      type: String,
      default: 'https://via.placeholder.com/150',
    },
    bio: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      enum: ['Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech', 'Lifestyle', 'Gaming', 'Business', 'Other'],
    },
    niche: {
      type: [String],
      default: [],
    },
    location: {
      country: String,
      city: String,
    },
    followers: {
      type: Number,
      required: true,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
    posts: {
      type: Number,
      default: 0,
    },
    engagementRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    averageLikes: {
      type: Number,
      default: 0,
    },
    averageComments: {
      type: Number,
      default: 0,
    },
    recentPosts: [
      {
        imageUrl: String,
        likes: Number,
        comments: Number,
        caption: String,
        postedAt: Date,
      },
    ],
    contactEmail: {
      type: String,
      trim: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Note: username index is automatically created by unique: true, so we don't need to add it manually
influencerSchema.index({ category: 1 });
influencerSchema.index({ followers: -1 });
influencerSchema.index({ engagementRate: -1 });

const Influencer = mongoose.model('Influencer', influencerSchema);

export default Influencer;
