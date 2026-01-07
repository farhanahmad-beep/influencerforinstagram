import Influencer from '../models/Influencer.js';
import axios from 'axios';
import { OnboardedUser, Campaign, UserStatus, InfluencerGrowth } from '../models/OnboardedUser.js';
import MessageStats from '../models/MessageStats.js';
import User from '../models/User.js';
import { Buffer } from 'buffer';

// Helper function to get Unipile API configuration (read from env at runtime)
const getUnipileConfig = () => {
  const apiUrl = process.env.UNIPILE_API_URL?.replace(/\/$/, '') || '';
  const accessToken = process.env.UNIPILE_ACCESS_TOKEN || '';
  return { apiUrl, accessToken };
};

// Helper for Rocket API configuration
const getRocketConfig = () => {
  const apiUrl = (process.env.ROCKET_API_URL || 'https://v1.rocketapi.io/instagram').replace(/\/$/, '');
  const apiKey = process.env.ROCKET_API_KEY || '';
  return { apiUrl, apiKey };
};

// Helper for Modash API configuration
const getModashConfig = () => {
  const baseUrl = (process.env.MODASH_BASE_URL || 'https://api.modash.io/v1').replace(/\/$/, '');
  const accessToken = process.env.MODASH_ACCESS_TOKEN || '';
  return { baseUrl, accessToken };
};
// Helper function to get Unipile API headers
const getUnipileHeaders = (accessToken) => ({
  'accept': 'application/json',
  'X-API-KEY': accessToken,
  'Content-Type': 'application/json',
});

// Message stats are now stored in database (MessageStats model)

// Fetch remote image as base64 data URI (used to avoid browser CORS on CDN images)
const fetchImageAsBase64 = async (url) => {
  if (!url) return '';
  try {
    const imgResponse = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Instagram Image Fetcher)',
      },
      validateStatus: () => true,
    });
    if (imgResponse.status >= 200 && imgResponse.status < 300 && imgResponse.data) {
      const contentType = imgResponse.headers['content-type'] || 'image/jpeg';
      const base64 = Buffer.from(imgResponse.data).toString('base64');
      return `data:${contentType};base64,${base64}`;
    }
    console.error('Image fetch non-success status:', imgResponse.status);
    return '';
  } catch (err) {
    console.error('Failed to fetch image as base64:', err.message);
    return '';
  }
};

// Helper function to fetch user counts (followers/following) from Unipile API
const fetchUserCounts = async (userId, accountId, apiUrl, accessToken) => {
  if (!userId || !accountId) return { followersCount: 0, followingCount: 0, providerMessagingId: '' };
  
  try {
    const unipileResponse = await axios.get(`${apiUrl}/api/v1/users/${userId}`, {
      headers: getUnipileHeaders(accessToken),
      params: { account_id: accountId },
      timeout: 10000,
      validateStatus: () => true,
    });

    if (unipileResponse.status >= 200 && unipileResponse.status < 300 && unipileResponse.data) {
      return {
        followersCount: unipileResponse.data.followers_count || 0,
        followingCount: unipileResponse.data.following_count || 0,
        providerMessagingId: unipileResponse.data.provider_messaging_id || '',
      };
    }
  } catch (err) {
    // Silently fail - return default counts
    console.error(`Failed to fetch counts for user ${userId}:`, err.message);
  }
  
  return { followersCount: 0, followingCount: 0, providerMessagingId: '' };
};

// Helper function to process items with limited concurrency
const processWithConcurrency = async (items, processor, concurrency = 5) => {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
};

// Search influencers via Modash API
export const searchModashInfluencers = async (req, res) => {
  try {
    const { baseUrl, accessToken } = getModashConfig();


    if (!baseUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Modash API configuration not found. Please set MODASH_BASE_URL and MODASH_ACCESS_TOKEN environment variables.',
        statusCode: 400,
      });
    }

    const requestBody = req.body;

    const fullUrl = `${baseUrl}/instagram/search`;

    const response = await axios.post(fullUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status code
    });

    // If it's a 400 error, let's also try without the Bearer prefix
    if (response.status === 400) {
      const responseWithoutBearer = await axios.post(fullUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken, // Try without Bearer prefix
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      if (responseWithoutBearer.status < 400) {
        return res.status(200).json({
          success: true,
          data: responseWithoutBearer.data,
        });
      }
    }

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: `Modash API returned status ${response.status}`,
        statusCode: response.status,
        details: response.data,
        requestBody: requestBody, // Include for debugging
      });
    }
  } catch (error) {
    console.error('Modash API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to search influencers via Modash API',
      statusCode: 500,
      message: error.message,
      details: error.response?.data,
    });
  }
};

// Get locations from Modash API
export const getLocations = async (req, res) => {
  try {
    const { baseUrl, accessToken } = getModashConfig();

    if (!baseUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Modash API configuration not found. Please set MODASH_BASE_URL and MODASH_ACCESS_TOKEN environment variables.',
        statusCode: 400,
      });
    }

    const { query, limit = 30 } = req.query;
    const locationsUrl = `${baseUrl}/instagram/locations`;

    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('limit', limit.toString());

    const fullUrl = `${locationsUrl}?${params.toString()}`;

    const response = await axios.get(fullUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 30000,
    });

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: `Modash API returned status ${response.status}`,
        statusCode: response.status,
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Modash locations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch locations from Modash API',
      statusCode: 500,
      message: error.message,
      details: error.response?.data,
    });
  }
};

// Get languages from Modash API
export const getLanguages = async (req, res) => {
  try {
    const { baseUrl, accessToken } = getModashConfig();

    if (!baseUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Modash API configuration not found. Please set MODASH_BASE_URL and MODASH_ACCESS_TOKEN environment variables.',
        statusCode: 400,
      });
    }

    const { query, limit = 30 } = req.query;
    const languagesUrl = `${baseUrl}/instagram/languages`;

    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('limit', limit.toString());

    const fullUrl = `${languagesUrl}?${params.toString()}`;

    const response = await axios.get(fullUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 30000,
    });

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: `Modash API returned status ${response.status}`,
        statusCode: response.status,
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Modash languages error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch languages from Modash API',
      statusCode: 500,
      message: error.message,
      details: error.response?.data,
    });
  }
};

// Get interests from Modash API
export const getInterests = async (req, res) => {
  try {
    const { baseUrl, accessToken } = getModashConfig();

    if (!baseUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Modash API configuration not found. Please set MODASH_BASE_URL and MODASH_ACCESS_TOKEN environment variables.',
        statusCode: 400,
      });
    }

    const { query, limit = 30 } = req.query;
    const interestsUrl = `${baseUrl}/instagram/interests`;

    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('limit', limit.toString());

    const fullUrl = `${interestsUrl}?${params.toString()}`;

    const response = await axios.get(fullUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 30000,
    });

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: `Modash API returned status ${response.status}`,
        statusCode: response.status,
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Modash interests error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch interests from Modash API',
      statusCode: 500,
      message: error.message,
      details: error.response?.data,
    });
  }
};

// AI Text-based search for influencers
export const aiTextSearch = async (req, res) => {
  try {
    const { baseUrl, accessToken } = getModashConfig();

    if (!baseUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Modash API configuration not found. Please set MODASH_BASE_URL and MODASH_ACCESS_TOKEN environment variables.',
        statusCode: 400,
      });
    }

    const requestBody = req.body;

    const fullUrl = `${baseUrl}/ai/instagram/text-search`;

    const response = await axios.post(fullUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 60000, // Longer timeout for AI search
      validateStatus: () => true,
    });

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: `Modash AI API returned status ${response.status}`,
        statusCode: response.status,
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Modash AI search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform AI text search via Modash API',
      statusCode: 500,
      message: error.message,
      details: error.response?.data,
    });
  }
};

// Search users via Modash API
export const searchModashUsers = async (req, res) => {
  try {
    const { baseUrl, accessToken } = getModashConfig();

    if (!baseUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Modash API configuration not found. Please set MODASH_BASE_URL and MODASH_ACCESS_TOKEN environment variables.',
        statusCode: 400,
      });
    }

    const { query, limit = 100 } = req.query;

    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('limit', limit.toString());

    const fullUrl = `${baseUrl}/instagram/users?${params.toString()}`;

    const response = await axios.get(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status code
    });

    // If it's a 400 error, let's also try without the Bearer prefix
    if (response.status === 400) {
      const responseWithoutBearer = await axios.get(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken, // Try without Bearer prefix
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      if (responseWithoutBearer.status < 400) {
        return res.status(200).json({
          success: true,
          data: responseWithoutBearer.data,
        });
      }
    }

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: 'Failed to search users via Modash API',
        statusCode: response.status,
        message: response.data?.message || 'Unknown error',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Modash users search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search users via Modash API',
      statusCode: 500,
      message: error.message,
      details: error.response?.data,
    });
  }
};

// Search influencers using image-based AI via Modash API
export const searchModashImage = async (req, res) => {
  try {
    const { baseUrl, accessToken } = getModashConfig();

    if (!baseUrl || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Modash API configuration not found. Please set MODASH_BASE_URL and MODASH_ACCESS_TOKEN environment variables.',
        statusCode: 400,
      });
    }

    const requestBody = req.body;

    const fullUrl = `${baseUrl}/ai/instagram/image-search`;

    const response = await axios.post(fullUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      timeout: 60000, // Longer timeout for image processing
      validateStatus: () => true, // Don't throw on any status code
    });

    // If it's a 400 error, let's also try without the Bearer prefix
    if (response.status === 400) {
      const responseWithoutBearer = await axios.post(fullUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken, // Try without Bearer prefix
        },
        timeout: 60000,
        validateStatus: () => true,
      });

      if (responseWithoutBearer.status < 400) {
        return res.status(200).json({
          success: true,
          data: responseWithoutBearer.data,
        });
      }
    }

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        error: 'Failed to perform image search via Modash API',
        statusCode: response.status,
        message: response.data?.message || 'Unknown error',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Modash image search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform image search via Modash API',
      statusCode: 500,
      message: error.message,
      details: error.response?.data,
    });
  }
};

// Search users via Rocket API (global search)
export const searchRocketUsers = async (req, res) => {
  try {
    const { query, cursor = 0, limit = 10, account_id } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'query is required',
        statusCode: 400,
      });
    }

    const cursorInt = Math.max(parseInt(cursor, 10) || 0, 0);
    let limitInt = parseInt(limit, 10) || 10;
    if (limitInt < 1) limitInt = 1;
    if (limitInt > 100) limitInt = 100; // cap to prevent huge payloads

    const { apiUrl, apiKey } = getRocketConfig();
    const { accessToken: unipileAccessToken, apiUrl: unipileApiUrl } = getUnipileConfig();
    if (!apiKey || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Rocket API key not configured',
        statusCode: 400,
      });
    }

    try {
      const rocketResponse = await axios.post(
        `${apiUrl}/user/search`,
        { query: query.trim() },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-API-Key': apiKey,
          },
          timeout: 15000,
          validateStatus: () => true,
        }
      );

      if (rocketResponse.status >= 200 && rocketResponse.status < 300 && rocketResponse.data) {
        const users = rocketResponse.data?.response?.body?.users || rocketResponse.data?.users || [];

        const mappedUsers = await processWithConcurrency(
          users,
          async (user) => {
            const profilePicture = user.profile_pic_url || user.profile_picture || user.profile_picture_url || '';
            const profilePictureData = profilePicture ? await fetchImageAsBase64(profilePicture) : '';
            const baseUser = {
              id: user.id || user.pk || user.pk_id || user.strong_id__ || '',
              username: user.username || '',
              name: user.full_name || user.username || '',
              profilePicture,
              profilePictureData,
              isPrivate: !!user.is_private,
              isVerified: !!user.is_verified,
            };
            // Try to enrich follower/following counts via Unipile if account_id provided
            if (account_id && unipileAccessToken && unipileApiUrl) {
              const counts = await fetchUserCounts(baseUser.id, account_id, unipileApiUrl, unipileAccessToken);
              return {
                ...baseUser,
                followersCount: counts.followersCount,
                followingCount: counts.followingCount,
                providerMessagingId: counts.providerMessagingId,
              };
            }
            return {
              ...baseUser,
              followersCount: user.follower_count || user.followers || 0,
              followingCount: user.following_count || user.following || 0,
            };
          },
          5
        );

        // Simple cursor-based pagination on our side (Rocket returns up to 50)
        const sliced = mappedUsers.slice(cursorInt, cursorInt + limitInt);
        const hasMore = cursorInt + limitInt < mappedUsers.length;
        const nextCursor = hasMore ? cursorInt + limitInt : null;

        return res.status(200).json({
          success: true,
          data: sliced,
          pagination: {
            cursor: nextCursor,
            hasMore,
            count: sliced.length,
            total: mappedUsers.length,
            limit: limitInt,
          },
          meta: {
            numResults: rocketResponse.data?.response?.body?.num_results || mappedUsers.length || 0,
            status: rocketResponse.data?.status || 'unknown',
          },
        });
      }

      return res.status(rocketResponse.status || 500).json({
        success: false,
        error: 'Failed to search users via Rocket API',
        statusCode: rocketResponse.status || 500,
        details: rocketResponse.data || null,
      });
    } catch (err) {
      console.error('Rocket API error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to search users via Rocket API',
        statusCode: 500,
        message: err.message,
        details: err.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};
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

    // Fetch from Unipile API (only if token is configured)
    const { apiUrl, accessToken } = getUnipileConfig();
    if (accessToken) {
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

        const unipileResponse = await axios.get(`${apiUrl}/api/v1/accounts`, {
          headers: getUnipileHeaders(accessToken),
          params: unipileParams,
          timeout: 15000,
        });

        if (unipileResponse.data && (unipileResponse.data.items || unipileResponse.data.object === 'list')) {
          const items = unipileResponse.data.items || unipileResponse.data.data || [];
          
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
        // Only log 401 errors once, skip other errors silently to reduce noise
        if (unipileError.response?.status === 401) {
          console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        }
        // Fall back to database if Unipile API fails
      }
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
    // Try fetching from Unipile API first (only if token is configured)
    const { apiUrl, accessToken } = getUnipileConfig();
    if (accessToken) {
      try {
        const unipileResponse = await axios.get(`${apiUrl}/api/v1/accounts/${req.params.id}`, {
          headers: getUnipileHeaders(accessToken),
        });

        if (unipileResponse.data) {
          const user = unipileResponse.data;
          const transformedInfluencer = {
            _id: user.id || user.user_id,
            username: user.username || user.handle || '',
            fullName: user.display_name || user.name || user.username || 'Unknown',
            profileImage: user.profile_picture_url || user.avatar_url || 'https://via.placeholder.com/150',
            bio: user.biography || user.bio || '',
            followers: user.followers_count || 0,
            following: user.following_count || 0,
            posts: user.media_count || 0,
            engagementRate: user.engagement_rate || 0,
            category: user.category || 'Lifestyle',
            verified: user.is_verified || false,
            niche: user.niche || [],
            location: {
              country: user.location?.country || '',
              city: user.location?.city || '',
            },
            contactEmail: user.email || user.contactInfo?.email || '',
            averageLikes: user.average_likes || 0,
            averageComments: user.average_comments || 0,
            recentPosts: user.recent_posts || [],
            isActive: true,
          };

          return res.status(200).json({
            success: true,
            data: transformedInfluencer,
          });
        }
      } catch (unipileError) {
        // Only log 401 errors, skip other errors silently
        if (unipileError.response?.status === 401) {
          console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        }
        // Fall back to database
      }
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

// Get linked accounts from Unipile
export const getLinkedAccounts = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Unipile API token not configured',
      });
    }

    try {
      const unipileResponse = await axios.get(`${apiUrl}/api/v1/accounts`, {
        headers: getUnipileHeaders(accessToken),
        timeout: 15000,
      });

      if (unipileResponse.data && unipileResponse.data.items) {
        const accounts = unipileResponse.data.items.map(account => ({
          id: account.id,
          name: account.name,
          type: account.type,
          username: account.connection_params?.im?.username || account.name,
          createdAt: account.created_at,
          status: account.sources?.[0]?.status || 'UNKNOWN',
          groups: account.groups || [],
        }));

        return res.status(200).json({
          success: true,
          data: accounts,
        });
      }

      return res.status(200).json({
        success: true,
        data: [],
      });
    } catch (unipileError) {
      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch linked accounts',
        statusCode: 500,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Get user profile by ID from Unipile
export const getUserProfile = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    const { identifier, account_id } = req.query;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'identifier (user ID) is required',
        statusCode: 400,
      });
    }

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required',
        statusCode: 400,
      });
    }

    try {
      const unipileResponse = await axios.get(`${apiUrl}/api/v1/users/${identifier}`, {
        headers: getUnipileHeaders(accessToken),
        params: { account_id },
        timeout: 15000,
      });

      if (unipileResponse.data) {
        const profile = unipileResponse.data;

        // Fetch profile picture as base64 to avoid CDN CORS blocks
        const pictureSource = profile.profile_picture_url_large || profile.profile_picture_url || '';
        const profilePictureData = pictureSource ? await fetchImageAsBase64(pictureSource) : '';

        const transformedProfile = {
          provider: profile.provider || '',
          providerId: profile.provider_id || '',
          providerMessagingId: profile.provider_messaging_id || '',
          publicIdentifier: profile.public_identifier || '',
          fullName: profile.full_name || '',
          profilePictureUrl: profile.profile_picture_url || '',
          profilePictureUrlLarge: profile.profile_picture_url_large || '',
          profilePictureData,
          biography: profile.biography || '',
          category: profile.category || '',
          followersCount: profile.followers_count || 0,
          mutualFollowersCount: profile.mutual_followers_count || 0,
          followingCount: profile.following_count || 0,
          postsCount: profile.posts_count || 0,
          profileType: profile.profile_type || '',
          isVerified: profile.is_verified || false,
          isPrivate: profile.is_private || false,
          externalLinks: profile.external_links || [],
          relationshipStatus: profile.relationship_status || {},
        };

        return res.status(200).json({
          success: true,
          data: transformedProfile,
        });
      }

      return res.status(200).json({
        success: true,
        data: null,
      });
    } catch (unipileError) {
      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Basic stats endpoint: total linked accounts (from Unipile) and messages sent (in-memory)
export const getStats = async (req, res) => {
  try {
    const { apiUrl, accessToken } = getUnipileConfig();

    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    // Fetch linked accounts to count them (same endpoint as getLinkedAccounts)
    const linkedAccountsResponse = await axios.get(`${apiUrl}/api/v1/accounts`, {
      headers: getUnipileHeaders(accessToken),
      timeout: 15000,
      validateStatus: () => true,
    });

    let linkedAccountsCount = 0;
    if (linkedAccountsResponse.status >= 200 && linkedAccountsResponse.status < 300) {
      if (linkedAccountsResponse.data?.items) {
        linkedAccountsCount = Array.isArray(linkedAccountsResponse.data.items) ? linkedAccountsResponse.data.items.length : 0;
      } else if (Array.isArray(linkedAccountsResponse.data)) {
        linkedAccountsCount = linkedAccountsResponse.data.length;
      }
    } else {
      console.error('Failed to fetch linked accounts for stats:', linkedAccountsResponse.status);
    }

    // Fetch onboarded users count
    let onboardedUsersCount = 0;
    try {
      onboardedUsersCount = await OnboardedUser.countDocuments({});
    } catch (dbError) {
      console.error('Failed to fetch onboarded users count:', dbError.message);
    }

    // Fetch active campaigns count
    let activeCampaignsCount = 0;
    try {
      activeCampaignsCount = await Campaign.countDocuments({ status: 'running' });
    } catch (dbError) {
      console.error('Failed to fetch active campaigns count:', dbError.message);
    }

    // Fetch completed campaigns count
    let completedCampaignsCount = 0;
    try {
      completedCampaignsCount = await Campaign.countDocuments({ status: 'completed' });
    } catch (dbError) {
      console.error('Failed to fetch completed campaigns count:', dbError.message);
    }

    // Fetch persistent message count from database
    let messagesSentCount = 0;
    try {
      const messageStats = await MessageStats.getStats();
      messagesSentCount = messageStats.totalMessagesSent;
    } catch (dbError) {
      console.error('Failed to fetch message stats:', dbError.message);
    }

    // Fetch registrations with trackingId (campaign signups)
    let trackingRegistrations = 0;
    try {
      trackingRegistrations = await User.countDocuments({
        trackingId: { $exists: true, $ne: '' },
      });
    } catch (dbError) {
      console.error('Failed to fetch tracking registrations count:', dbError.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        linkedAccounts: linkedAccountsCount,
        messagesSent: messagesSentCount,
        onboardedUsers: onboardedUsersCount,
        activeCampaigns: activeCampaignsCount,
        completedCampaigns: completedCampaignsCount,
        trackingRegistrations,
      },
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      statusCode: 500,
    });
  }
};

// Get registrations that arrived via trackingId (username passed as query param)
export const getTrackingRegistrations = async (req, res) => {
  try {
    const registrations = await User.find({
      trackingId: { $exists: true, $ne: '' },
    })
      .sort({ createdAt: -1 })
      .select('name username email trackingId role isActive createdAt');

    const trackingUsernames = registrations
      .map((u) => u.trackingId)
      .filter(Boolean);

    // Match trackingId (username param sent) with user statuses for richer context
    const statuses = await UserStatus.find({
      username: { $in: trackingUsernames },
    }).select(
      'username status provider providerId providerMessagingId followersCount followingCount name profilePicture profilePictureData'
    );

    const statusMap = new Map(
      statuses.map((s) => [s.username, s.toObject()])
    );

    const enriched = registrations.map((reg) => {
      const matchedStatus = statusMap.get(reg.trackingId);
      return {
        id: reg._id,
        name: reg.name,
        username: reg.username,
        email: reg.email,
        trackingId: reg.trackingId,
        role: reg.role,
        isActive: reg.isActive,
        createdAt: reg.createdAt,
        status: matchedStatus?.status || 'unknown',
        statusInfo: matchedStatus || null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalRegistrations: registrations.length,
        registrations: enriched,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tracking registrations:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tracking registrations',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Get chats list from Unipile
export const getChats = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    // Extract query parameters
    const { account_id, cursor, limit = 10 } = req.query;

    // Validate required parameters
    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required',
        statusCode: 400,
      });
    }

    // Build query parameters
    const params = {
      account_type: 'INSTAGRAM',
      account_id: account_id,
      limit: Math.min(Math.max(parseInt(limit) || 10, 1), 250), // Clamp between 1 and 250
    };
    
    if (cursor) {
      params.cursor = cursor;
    }

    console.log('Unipile Chats API Request:', {
      url: `${apiUrl}/api/v1/chats`,
      params: params,
    });

    try {
      const unipileResponse = await axios.get(`${apiUrl}/api/v1/chats`, {
        headers: getUnipileHeaders(accessToken),
        params: params,
        timeout: 30000,
      });

      if (unipileResponse.data) {
        // Handle Unipile API response structure: { object: "ChatList", items: [...], cursor: "..." }
        const items = unipileResponse.data.items || [];
        
        console.log(`Unipile API returned ${items.length} chats`);

        const chats = items.map((chat) => ({
          id: chat.id || '',
          name: chat.name || 'Unknown',
          type: chat.type || 0,
          folder: chat.folder || [],
          pinned: chat.pinned || 0,
          unread: chat.unread || 0,
          archived: chat.archived || 0,
          readOnly: chat.read_only || 0,
          timestamp: chat.timestamp || '',
          accountId: chat.account_id || '',
          mutedUntil: chat.muted_until || -1,
          providerId: chat.provider_id || '',
          accountType: chat.account_type || 'INSTAGRAM',
          unreadCount: chat.unread_count || 0,
          attendeeProviderId: chat.attendee_provider_id || '',
        }));

        console.log(`Processed ${chats.length} chats for response`);

        return res.status(200).json({
          success: true,
          data: chats,
          pagination: {
            cursor: unipileResponse.data.cursor || null,
            hasMore: !!unipileResponse.data.cursor,
            count: chats.length,
            limit: params.limit,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          cursor: null,
          hasMore: false,
          count: 0,
          limit: params.limit,
        },
      });
    } catch (unipileError) {
      // Log detailed error information
      console.error('Unipile API Error Details:', {
        status: unipileError.response?.status,
        statusText: unipileError.response?.statusText,
        data: unipileError.response?.data,
        message: unipileError.message,
        url: unipileError.config?.url,
        params: unipileError.config?.params,
      });

      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }

      if (unipileError.response?.status >= 400 && unipileError.response?.status < 500) {
        return res.status(unipileError.response.status).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Unipile API client error',
          statusCode: unipileError.response.status,
          details: unipileError.response.data,
        });
      }
      
      // Handle network errors or other issues
      if (unipileError.code === 'ECONNREFUSED' || unipileError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Unipile API',
          statusCode: 503,
          message: unipileError.message,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch chats',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Get messages from a specific chat
export const getChatMessages = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    // Extract path and query parameters
    const { chatId } = req.params;
    const { cursor, limit = 10, sender_id } = req.query;

    // Validate required parameters
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chat_id is required',
        statusCode: 400,
      });
    }

    // Build query parameters
    const params = {
      limit: Math.min(Math.max(parseInt(limit) || 10, 1), 250), // Clamp between 1 and 250
    };
    
    if (cursor) {
      params.cursor = cursor;
    }
    
    if (sender_id) {
      params.sender_id = sender_id;
    }

    console.log('Unipile Chat Messages API Request:', {
      url: `${apiUrl}/api/v1/chats/${chatId}/messages`,
      params: params,
    });

    try {
      const unipileResponse = await axios.get(`${apiUrl}/api/v1/chats/${chatId}/messages`, {
        headers: getUnipileHeaders(accessToken),
        params: params,
        timeout: 30000,
      });

      if (unipileResponse.data) {
        // Handle Unipile API response structure: { object: "MessageList", items: [...], cursor: "..." }
        const items = unipileResponse.data.items || [];
        
        console.log(`Unipile API returned ${items.length} messages`);

        const messages = items.map((message) => ({
          id: message.id || '',
          text: message.text || '',
          seen: message.seen || 0,
          edited: message.edited || 0,
          hidden: message.hidden || 0,
          deleted: message.deleted || 0,
          chatId: message.chat_id || '',
          seenBy: message.seen_by || {},
          subject: message.subject || null,
          behavior: message.behavior || null,
          isEvent: message.is_event || 0,
          original: message.original || '',
          delivered: message.delivered || 0,
          isSender: message.is_sender || 0,
          reactions: message.reactions || [],
          senderId: message.sender_id || '',
          timestamp: message.timestamp || '',
          accountId: message.account_id || '',
          attachments: message.attachments || [],
          providerId: message.provider_id || '',
          chatProviderId: message.chat_provider_id || '',
          senderAttendeeId: message.sender_attendee_id || '',
        }));

        console.log(`Processed ${messages.length} messages for response`);

        return res.status(200).json({
          success: true,
          data: messages,
          pagination: {
            cursor: unipileResponse.data.cursor || null,
            hasMore: !!unipileResponse.data.cursor,
            count: messages.length,
            limit: params.limit,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          cursor: null,
          hasMore: false,
          count: 0,
          limit: params.limit,
        },
      });
    } catch (unipileError) {
      // Log detailed error information
      console.error('Unipile API Error Details:', {
        status: unipileError.response?.status,
        statusText: unipileError.response?.statusText,
        data: unipileError.response?.data,
        message: unipileError.message,
        url: unipileError.config?.url,
        params: unipileError.config?.params,
      });

      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }

      if (unipileError.response?.status >= 400 && unipileError.response?.status < 500) {
        return res.status(unipileError.response.status).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Unipile API client error',
          statusCode: unipileError.response.status,
          details: unipileError.response.data,
        });
      }
      
      // Handle network errors or other issues
      if (unipileError.code === 'ECONNREFUSED' || unipileError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Unipile API',
          statusCode: 503,
          message: unipileError.message,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch chat messages',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Send a message in a chat
export const sendChatMessage = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    const { chatId } = req.params;
    const { account_id, text } = req.body;

    // Validate required parameters
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'chat_id is required',
        statusCode: 400,
      });
    }

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required',
        statusCode: 400,
      });
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'text is required',
        statusCode: 400,
      });
    }

    // Create FormData-like body using URLSearchParams
    const formData = new URLSearchParams();
    formData.append('account_id', account_id);
    formData.append('text', text.trim());

    console.log('Unipile Send Chat Message API Request:', {
      url: `${apiUrl}/api/v1/chats/${chatId}/messages`,
      body: {
        account_id,
        text: text.trim(),
      },
    });

    try {
      const unipileResponse = await axios.post(
        `${apiUrl}/api/v1/chats/${chatId}/messages`,
        formData.toString(),
        {
          headers: {
            ...getUnipileHeaders(accessToken),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000,
        }
      );

      if (unipileResponse.data) {
        const messageIds = unipileResponse.data.message_id || [];
        
        console.log(`Message sent successfully. Message IDs: ${messageIds.join(', ')}`);

        // Increment persistent counter for messages sent
        const currentMessageCount = await MessageStats.incrementMessageCount();

        return res.status(200).json({
          success: true,
          data: {
            messageIds: messageIds,
            messageId: messageIds[0] || null,
          },
          message: 'Message sent successfully',
          stats: {
            messagesSent: currentMessageCount,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: null,
        message: 'Message sent successfully',
      });
    } catch (unipileError) {
      // Log detailed error information
      console.error('Unipile API Error Details:', {
        status: unipileError.response?.status,
        statusText: unipileError.response?.statusText,
        data: unipileError.response?.data,
        message: unipileError.message,
        url: unipileError.config?.url,
        body: unipileError.config?.data,
      });

      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }

      if (unipileError.response?.status === 400) {
        console.error('Unipile API: Bad request', unipileError.response.data);
        return res.status(400).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Invalid request parameters',
          statusCode: 400,
          details: unipileError.response.data,
        });
      }

      if (unipileError.response?.status === 500) {
        console.error('Unipile API: Server error', unipileError.response.data);
        return res.status(500).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Unipile API server error',
          statusCode: 500,
          details: unipileError.response.data,
        });
      }
      
      // Handle network errors or other issues
      if (unipileError.code === 'ECONNREFUSED' || unipileError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Unipile API',
          statusCode: 503,
          message: unipileError.message,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to send message',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Get account profile details from Unipile
export const getAccountProfile = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    const { account_id } = req.query;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required',
        statusCode: 400,
      });
    }

    try {
      const unipileResponse = await axios.get(`${apiUrl}/api/v1/users/me`, {
        headers: getUnipileHeaders(accessToken),
        params: { account_id },
        timeout: 15000,
      });

      if (unipileResponse.data) {
        const profile = unipileResponse.data;

        // Attempt to fetch profile picture as base64 to avoid browser CORS blocks
        let profilePictureData = '';
        const pictureSource = profile.profile_picture_url_large || profile.profile_picture_url || '';
        if (pictureSource) {
          try {
            const imgResponse = await axios.get(pictureSource, {
              responseType: 'arraybuffer',
              timeout: 10000,
            });
            const contentType = imgResponse.headers['content-type'] || 'image/jpeg';
            const base64 = Buffer.from(imgResponse.data, 'binary').toString('base64');
            profilePictureData = `data:${contentType};base64,${base64}`;
          } catch (imgErr) {
            // If image fetch fails, continue without blocking the request
            console.error('Failed to fetch profile image as base64:', imgErr.message);
          }
        }

        const transformedProfile = {
          provider: profile.provider || '',
          providerId: profile.provider_id || '',
          providerMessagingId: profile.provider_messaging_id || '',
          publicIdentifier: profile.public_identifier || '',
          fullName: profile.full_name || '',
          profilePictureUrl: profile.profile_picture_url || '',
          profilePictureUrlLarge: profile.profile_picture_url_large || '',
          profilePictureData, // base64 data URI (for CORS-safe rendering)
          biography: profile.biography || '',
          category: profile.category || '',
          followersCount: profile.followers_count || 0,
          mutualFollowersCount: profile.mutual_followers_count || 0,
          followingCount: profile.following_count || 0,
          postsCount: profile.posts_count || 0,
          profileType: profile.profile_type || '',
          isVerified: profile.is_verified || false,
          isPrivate: profile.is_private || false,
          externalLinks: profile.external_links || [],
          relationshipStatus: profile.relationship_status || {},
        };

        return res.status(200).json({
          success: true,
          data: transformedProfile,
        });
      }

      return res.status(200).json({
        success: true,
        data: null,
      });
    } catch (unipileError) {
      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch account profile',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Start a new chat/message from Unipile
export const startChat = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    const { account_id, text, attendees_ids } = req.body;

    if (!account_id) {
      return res.status(400).json({
        success: false,
        error: 'account_id is required',
        statusCode: 400,
      });
    }

    if (!attendees_ids || !Array.isArray(attendees_ids) || attendees_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'attendees_ids (array) is required and must contain at least one provider_messaging_id',
        statusCode: 400,
      });
    }

    const requestBody = {
      account_id: account_id,
      attendees_ids: attendees_ids,
    };

    if (text && text.trim() !== '') {
      requestBody.text = text.trim();
    }

    console.log('Unipile Start Chat API Request:', {
      url: `${apiUrl}/api/v1/chats`,
      body: requestBody,
    });

    try {
      const unipileResponse = await axios.post(`${apiUrl}/api/v1/chats`, requestBody, {
        headers: getUnipileHeaders(accessToken),
        timeout: 15000,
      });

      if (unipileResponse.data) {
        console.log('Unipile API returned chat data:', unipileResponse.data);

        // Increment persistent counter for messages sent
        const currentMessageCount = await MessageStats.incrementMessageCount();

        return res.status(200).json({
          success: true,
          data: unipileResponse.data,
          message: 'Chat started successfully',
          stats: {
            messagesSent: currentMessageCount,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: null,
        message: 'Chat started successfully',
      });
    } catch (unipileError) {
      // Log detailed error information
      console.error('Unipile API Error Details:', {
        status: unipileError.response?.status,
        statusText: unipileError.response?.statusText,
        data: unipileError.response?.data,
        message: unipileError.message,
        url: unipileError.config?.url,
        body: unipileError.config?.data,
      });

      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }
      
      if (unipileError.response?.status === 400) {
        console.error('Unipile API: Bad request', unipileError.response.data);
        return res.status(400).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Invalid request parameters',
          statusCode: 400,
          details: unipileError.response.data,
        });
      }

      if (unipileError.response?.status === 500) {
        console.error('Unipile API: Server error', unipileError.response.data);
        return res.status(500).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Unipile API server error',
          statusCode: 500,
          details: unipileError.response.data,
        });
      }
      
      // Handle network errors or other issues
      if (unipileError.code === 'ECONNREFUSED' || unipileError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Unipile API',
          statusCode: 503,
          message: unipileError.message,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to start chat',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Get following accounts from Unipile
export const getFollowing = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    // Extract query parameters
    const { user_id, account_id, cursor, limit = 10 } = req.query;

    // Validate required parameters
    if (!user_id && !account_id) {
      return res.status(400).json({
        success: false,
        error: 'Either user_id or account_id is required',
        statusCode: 400,
      });
    }

    // Build query parameters - prioritize account_id if both are provided
    const params = {};
    if (account_id) {
      params.account_id = account_id;
    } else if (user_id) {
      params.user_id = user_id;
    }
    
    if (cursor) params.cursor = cursor;
    if (limit) {
      const limitNum = parseInt(limit);
      if (limitNum >= 1 && limitNum <= 1000) {
        params.limit = limitNum;
      } else {
        params.limit = 10; // Default to 10 if out of range
      }
    } else {
      params.limit = 10; // Default limit
    }

    console.log('Unipile Following API Request:', {
      url: `${apiUrl}/api/v1/users/following`,
      params: params,
    });

    try {
      const unipileResponse = await axios.get(`${apiUrl}/api/v1/users/following`, {
        headers: getUnipileHeaders(accessToken),
        params: params,
        timeout: 30000, // Increased timeout for large following lists
      });

      if (unipileResponse.data) {
        // Handle Unipile API response structure: { object: "UserFollowingList", items: [...], cursor: "..." }
        const items = unipileResponse.data.items || [];
        
        console.log(`Unipile API returned ${items.length} following accounts`);
        
        // First, process images and basic data
        const followingBasic = await Promise.all(
          items.map(async (account) => {
            const profilePicture = account.profile_picture_url || '';
            const profilePictureData = profilePicture ? await fetchImageAsBase64(profilePicture) : '';
            return {
              id: account.id || '',
              messagingId: account.messaging_id || '',
              username: account.username || '',
              name: account.name || account.username || '',
              profilePicture,
              profilePictureData,
              isPrivate: account.is_private || false,
              isVerified: account.is_verified || false,
              isFavorite: account.is_favorite || false,
            };
          })
        );

        // Then, fetch follower/following counts with limited concurrency
        // Use account_id from query (required for fetching user profile)
        const accountIdForCounts = account_id || null;
        const following = accountIdForCounts ? await processWithConcurrency(
          followingBasic,
          async (account) => {
            const counts = await fetchUserCounts(account.id, accountIdForCounts, apiUrl, accessToken);
            return {
              ...account,
              followersCount: counts.followersCount,
              followingCount: counts.followingCount,
              providerMessagingId: counts.providerMessagingId || account.messagingId || '',
            };
          },
          5 // Process 5 users at a time to avoid overwhelming the API
        ) : followingBasic.map(f => ({
          ...f,
          followersCount: 0,
          followingCount: 0,
          providerMessagingId: f.messagingId || ''
        }));

        console.log(`Processed ${following.length} following accounts for response`);

        return res.status(200).json({
          success: true,
          data: following,
          pagination: {
            cursor: unipileResponse.data.cursor || null,
            hasMore: !!unipileResponse.data.cursor,
            count: following.length,
            limit: params.limit,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          cursor: null,
          hasMore: false,
          count: 0,
          limit: params.limit,
        },
      });
    } catch (unipileError) {
      // Log detailed error information
      console.error('Unipile API Error Details:', {
        status: unipileError.response?.status,
        statusText: unipileError.response?.statusText,
        data: unipileError.response?.data,
        message: unipileError.message,
        url: unipileError.config?.url,
        params: unipileError.config?.params,
      });

      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }
      
      if (unipileError.response?.status === 400) {
        console.error('Unipile API: Bad request', unipileError.response.data);
        return res.status(400).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Invalid request parameters',
          statusCode: 400,
          details: unipileError.response.data,
        });
      }

      if (unipileError.response?.status === 500) {
        console.error('Unipile API: Server error', unipileError.response.data);
        return res.status(500).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Unipile API server error',
          statusCode: 500,
          details: unipileError.response.data,
        });
      }
      
      // Handle network errors or other issues
      if (unipileError.code === 'ECONNREFUSED' || unipileError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Unipile API',
          statusCode: 503,
          message: unipileError.message,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch following accounts',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Get followers from Unipile
export const getFollowers = async (req, res) => {
  try {
    // Read environment variables at runtime
    const { apiUrl, accessToken } = getUnipileConfig();
    
    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Unipile API token not configured',
        statusCode: 400,
      });
    }

    // Extract query parameters
    const { user_id, account_id, cursor, limit = 10 } = req.query;

    // Validate required parameters
    if (!user_id && !account_id) {
      return res.status(400).json({
        success: false,
        error: 'Either user_id or account_id is required',
        statusCode: 400,
      });
    }

    // Build query parameters - prioritize account_id if both are provided
    const params = {};
    if (account_id) {
      params.account_id = account_id;
    } else if (user_id) {
      params.user_id = user_id;
    }
    
    if (cursor) params.cursor = cursor;
    if (limit) {
      const limitNum = parseInt(limit);
      if (limitNum >= 1 && limitNum <= 1000) {
        params.limit = limitNum;
      } else {
        params.limit = 10; // Default to 10 if out of range
      }
    } else {
      params.limit = 10; // Default limit
    }

    console.log('Unipile Followers API Request:', {
      url: `${apiUrl}/api/v1/users/followers`,
      params: params,
    });

    try {
      const unipileResponse = await axios.get(`${apiUrl}/api/v1/users/followers`, {
        headers: getUnipileHeaders(accessToken),
        params: params,
        timeout: 30000, // Increased timeout for large follower lists
      });

      if (unipileResponse.data) {
        // Handle Unipile API response structure: { object: "UserFollowersList", items: [...], cursor: "..." }
        const items = unipileResponse.data.items || [];
        
        console.log(`Unipile API returned ${items.length} followers`);
        
        // First, process images and basic data
        const followersBasic = await Promise.all(
          items.map(async (follower) => {
            const profilePicture = follower.profile_picture_url || '';
            const profilePictureData = profilePicture ? await fetchImageAsBase64(profilePicture) : '';
            return {
              id: follower.id || '',
              messagingId: follower.messaging_id || '',
              username: follower.username || '',
              name: follower.name || follower.username || '',
              profilePicture,
              profilePictureData,
              isPrivate: follower.is_private || false,
              isVerified: follower.is_verified || false,
            };
          })
        );

        // Then, fetch follower/following counts with limited concurrency
        // Use account_id from query (required for fetching user profile)
        const accountIdForCounts = account_id || null;
        const followers = accountIdForCounts ? await processWithConcurrency(
          followersBasic,
          async (follower) => {
            const counts = await fetchUserCounts(follower.id, accountIdForCounts, apiUrl, accessToken);
            return {
              ...follower,
              followersCount: counts.followersCount,
              followingCount: counts.followingCount,
              providerMessagingId: counts.providerMessagingId || follower.messagingId || '',
            };
          },
          5 // Process 5 users at a time to avoid overwhelming the API
        ) : followersBasic.map(f => ({
          ...f,
          followersCount: 0,
          followingCount: 0,
          providerMessagingId: f.messagingId || ''
        }));

        console.log(`Processed ${followers.length} followers for response`);

        return res.status(200).json({
          success: true,
          data: followers,
          pagination: {
            cursor: unipileResponse.data.cursor || null,
            hasMore: !!unipileResponse.data.cursor,
            count: followers.length,
            limit: params.limit,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          cursor: null,
          hasMore: false,
          count: 0,
          limit: params.limit,
        },
      });
    } catch (unipileError) {
      // Log detailed error information
      console.error('Unipile API Error Details:', {
        status: unipileError.response?.status,
        statusText: unipileError.response?.statusText,
        data: unipileError.response?.data,
        message: unipileError.message,
        url: unipileError.config?.url,
        params: unipileError.config?.params,
      });

      if (unipileError.response?.status === 401) {
        console.error('Unipile API: Invalid credentials. Please check UNIPILE_ACCESS_TOKEN in environment variables.');
        return res.status(401).json({
          success: false,
          error: 'Invalid Unipile API credentials',
          statusCode: 401,
        });
      }
      
      if (unipileError.response?.status === 400) {
        console.error('Unipile API: Bad request', unipileError.response.data);
        return res.status(400).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Invalid request parameters',
          statusCode: 400,
          details: unipileError.response.data,
        });
      }

      if (unipileError.response?.status === 500) {
        console.error('Unipile API: Server error', unipileError.response.data);
        return res.status(500).json({
          success: false,
          error: unipileError.response.data?.error || unipileError.response.data?.message || 'Unipile API server error',
          statusCode: 500,
          details: unipileError.response.data,
        });
      }
      
      // Handle network errors or other issues
      if (unipileError.code === 'ECONNREFUSED' || unipileError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          success: false,
          error: 'Unable to connect to Unipile API',
          statusCode: 503,
          message: unipileError.message,
        });
      }
      
      console.error('Unipile API error:', unipileError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch followers',
        statusCode: 500,
        message: unipileError.message,
        details: unipileError.response?.data || null,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      statusCode: 400,
    });
  }
};

// Onboard a user
export const onboardUser = async (req, res) => {
  try {
    const { name, userId, chatId, providerId, providerMessagingId } = req.body;


    if (!name || !userId) {
      return res.status(400).json({
        success: false,
        error: 'name and userId are required',
        statusCode: 400,
      });
    }

    // Check if user is already onboarded
    const existingUser = await OnboardedUser.findOne({ userId });
    if (existingUser) {
      return res.status(200).json({
        success: true,
        data: existingUser,
        message: 'User already onboarded',
      });
    }

    console.log('Onboarding user with data:', {
      name: name?.trim(),
      userId: userId?.trim(),
      chatId: chatId?.trim(),
      providerId: providerId?.trim(),
      providerMessagingId: providerMessagingId?.trim(),
    });

    // Create new onboarded user
    const onboardedUser = await OnboardedUser.create({
      name: name.trim(),
      userId: userId.trim(),
      chatId: chatId?.trim() || '',
      providerId: providerId?.trim() || '',
      providerMessagingId: providerMessagingId?.trim() || '',
    });

    return res.status(201).json({
      success: true,
      data: onboardedUser,
      message: 'User onboarded successfully',
    });
  } catch (error) {
    console.error('Error onboarding user:', error);
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        error: 'User with this ID already exists',
        statusCode: 400,
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to onboard user',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Get all onboarded users
export const getOnboardedUsers = async (req, res) => {
  try {
    const onboardedUsers = await OnboardedUser.find({})
      .sort({ createdAt: -1 })
      .select('name userId chatId providerId providerMessagingId createdAt updatedAt');

    // Fetch profile picture data from UserStatus collection for each onboarded user
    const enrichedUsers = await Promise.all(
      onboardedUsers.map(async (user) => {
        const userStatus = await UserStatus.findOne({ userId: user.userId.toString() })
          .select('profilePicture profilePictureData followersCount followingCount username status');

        return {
          ...user.toObject(),
          profilePicture: userStatus?.profilePicture || '',
          profilePictureData: userStatus?.profilePictureData || '',
          followersCount: userStatus?.followersCount || 0,
          followingCount: userStatus?.followingCount || 0,
          username: userStatus?.username || '',
          status: userStatus?.status || 'unknown',
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: enrichedUsers,
      count: enrichedUsers.length,
    });
  } catch (error) {
    console.error('Error fetching onboarded users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarded users',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Delete an onboarded user
export const deleteOnboardedUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
        statusCode: 400,
      });
    }

    const deletedUser = await OnboardedUser.findOneAndDelete({ userId });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: 'Onboarded user not found',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      success: true,
      data: deletedUser,
      message: 'Onboarded user deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting onboarded user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete onboarded user',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Campaign Management Functions

// Get all campaigns
export const getCampaigns = async (req, res) => {
  try {
    // First, update any expired campaigns
    const now = new Date();
    await Campaign.updateMany(
      {
        expiresAt: { $lte: now },
        status: { $ne: 'expired' }
      },
      { status: 'expired' }
    );

    const campaigns = await Campaign.find({})
      .sort({ createdAt: -1 })
      .select('name description status userIds userCount expiresAt isActive notes createdAt updatedAt');

    return res.status(200).json({
      success: true,
      data: campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Create a new campaign
export const createCampaign = async (req, res) => {
  try {
    const { name, description, userIds, expiresAt, notes } = req.body;

    if (!name || !userIds || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name and user IDs are required',
        statusCode: 400,
      });
    }

    // Validate that all userIds exist in onboarded users
    const existingUsers = await OnboardedUser.find({ userId: { $in: userIds } });
    const existingUserIds = existingUsers.map(user => user.userId);

    const invalidUserIds = userIds.filter(id => !existingUserIds.includes(id));
    if (invalidUserIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid user IDs: ${invalidUserIds.join(', ')}`,
        statusCode: 400,
      });
    }

    const campaign = await Campaign.create({
      name: name.trim(),
      description: description?.trim() || '',
      userIds: userIds,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes?.trim() || '',
    });

    return res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Update campaign
export const updateCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, description, status, userIds, expiresAt, notes } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
        statusCode: 400,
      });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        statusCode: 404,
      });
    }

    // Validate userIds if provided
    if (userIds && userIds.length > 0) {
      const existingUsers = await OnboardedUser.find({ userId: { $in: userIds } });
      const existingUserIds = existingUsers.map(user => user.userId);
      const invalidUserIds = userIds.filter(id => !existingUserIds.includes(id));

      if (invalidUserIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid user IDs: ${invalidUserIds.join(', ')}`,
          statusCode: 400,
        });
      }
    }

    // Update fields
    if (name !== undefined) campaign.name = name.trim();
    if (description !== undefined) campaign.description = description?.trim() || '';
    if (status !== undefined) campaign.status = status;
    if (userIds !== undefined) campaign.userIds = userIds;
    if (expiresAt !== undefined) campaign.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (notes !== undefined) campaign.notes = notes?.trim() || '';

    await campaign.save();

    return res.status(200).json({
      success: true,
      data: campaign,
      message: 'Campaign updated successfully',
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Delete campaign
export const deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
        statusCode: 400,
      });
    }

    const deletedCampaign = await Campaign.findByIdAndDelete(campaignId);

    if (!deletedCampaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      success: true,
      data: deletedCampaign,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Get campaign by ID with user details
export const getCampaignById = async (req, res) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
        statusCode: 400,
      });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        statusCode: 404,
      });
    }

    // Get user details for the campaign
    const users = await OnboardedUser.find({ userId: { $in: campaign.userIds } })
      .select('name userId providerId providerMessagingId createdAt');

    return res.status(200).json({
      success: true,
      data: {
        campaign: campaign,
        users: users,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
      statusCode: 500,
      message: error.message,
    });
  }
};

// User Status Tracking Endpoints

// Update user status when sending message
export const updateUserStatus = async (req, res) => {
  try {
    const {
      userId,
      username,
      name,
      profilePicture,
      profilePictureData,
      followersCount,
      followingCount,
      provider,
      providerId,
      providerMessagingId,
      source
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        statusCode: 400,
      });
    }

    // Convert profilePicture URL to base64 if it's a URL and not already base64
    let profilePictureBase64 = profilePicture;
    if (profilePicture && !profilePicture.startsWith('data:image/')) {
      // It's a URL, convert to base64
      try {
        profilePictureBase64 = await fetchImageAsBase64(profilePicture);
      } catch (error) {
        console.error('Failed to convert profile picture URL to base64:', error);
        profilePictureBase64 = profilePicture; // Keep original URL if conversion fails
      }
    }

    // Find or create user status
    let userStatus = await UserStatus.findOne({ userId });

    if (userStatus) {
      // Update existing user with available data
      if (username !== undefined) userStatus.username = username;
      if (name !== undefined) userStatus.name = name;
      if (profilePictureBase64 !== undefined) userStatus.profilePicture = profilePictureBase64;
      if (profilePictureData !== undefined) userStatus.profilePictureData = profilePictureData;
      if (followersCount !== undefined) userStatus.followersCount = followersCount;
      if (followingCount !== undefined) userStatus.followingCount = followingCount;
      if (provider !== undefined) userStatus.provider = provider;
      if (providerId !== undefined) userStatus.providerId = providerId;
      if (providerMessagingId !== undefined) userStatus.providerMessagingId = providerMessagingId;
      if (source !== undefined) userStatus.source = source;

      userStatus.lastContacted = new Date();
      userStatus.lastMessageSent = new Date();
      userStatus.messageCount = (userStatus.messageCount || 0) + 1;

      await userStatus.save();
    } else {
      // Create new user status with available data
      userStatus = new UserStatus({
        userId,
        username: username || '',
        name: name || '',
        profilePicture: profilePictureBase64 || '',
        profilePictureData: profilePictureData || '',
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        provider: provider || 'INSTAGRAM',
        providerId: providerId || '',
        providerMessagingId: providerMessagingId || '',
        status: 'contacted',
        source: source || 'direct',
        lastContacted: new Date(),
        lastMessageSent: new Date(),
        messageCount: 1,
      });
      await userStatus.save();
    }

    return res.status(200).json({
      success: true,
      data: userStatus,
      message: 'User status updated successfully',
    });
  } catch (error) {
    console.error('Failed to update user status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Update user status to onboarded
export const updateUserStatusOnboarded = async (req, res) => {
  try {
    const { userId, chatName } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        statusCode: 400,
      });
    }

    // First, try to find by userId
    let userStatus = await UserStatus.findOne({ userId: userId.toString() });

    // If not found by userId, try to find by providerMessagingId
    if (!userStatus) {
      userStatus = await UserStatus.findOne({ providerMessagingId: userId.toString() });
    }

    // If still not found by providerMessagingId, try to find by providerId
    if (!userStatus) {
      userStatus = await UserStatus.findOne({ providerId: userId.toString() });
    }

    // If still not found and we have a chat name, try to find by name (for same user matching)
    if (!userStatus && chatName) {
      // Remove emojis and special chars for better matching
      const cleanChatName = chatName.replace(/[^\w\s]/g, '').trim();
      userStatus = await UserStatus.findOne({
        $or: [
          { name: { $regex: new RegExp(chatName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
          { name: { $regex: new RegExp(cleanChatName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }
        ],
        provider: 'INSTAGRAM'
      });
    }

    if (userStatus) {
      // Update existing user status
      userStatus.status = 'onboarded';
      userStatus.lastContacted = new Date();
      // Update name if we have it from chat
      if (chatName && !userStatus.name) {
        userStatus.name = chatName;
      }
      // If we found by name matching and the userId is different, update it to the canonical ID
      if (userStatus.userId !== userId) {
        userStatus.userId = userId;
      }
      await userStatus.save();
    } else {
      // Create new user status if not found
      userStatus = new UserStatus({
        userId,
        name: chatName,
        status: 'onboarded',
        source: 'direct',
        lastContacted: new Date(),
      });
      await userStatus.save();
    }

    return res.status(200).json({
      success: true,
      data: userStatus,
      message: 'User status updated to onboarded',
    });
  } catch (error) {
    console.error('Failed to update user status to onboarded:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Update user status to active (in campaign)
export const updateUserStatusActive = async (req, res) => {
  try {
    const { userId, campaignId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        statusCode: 400,
      });
    }

    // First, try to find by userId
    let userStatus = await UserStatus.findOne({ userId: userId.toString() });

    // If not found by userId, try to find by providerMessagingId
    if (!userStatus) {
      userStatus = await UserStatus.findOne({ providerMessagingId: userId.toString() });
    }

    // If still not found by providerMessagingId, try to find by providerId
    if (!userStatus) {
      userStatus = await UserStatus.findOne({ providerId: userId.toString() });
    }

    if (userStatus) {
      // Update existing user status
      userStatus.status = 'active';
      userStatus.lastContacted = new Date();

      if (campaignId) {
        // Add campaignId to campaignIds array if not already present
        if (!userStatus.campaignIds) {
          userStatus.campaignIds = [];
        }
        if (!userStatus.campaignIds.includes(campaignId)) {
          userStatus.campaignIds.push(campaignId);
        }
      }

      await userStatus.save();
    } else {
      // Create new user status if not found
      userStatus = new UserStatus({
        userId,
        status: 'active',
        source: 'direct',
        lastContacted: new Date(),
        campaignIds: campaignId ? [campaignId] : [],
      });
      await userStatus.save();
    }

    return res.status(200).json({
      success: true,
      data: userStatus,
      message: 'User status updated to active',
    });
  } catch (error) {
    console.error('Failed to update user status to active:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Get all user statuses with filtering
export const getUserStatuses = async (req, res) => {
  try {
    const { status, source, limit = 50, skip = 0, search } = req.query;

    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (source) {
      filter.source = source;
    }

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { providerMessagingId: { $regex: search, $options: 'i' } },
        { providerId: { $regex: search, $options: 'i' } },
      ];
    }

    const userStatuses = await UserStatus.find(filter)
      .sort({ lastContacted: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('campaignIds', 'name status');

    const total = await UserStatus.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: userStatuses,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch user statuses:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user statuses',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Get user status stats
export const getUserStatusStats = async (req, res) => {
  try {
    const stats = await UserStatus.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const sourceStats = await UserStatus.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalUsers = await UserStatus.countDocuments();
    const totalMessages = await UserStatus.aggregate([
      { $group: { _id: null, total: { $sum: '$messageCount' } } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        statusBreakdown: stats,
        sourceBreakdown: sourceStats,
        totalUsers,
        totalMessages: totalMessages[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch user status stats:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user status stats',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Delete user status
export const deleteUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        statusCode: 400,
      });
    }

    const deletedUser = await UserStatus.findOneAndDelete({ userId });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: 'User status not found',
        statusCode: 404,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User status deleted successfully',
      data: deletedUser,
    });
  } catch (error) {
    console.error('Failed to delete user status:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user status',
      statusCode: 500,
      message: error.message,
    });
  }
};

// Influencer Growth Tracking Functions
export const saveInfluencerGrowth = async (req, res) => {
  try {
    const {
      id,
      username,
      name,
      profilePicture,
      profilePictureData,
      isPrivate,
      isVerified,
      followersCount,
      followingCount,
      providerMessagingId
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Influencer ID is required",
        statusCode: 400,
      });
    }

    // Find existing influencer or create new one
    let influencer = await InfluencerGrowth.findOne({ id: id.toString() });

    if (influencer) {
      // Update existing influencer - add to growth history if counts changed
      const lastHistory = influencer.growthHistory[influencer.growthHistory.length - 1];

      if (lastHistory &&
          (lastHistory.followersCount !== followersCount ||
           lastHistory.followingCount !== followingCount)) {
        // Add new growth data point
        influencer.growthHistory.push({
          followersCount,
          followingCount,
          timestamp: new Date(),
        });
      }

      // Update current data
      influencer.username = username;
      influencer.name = name;
      influencer.profilePicture = profilePicture;
      influencer.profilePictureData = profilePictureData;
      influencer.isPrivate = isPrivate;
      influencer.isVerified = isVerified;
      influencer.followersCount = followersCount;
      influencer.followingCount = followingCount;
      influencer.providerMessagingId = providerMessagingId;
      influencer.lastUpdatedAt = new Date();

      await influencer.save();
    } else {
      // Create new influencer
      influencer = new InfluencerGrowth({
        id: id.toString(),
        username,
        name,
        profilePicture,
        profilePictureData,
        isPrivate,
        isVerified,
        followersCount,
        followingCount,
        providerMessagingId,
        growthHistory: [{
          followersCount,
          followingCount,
          timestamp: new Date(),
        }],
      });

      await influencer.save();
    }

    return res.status(200).json({
      success: true,
      data: influencer,
      message: "Influencer growth data saved successfully",
    });
  } catch (error) {
    console.error("Failed to save influencer growth data:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to save influencer growth data",
      statusCode: 500,
      message: error.message,
    });
  }
};

export const getInfluencerGrowth = async (req, res) => {
  try {
    const influencers = await InfluencerGrowth.find({})
      .sort({ lastUpdatedAt: -1 })
      .select("-__v");

    return res.status(200).json({
      success: true,
      data: influencers,
      count: influencers.length,
    });
  } catch (error) {
    console.error("Failed to fetch influencer growth data:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch influencer growth data",
      statusCode: 500,
      message: error.message,
    });
  }
};

export const getInfluencerGrowthById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Influencer ID is required",
        statusCode: 400,
      });
    }

    const influencer = await InfluencerGrowth.findOne({ id: id.toString() });

    if (!influencer) {
      return res.status(404).json({
        success: false,
        error: "Influencer not found",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      success: true,
      data: influencer,
    });
  } catch (error) {
    console.error("Failed to fetch influencer growth data:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch influencer growth data",
      statusCode: 500,
      message: error.message,
    });
  }
};

// Refresh Influencer Data
export const refreshInfluencerData = async (req, res) => {
  try {
    const { influencerId } = req.body;

    if (!influencerId) {
      return res.status(400).json({
        success: false,
        error: "Influencer ID is required",
        statusCode: 400,
      });
    }

    // Find the influencer in our database
    const influencer = await InfluencerGrowth.findOne({ id: influencerId.toString() });

    if (!influencer) {
      return res.status(404).json({
        success: false,
        error: "Influencer not found",
        statusCode: 404,
      });
    }

    // Get linked accounts to use for API calls
    const { apiUrl, accessToken } = getUnipileConfig();

    if (!accessToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: "Unipile API not configured",
        statusCode: 400,
      });
    }

    let accountId;
    try {
      const accountsResponse = await axios.get(`${apiUrl}/api/v1/accounts`, {
        headers: getUnipileHeaders(accessToken),
        timeout: 10000,
      });

      if (accountsResponse.data && accountsResponse.data.items && accountsResponse.data.items.length > 0) {
        // Use the first available account
        accountId = accountsResponse.data.items[0].id;
      } else {
        return res.status(400).json({
          success: false,
          error: "No linked accounts available for API calls",
          statusCode: 400,
        });
      }
    } catch (accountError) {
      console.error("Failed to fetch linked accounts:", accountError.message);
      return res.status(400).json({
        success: false,
        error: "Failed to fetch linked accounts",
        statusCode: 400,
      });
    }

    // Call Unipile API to get latest profile data
    const unipileResponse = await fetch(
      `https://api24.unipile.com:15469/api/v1/users/${influencerId}?account_id=${accountId}`,
      {
        method: "GET",
        headers: {
          "accept": "application/json",
          "X-API-KEY": process.env.UNIPILE_API_KEY || "3nFd5JpY.KIGhHHiUZly0cj03nVnZPjxHHcmwKEIfU+IeLcgE8OE="
        }
      }
    );

    if (!unipileResponse.ok) {
      throw new Error(`Unipile API error: ${unipileResponse.status}`);
    }

    const latestProfileData = await unipileResponse.json();

    // Extract the data we need
    const {
      full_name,
      public_identifier,
      profile_picture_url,
      profile_picture_url_large,
      biography,
      category,
      followers_count,
      following_count,
      is_verified,
      is_private,
      provider_messaging_id
    } = latestProfileData;

    // Always calculate growth from the FIRST data point (when message was sent)
    const firstHistoryPoint = influencer.growthHistory[0]; // Always use the first entry
    const originalFollowers = firstHistoryPoint.followersCount;
    const originalFollowing = firstHistoryPoint.followingCount;

    // Calculate total growth since first message was sent
    const followersGrowth = followers_count - originalFollowers;
    const followingGrowth = following_count - originalFollowing;

    // Add new data point to growth history
    influencer.growthHistory.push({
      followersCount: followers_count,
      followingCount: following_count,
      timestamp: new Date(),
    });

    // Update current data
    influencer.name = full_name;
    influencer.username = public_identifier;
    influencer.profilePicture = profile_picture_url;
    influencer.followersCount = followers_count;
    influencer.followingCount = following_count;
    influencer.isVerified = is_verified;
    influencer.isPrivate = is_private;
    influencer.providerMessagingId = provider_messaging_id;
    influencer.lastUpdatedAt = new Date();

    // Add growth metrics
    influencer.latestGrowth = {
      followersGrowth,
      followingGrowth,
      lastUpdated: new Date()
    };

    await influencer.save();

    return res.status(200).json({
      success: true,
      data: influencer,
      growth: {
        followersGrowth,
        followingGrowth,
        originalFollowers,
        originalFollowing,
        currentFollowers: followers_count,
        currentFollowing: following_count
      },
      message: "Influencer data refreshed successfully",
    });
  } catch (error) {
    console.error("Failed to refresh influencer data:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to refresh influencer data",
      statusCode: 500,
      message: error.message,
    });
  }
};

export const deleteInfluencerGrowth = async (req, res) => {
  try {
    const { ids } = req.body; // Array of influencer IDs to delete

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "Please provide an array of influencer IDs to delete",
      });
    }

    const result = await InfluencerGrowth.deleteMany({ id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} influencer growth record(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting influencer growth data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete influencer growth data",
      message: error.message,
    });
  }
};
