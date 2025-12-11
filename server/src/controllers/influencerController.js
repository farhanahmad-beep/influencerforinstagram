import Influencer from '../models/Influencer.js';
import axios from 'axios';
import { Buffer } from 'buffer';

// Helper function to get Unipile API configuration (read from env at runtime)
const getUnipileConfig = () => {
  const apiUrl = process.env.UNIPILE_API_URL?.replace(/\/$/, '') || '';
  const accessToken = process.env.UNIPILE_ACCESS_TOKEN || '';
  return { apiUrl, accessToken };
};

// Helper function to get Unipile API headers
const getUnipileHeaders = (accessToken) => ({
  'accept': 'application/json',
  'X-API-KEY': accessToken,
  'Content-Type': 'application/json',
});

// In-memory counter for sent messages (resets on server restart)
let messageCount = 0;

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
  if (!userId || !accountId) return { followersCount: 0, followingCount: 0 };
  
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
      };
    }
  } catch (err) {
    // Silently fail - return default counts
    console.error(`Failed to fetch counts for user ${userId}:`, err.message);
  }
  
  return { followersCount: 0, followingCount: 0 };
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

    return res.status(200).json({
      success: true,
      data: {
        linkedAccounts: linkedAccountsCount,
        messagesSent: messageCount,
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
        
        // Increment in-memory counter for messages sent
        messageCount += 1;

        return res.status(200).json({
          success: true,
          data: unipileResponse.data,
          message: 'Chat started successfully',
          stats: {
            messagesSent: messageCount,
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
            };
          },
          5 // Process 5 users at a time to avoid overwhelming the API
        ) : followingBasic.map(f => ({ ...f, followersCount: 0, followingCount: 0 }));

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
            };
          },
          5 // Process 5 users at a time to avoid overwhelming the API
        ) : followersBasic.map(f => ({ ...f, followersCount: 0, followingCount: 0 }));

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
