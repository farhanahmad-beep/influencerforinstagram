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
  startChat,
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
router.post('/start-chat', protect, startChat);
router.get('/:id', protect, getInfluencerById);

export default router;
