import Influencer from '../models/Influencer.js';
import axios from 'axios';

const UNIPILE_API_URL = 'https://api20.unipile.com:15060';
const UNIPILE_ACCESS_TOKEN = 'DBn3GG0x.R257NUkk2xJksquuTCG3pombGbqjCuy9f6Q/GPW/GLA=';

export const searchInfluencers = async (req, res) => {
  try {
    const {
      keyword,
      category,
      minFollowers,
      maxFollowers,
      minEngagement,
      maxEngagement,
      country,
      city,
      niche,
      page = 1,
      limit = 12,
    } = req.query;

    // Fetch from Unipile API
    try {
      const unipileParams = {
        provider: 'instagram',
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      };

      // Add search keyword if provided - search by username or display name
      if (keyword && keyword.trim() !== '') {
        unipileParams.username = keyword.trim();
      }

      console.log('Unipile API Request:', `${UNIPILE_API_URL}/api/v1/accounts`, unipileParams);

      const unipileResponse = await axios.get(`${UNIPILE_API_URL}/api/v1/accounts`, {
        headers: {
          'Authorization': `Bearer ${UNIPILE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        params: unipileParams,
        timeout: 15000,
      });

      console.log('Unipile API Response status:', unipileResponse.status);
      console.log('Unipile API Response data:', JSON.stringify(unipileResponse.data, null, 2));

      if (unipileResponse.data && (unipileResponse.data.items || unipileResponse.data.object === 'list')) {
        const items = unipileResponse.data.items || unipileResponse.data.data || [];
        
        if (items.length === 0) {
          console.log('No items returned from Unipile API');
        }
        
        const transformedInfluencers = items.map(user => ({
          _id: user.id || user.user_id,
          username: user.username || user.handle,
          fullName: user.display_name || user.name || user.username,
          profilePicture: user.profile_picture_url || user.avatar_url,
          bio: user.biography || user.bio || '',
          followers: user.followers_count || 0,
          following: user.following_count || 0,
          posts: user.media_count || 0,
          engagementRate: user.engagement_rate || 0,
          category: user.category || 'Lifestyle',
          verified: user.is_verified || false,
          location: {
            country: user.location?.country || '',
            city: user.location?.city || '',
          },
          contactInfo: {
            email: user.email || '',
            website: user.website || '',
          },
          isActive: true,
        }));

        // Apply additional filters
        let filteredInfluencers = transformedInfluencers;

        if (minFollowers) {
          filteredInfluencers = filteredInfluencers.filter(inf => inf.followers >= parseInt(minFollowers));
        }
        if (maxFollowers) {
          filteredInfluencers = filteredInfluencers.filter(inf => inf.followers <= parseInt(maxFollowers));
        }
        if (minEngagement) {
          filteredInfluencers = filteredInfluencers.filter(inf => inf.engagementRate >= parseFloat(minEngagement));
        }
        if (maxEngagement) {
          filteredInfluencers = filteredInfluencers.filter(inf => inf.engagementRate <= parseFloat(maxEngagement));
        }
        if (category) {
          filteredInfluencers = filteredInfluencers.filter(inf => inf.category === category);
        }
        if (country) {
          filteredInfluencers = filteredInfluencers.filter(inf => 
            inf.location.country.toLowerCase().includes(country.toLowerCase())
          );
        }
        if (city) {
          filteredInfluencers = filteredInfluencers.filter(inf => 
            inf.location.city.toLowerCase().includes(city.toLowerCase())
          );
        }

        console.log(`Returning ${filteredInfluencers.length} influencers after filtering`);
        
        return res.status(200).json({
          success: true,
          data: filteredInfluencers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: unipileResponse.data.total || filteredInfluencers.length,
            pages: Math.ceil((unipileResponse.data.total || filteredInfluencers.length) / parseInt(limit)),
          },
        });
      }
    } catch (unipileError) {
      console.error('Unipile API error details:', {
        message: unipileError.message,
        response: unipileError.response?.data,
        status: unipileError.response?.status,
      });
      // Fall back to database if Unipile API fails
    }

    // Fallback: Query from database
    const query = { isActive: true };

    if (keyword) {
      query.$or = [
        { username: { $regex: keyword, $options: 'i' } },
        { fullName: { $regex: keyword, $options: 'i' } },
        { bio: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (minFollowers || maxFollowers) {
      query.followers = {};
      if (minFollowers) query.followers.$gte = parseInt(minFollowers);
      if (maxFollowers) query.followers.$lte = parseInt(maxFollowers);
    }

    if (minEngagement || maxEngagement) {
      query.engagementRate = {};
      if (minEngagement) query.engagementRate.$gte = parseFloat(minEngagement);
      if (maxEngagement) query.engagementRate.$lte = parseFloat(maxEngagement);
    }

    if (country) {
      query['location.country'] = { $regex: country, $options: 'i' };
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (niche) {
      query.niche = { $in: Array.isArray(niche) ? niche : [niche] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const influencers = await Influencer.find(query)
      .select('-recentPosts')
      .sort({ followers: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Influencer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: influencers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

export const getInfluencerById = async (req, res) => {
  try {
    // Try fetching from Unipile API first
    try {
      const unipileResponse = await axios.get(`${UNIPILE_API_URL}/api/v1/accounts/${req.params.id}`, {
        headers: {
          'Authorization': `Bearer ${UNIPILE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (unipileResponse.data) {
        const user = unipileResponse.data;
        const transformedInfluencer = {
          _id: user.id || user.user_id,
          username: user.username || user.handle,
          fullName: user.display_name || user.name || user.username,
          profilePicture: user.profile_picture_url || user.avatar_url,
          bio: user.biography || user.bio || '',
          followers: user.followers_count || 0,
          following: user.following_count || 0,
          posts: user.media_count || 0,
          engagementRate: user.engagement_rate || 0,
          category: user.category || 'Lifestyle',
          verified: user.is_verified || false,
          location: {
            country: user.location?.country || '',
            city: user.location?.city || '',
          },
          contactInfo: {
            email: user.email || '',
            website: user.website || '',
          },
          recentPosts: user.recent_posts || [],
          isActive: true,
        };

        return res.status(200).json({
          success: true,
          data: transformedInfluencer,
        });
      }
    } catch (unipileError) {
      console.error('Unipile API error:', unipileError.message);
      // Fall back to database
    }

    // Fallback: Query from database
    const influencer = await Influencer.findById(req.params.id);

    if (!influencer || !influencer.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Influencer not found',
        statusCode: 404,
      });
    }

    res.status(200).json({
      success: true,
      data: influencer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Influencer.distinct('category');

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};
