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
router.get('/:id', protect, getInfluencerById);

export default router;
