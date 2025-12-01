import express from 'express';
import {
  searchInfluencers,
  getInfluencerById,
  getCategories,
} from '../controllers/influencerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', protect, searchInfluencers);
router.get('/categories', protect, getCategories);
router.get('/:id', protect, getInfluencerById);

export default router;
