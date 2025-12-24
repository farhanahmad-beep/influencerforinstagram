import express from 'express';
import {
  searchInfluencers,
  getInfluencerById,
  getCategories,
  getLinkedAccounts,
  getAccountProfile,
  getUserProfile,
  getFollowers,
  getFollowing,
  searchRocketUsers,
  startChat,
  getChats,
  getChatMessages,
  sendChatMessage,
  getStats,
  onboardUser,
  getOnboardedUsers,
  deleteOnboardedUser,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignById,
  updateUserStatus,
  updateUserStatusOnboarded,
  updateUserStatusActive,
  getUserStatuses,
  getUserStatusStats,
  deleteUserStatus,
  saveInfluencerGrowth,
  getInfluencerGrowth,
  getInfluencerGrowthById,
  refreshInfluencerData,
} from '../controllers/influencerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', protect, searchInfluencers);
router.get('/categories', protect, getCategories);
router.get('/linked-accounts', protect, getLinkedAccounts);
router.get('/account-profile', protect, getAccountProfile);
router.get('/user-profile', protect, getUserProfile);
router.get('/followers', protect, getFollowers);
router.get('/following', protect, getFollowing);
router.get('/search-users', protect, searchRocketUsers);
router.post('/start-chat', protect, startChat);
router.get('/chats', protect, getChats);
router.get('/chats/:chatId/messages', protect, getChatMessages);
router.post('/chats/:chatId/messages', protect, sendChatMessage);
router.get('/stats', protect, getStats);
router.post('/onboard', protect, onboardUser);
router.get('/onboarded-users', protect, getOnboardedUsers);
router.delete('/onboarded-users/:userId', protect, deleteOnboardedUser);

// Campaign routes
router.get('/campaigns', protect, getCampaigns);
router.post('/campaigns', protect, createCampaign);
router.put('/campaigns/:campaignId', protect, updateCampaign);
router.delete('/campaigns/:campaignId', protect, deleteCampaign);
router.get('/campaigns/:campaignId', protect, getCampaignById);

// Status tracking routes
router.post('/user-status/contacted', protect, updateUserStatus);
router.post('/user-status/onboarded', protect, updateUserStatusOnboarded);
router.post('/user-status/active', protect, updateUserStatusActive);
router.get('/user-statuses', protect, getUserStatuses);
router.get('/user-statuses/stats', protect, getUserStatusStats);
router.delete('/user-statuses/:userId', protect, deleteUserStatus);

// Influencer growth tracking routes
router.post('/influencer-growth', protect, saveInfluencerGrowth);
router.get('/influencer-growth', protect, getInfluencerGrowth);
router.get('/influencer-growth/:id', protect, getInfluencerGrowthById);
router.post('/refresh-influencer', protect, refreshInfluencerData);

router.get('/:id', protect, getInfluencerById);

export default router;
