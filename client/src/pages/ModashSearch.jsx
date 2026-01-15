import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const ModashSearch = () => {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [languageSearch, setLanguageSearch] = useState('');
  const [languageResults, setLanguageResults] = useState([]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [interestSearch, setInterestSearch] = useState('');
  const [interestResults, setInterestResults] = useState([]);
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [isAISearch, setIsAISearch] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isUserSearch, setIsUserSearch] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageType, setImageType] = useState('');
  const [base64Image, setBase64Image] = useState('');
  const resultsRef = useRef(null);
  const [searchParams, setSearchParams] = useState({
    calculationMethod: 'median',
    sort: {
      field: 'followers',
      value: 10000,
      direction: 'desc'
    },
    filter: {
      influencer: {
        followers: { min: '', max: '' },
        engagementRate: 0.01,
        location: [],
        language: '',
        lastposted: 90,
        relevance: [],
        audienceRelevance: [],
        gender: '',
        age: { min: '', max: '' },
        followersGrowthRate: {
          interval: 'i6months',
          value: 0.01,
          operator: 'gt'
        },
        bio: '',
        hasYouTube: false,
        hasContactDetails: [],
        accountTypes: [],
        brands: [],
        interests: [],
        keywords: '',
        textTags: [],
        reelsPlays: { min: 1000, max: 10000000 },
        isVerified: false,
        hasSponsoredPosts: false,
        engagements: { min: 100, max: 10000 }
      }
      // Removed audience section - causing validation errors with ageRange values
    }
  });

  // Clean searchParams on mount to ensure no audience section
  useEffect(() => {
    setSearchParams(prev => {
      const clean = { ...prev };
      if (clean.filter.audience) {
        delete clean.filter.audience;
      }
      return clean;
    });
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be less than 5MB');
      return;
    }

    try {
      // Compress and resize image to ensure base64 < 1MB
      const compressedBase64 = await compressImage(file);

      setSelectedImage(file);
      setImageType(file.type);
      setBase64Image(compressedBase64);
      toast.success('Image uploaded and compressed successfully');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions to ensure base64 < 1MB
        // Base64 is ~33% larger than original, so target ~750KB original size
        const maxSizeBytes = 750 * 1024; // 750KB target for ~1MB base64
        let { width, height } = img;

        // Calculate current file size estimate
        const aspectRatio = width / height;
        let newWidth = width;
        let newHeight = height;

        // Estimate compressed size and resize if needed
        const estimatedSize = (width * height * 3) * 0.8; // Rough estimate with compression
        if (estimatedSize > maxSizeBytes) {
          const scale = Math.sqrt(maxSizeBytes / estimatedSize);
          newWidth = Math.floor(width * scale);
          newHeight = Math.floor(height * scale);
        }

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to base64 with quality adjustment
        let quality = 0.9;
        let base64 = canvas.toDataURL(file.type, quality).split(',')[1];

        // If still too large, reduce quality further
        while (base64.length > 1024 * 1024 && quality > 0.1) { // 1MB limit
          quality -= 0.1;
          base64 = canvas.toDataURL(file.type, quality).split(',')[1];
        }

        // Final check - if still too large, reduce dimensions further
        if (base64.length > 1024 * 1024) {
          const emergencyScale = Math.sqrt((1024 * 1024 * 0.75) / base64.length);
          canvas.width = Math.floor(newWidth * emergencyScale);
          canvas.height = Math.floor(newHeight * emergencyScale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          base64 = canvas.toDataURL(file.type, 0.7).split(',')[1];
        }

        resolve(base64);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const fetchLinkedAccounts = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/linked-accounts`, {
        withCredentials: true,
      });

      if (response.data.success && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].id; // Return the first account ID
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch linked accounts:', error);
      toast.error('Failed to fetch linked accounts');
      return null;
    }
  };

  const handleDetailClick = async (influencer) => {
    const accountId = await fetchLinkedAccounts();
    if (accountId && influencer.id) {
      navigate(`/user-profile/${influencer.id}?account_id=${accountId}`, {
        state: {
          accountId: accountId,
          from: 'modash-search',
          influencerData: {
            username: influencer.username,
            name: influencer.name,
            profilePicture: influencer.profilePicture,
            followersCount: influencer.followersCount,
            followingCount: influencer.followingCount,
            isVerified: influencer.isVerified,
            isPrivate: influencer.isPrivate,
            bio: influencer.bio,
            providerMessagingId: influencer.providerMessagingId,
            url: influencer.url
          }
        }
      });
    } else {
      toast.error('Unable to open profile details');
    }
  };

  const handleInputChange = (field, value, nestedPath = []) => {
    setSearchParams(prev => {
      let updated = { ...prev };
      let current = updated;

      // Navigate to nested path
      for (const path of nestedPath) {
        if (!current[path]) current[path] = {};
        current = current[path];
      }

      current[field] = value;
      return updated;
    });
  };

  const handleArrayChange = (field, value, nestedPath = []) => {
    const values = value.split(',').map(v => v.trim()).filter(v => v);
    handleInputChange(field, values, nestedPath);
  };

  const searchLocations = async (query) => {
    if (!query.trim()) {
      setLocationResults([]);
      setShowLocationDropdown(false);
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/locations`, {
        params: { query, limit: 30 },
        withCredentials: true,
      });

      if (response.data && response.data.data && response.data.data.locations) {
        setLocationResults(response.data.data.locations);
        setShowLocationDropdown(true);
      } else {
        setLocationResults([]);
        setShowLocationDropdown(false);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setLocationResults([]);
      setShowLocationDropdown(false);
    }
  };

  const addLocation = (location) => {
    const currentLocations = searchParams.filter.influencer.location || [];
    if (!currentLocations.includes(location.id)) {
      const newLocations = [...currentLocations, location.id];
      handleInputChange('location', newLocations, ['filter', 'influencer']);

      // Also store the full location object for display
      setSelectedLocations(prev => {
        const updated = [...prev];
        if (!updated.find(loc => loc.id === location.id)) {
          updated.push(location);
        }
        return updated;
      });
    }
    setLocationSearch('');
    setShowLocationDropdown(false);
  };

  const removeLocation = (locationId) => {
    const currentLocations = searchParams.filter.influencer.location || [];
    const newLocations = currentLocations.filter(id => id !== locationId);
    handleInputChange('location', newLocations, ['filter', 'influencer']);

    // Also remove from selectedLocations
    setSelectedLocations(prev => {
      const updated = prev.filter(loc => loc.id !== locationId);
      return updated;
    });
  };

  const searchLanguages = async (query) => {
    if (!query.trim()) {
      setLanguageResults([]);
      setShowLanguageDropdown(false);
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/languages`, {
        params: { query, limit: 30 },
        withCredentials: true,
      });

      if (response.data && response.data.data && response.data.data.languages) {
        setLanguageResults(response.data.data.languages);
        setShowLanguageDropdown(true);
      } else {
        setLanguageResults([]);
        setShowLanguageDropdown(false);
      }
    } catch (error) {
      console.error('Language search error:', error);
      setLanguageResults([]);
      setShowLanguageDropdown(false);
    }
  };

  const searchInterests = async (query) => {
    if (!query.trim()) {
      setInterestResults([]);
      setShowInterestDropdown(false);
      return;
    }

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/interests`, {
        params: { query, limit: 30 },
        withCredentials: true,
      });

      if (response.data && response.data.data && response.data.data.interests) {
        setInterestResults(response.data.data.interests);
        setShowInterestDropdown(true);
      } else {
        setInterestResults([]);
        setShowInterestDropdown(false);
      }
    } catch (error) {
      console.error('Interest search error:', error);
      setInterestResults([]);
      setShowInterestDropdown(false);
    }
  };

  const addLanguage = (language) => {
    // For languages, we use the language code (not an array like locations)
    handleInputChange('language', language.code, ['filter', 'influencer']);
    setSelectedLanguage(language);
    setLanguageSearch('');
    setShowLanguageDropdown(false);
  };

  const removeLanguage = () => {
    handleInputChange('language', '', ['filter', 'influencer']);
    setSelectedLanguage(null);
    setLanguageSearch('');
  };

  const addInterest = (interest) => {
    const currentInterests = searchParams.filter.influencer.interests || [];
    if (!currentInterests.includes(interest.id)) {
      const newInterests = [...currentInterests, interest.id];
      handleInputChange('interests', newInterests, ['filter', 'influencer']);

      // Also store the full interest object for display
      setSelectedInterests(prev => {
        const updated = [...prev];
        if (!updated.find(int => int.id === interest.id)) {
          updated.push(interest);
        }
        return updated;
      });
    }
    setInterestSearch('');
    setShowInterestDropdown(false);
  };

  const removeInterest = (interestId) => {
    const currentInterests = searchParams.filter.influencer.interests || [];
    const newInterests = currentInterests.filter(id => id !== interestId);
    handleInputChange('interests', newInterests, ['filter', 'influencer']);

    // Also remove from selectedInterests
    setSelectedInterests(prev => {
      const updated = prev.filter(int => int.id !== interestId);
      return updated;
    });
  };

  // Helper function to map age values to valid API values
  const mapAgeToValidValue = (age, isMin = false) => {
    const validMinValues = [13, 18, 25, 35, 45, 65];
    const validMaxValues = [18, 25, 35, 45, 65];

    const validValues = isMin ? validMinValues : validMaxValues;
    const numAge = parseInt(age) || (isMin ? 13 : 65);

    // Find the closest valid value
    let closest = validValues[0];
    let minDiff = Math.abs(numAge - closest);

    for (const value of validValues) {
      const diff = Math.abs(numAge - value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = value;
      }
    }

    return closest.toString();
  };

  const performAISearch = async (page = 0, appendResults = false) => {
    if (appendResults) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearchResults([]);
      setCurrentPage(0);
      setTotalResults(0);
      setHasMoreResults(false);
    }

    // Build AI search payload
    const aiPayload = {
      page,
      query: aiQuery,
      filters: {}
    };

    // Only add filters if they have valid values
    if (searchParams.filter.influencer.followers.min || searchParams.filter.influencer.followers.max) {
      aiPayload.filters.followersCount = {
        min: searchParams.filter.influencer.followers.min || 1000,
        max: searchParams.filter.influencer.followers.max || 1000000
      };
    }

    if (searchParams.filter.influencer.location && searchParams.filter.influencer.location.length > 0) {
      aiPayload.filters.locations = searchParams.filter.influencer.location;
    }

    if (searchParams.filter.influencer.gender && searchParams.filter.influencer.gender !== '') {
      aiPayload.filters.gender = searchParams.filter.influencer.gender;
    }

    aiPayload.filters.lastPostedInDays = searchParams.filter.influencer.lastposted || 90;

    if (searchParams.filter.influencer.language && searchParams.filter.influencer.language !== '') {
      aiPayload.filters.language = searchParams.filter.influencer.language;
    }

    if (searchParams.filter.influencer.age?.min || searchParams.filter.influencer.age?.max) {
      aiPayload.filters.age = {
        min: mapAgeToValidValue(searchParams.filter.influencer.age?.min, true),
        max: mapAgeToValidValue(searchParams.filter.influencer.age?.max, false)
      };
    }

    if (searchParams.filter.influencer.engagementRate && searchParams.filter.influencer.engagementRate > 0) {
      aiPayload.filters.engagementRate = {
        min: searchParams.filter.influencer.engagementRate
      };
    }


    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/influencers/ai/text-search`, aiPayload, {
        withCredentials: true,
      });

        if (response.data.success && response.data.data) {
          const aiData = response.data.data;

          // Transform AI search results to match expected influencer format
          const results = aiData.profiles.map(profile => ({
            id: profile.userId,
            username: profile.username,
            name: profile.fullName || profile.username,
            profilePicture: profile.profilePicture,
            followersCount: profile.followersCount,
            engagementRate: profile.engagementRate / 100, // AI API returns percentage as decimal (10.71 = 10.71%)
            bio: profile.accountCategory,
            matchedPosts: profile.matchedPosts || [],
            recentPosts: profile.recentPosts || [],
            isFromAISearch: true, // Flag to identify AI search results
            // Add other fields as needed
          }));

          if (appendResults) {
            setSearchResults(prev => [...prev, ...results]);
            setCurrentPage(page);
          } else {
            setSearchResults(results);
            setCurrentPage(0);
            setTotalResults(aiData.total || results.length);
          }

          setHasMoreResults((page + 1) * 6 < (aiData.total || 0)); // AI API returns max 6 per page

        if (!appendResults) {
          if (results.length > 0) {
            toast.success(`Found ${results.length} of ${aiData.total || results.length} influencers matching your AI query`);
            // Scroll to results after a delay to allow UI to update
            setTimeout(() => scrollToResults(), 300);
          } else {
            toast.success('No influencers found matching your criteria');
          }
        } else if (results.length > 0) {
          toast.success(`Loaded ${results.length} more influencers`);
        }
      } else {
        console.error('AI API Error:', response.data);
        toast.error(response.data.error || "AI search failed");
        setSearchResults([]);
        setHasMoreResults(false);
      }
    } catch (error) {
      console.error("AI search error:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "AI search failed";
      toast.error(errorMessage);
      setSearchResults([]);
      setHasMoreResults(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const performUserSearch = async (page = 0, appendResults = false) => {
    if (appendResults) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearchResults([]);
      setCurrentPage(0);
      setTotalResults(0);
      setHasMoreResults(false);
    }

    try {
      const limit = 100; // Show up to 100 users
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/instagram/users`, {
        params: { query: userQuery.trim(), limit },
        withCredentials: true,
      });

      if (response.data.success && response.data.data) {
        const userData = response.data.data;

        // Transform user search results to match expected influencer format
        const results = userData.users.map(user => ({
          id: user.userId,
          username: user.username,
          name: user.fullname || user.username,
          profilePicture: user.picture,
          followersCount: user.followers,
          isVerified: user.isVerified,
          isFromUserSearch: true, // Flag to identify user search results
        }));

        if (appendResults) {
          setSearchResults(prev => [...prev, ...results]);
          setCurrentPage(page);
        } else {
          setSearchResults(results);
          setCurrentPage(0);
          setTotalResults(results.length);
        }

        setHasMoreResults(false); // User search doesn't support pagination in this implementation

        if (!appendResults) {
          if (results.length > 0) {
            toast.success(`Found ${results.length} users matching "${userQuery}"`);
            // Scroll to results after a delay to allow UI to update
            setTimeout(() => scrollToResults(), 300);
          } else {
            toast.success('No users found matching your search');
          }
        }
      } else {
        console.error('User search API Error:', response.data);
        toast.error(response.data.error || "User search failed");
        setSearchResults([]);
        setHasMoreResults(false);
      }
    } catch (error) {
      console.error("User search error:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "User search failed";
      toast.error(errorMessage);
      setSearchResults([]);
      setHasMoreResults(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const performImageSearch = async (page = 0, appendResults = false) => {
    if (appendResults) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearchResults([]);
      setCurrentPage(0);
      setTotalResults(0);
      setHasMoreResults(false);
    }

    // Build image search payload
    const imagePayload = {
      page,
      imageType,
      base64Image,
      filters: {}
    };

    // Add follower filters if specified
    if (searchParams.filter.influencer.followers.min || searchParams.filter.influencer.followers.max) {
      imagePayload.filters.followersCount = {
        min: searchParams.filter.influencer.followers.min || 0,
        max: searchParams.filter.influencer.followers.max || 0
      };
    }

    // Add location filters
    if (searchParams.filter.influencer.location && searchParams.filter.influencer.location.length > 0) {
      imagePayload.filters.locations = searchParams.filter.influencer.location;
    }

    // Add gender filter
    if (searchParams.filter.influencer.gender && searchParams.filter.influencer.gender !== '') {
      imagePayload.filters.gender = searchParams.filter.influencer.gender;
    }

    // Add last posted filter
    if (searchParams.filter.influencer.lastposted) {
      imagePayload.filters.lastPostedInDays = searchParams.filter.influencer.lastposted;
    }

    // Add language filter
    if (searchParams.filter.influencer.language && searchParams.filter.influencer.language !== '') {
      imagePayload.filters.language = searchParams.filter.influencer.language;
    }

    // Add age filters
    if (searchParams.filter.influencer.age?.min || searchParams.filter.influencer.age?.max) {
      imagePayload.filters.age = {
        min: searchParams.filter.influencer.age?.min,
        max: searchParams.filter.influencer.age?.max
      };
    }

    // Add engagement rate filter
    if (searchParams.filter.influencer.engagementRate && searchParams.filter.influencer.engagementRate > 0) {
      imagePayload.filters.engagementRate = {
        min: searchParams.filter.influencer.engagementRate
      };
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/influencers/ai/instagram/image-search`, imagePayload, {
        withCredentials: true,
      });

      if (response.data.success && response.data.data) {
        const imageData = response.data.data;

        // Transform image search results to match expected influencer format
        const results = imageData.profiles.map(profile => ({
          id: profile.userId,
          username: profile.username,
          name: profile.fullName || profile.username,
          profilePicture: profile.profilePicture,
          followersCount: profile.followersCount,
          engagementRate: profile.engagementRate / 100, // Convert to decimal (5.09% -> 0.0509)
          bio: profile.accountCategory,
          matchedPosts: profile.matchedPosts || [],
          recentPosts: profile.recentPosts || [],
          isFromImageSearch: true, // Flag to identify image search results
          // Additional fields from image search response
          accountCategory: profile.accountCategory,
        }));

        if (appendResults) {
          setSearchResults(prev => [...prev, ...results]);
          setCurrentPage(page);
        } else {
          setSearchResults(results);
          setCurrentPage(0);
          setTotalResults(imageData.total || results.length);
        }

        setHasMoreResults((page + 1) * 6 < (imageData.total || 0)); // Image API returns max 6 per page

        if (!appendResults) {
          if (results.length > 0) {
            toast.success(`Found ${results.length} of ${imageData.total || results.length} influencers matching your image`);
            // Scroll to results after a delay to allow UI to update
            setTimeout(() => scrollToResults(), 1000);
          } else {
            toast.success('No influencers found matching your image');
          }
        } else if (results.length > 0) {
          toast.success(`Loaded ${results.length} more influencers`);
        }
      } else {
        console.error('Image search API Error:', response.data);
        toast.error(response.data.error || "Image search failed");
        setSearchResults([]);
        setHasMoreResults(false);
      }
    } catch (error) {
      console.error("Image search error:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Image search failed";
      toast.error(errorMessage);
      setSearchResults([]);
      setHasMoreResults(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const performSearch = async (page = 0, appendResults = false) => {
    // Use image search if image is selected
    if (selectedImage && base64Image) {
      return performImageSearch(page);
    }

    // Use AI search if enabled and query is provided
    if (isAISearch && aiQuery.trim()) {
      return performAISearch(page);
    }

    // Use user search if enabled and query is provided
    if (isUserSearch && userQuery.trim()) {
      return performUserSearch(page);
    }

    const isLoadingMore = appendResults;
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearchResults([]);
      setCurrentPage(0);
      setTotalResults(0);
      setHasMoreResults(false);
    }

    // Remove audience section to prevent validation errors
    const cleanParams = { ...searchParams, page };
    if (cleanParams.filter.audience) {
      delete cleanParams.filter.audience;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/influencers/instagram/search`, cleanParams, {
        withCredentials: true,
      });

      if (response.data.success) {
        // Handle different possible response structures from Modash API
        let results = [];
        if (Array.isArray(response.data.data)) {
          results = response.data.data;
        } else if (response.data.data && Array.isArray(response.data.data.lookalikes)) {
          // Transform lookalikes data to match expected influencer format with all available fields
          results = response.data.data.lookalikes.map(lookalike => ({
            id: lookalike.userId,
            username: lookalike.profile?.username || lookalike.userId,
            name: lookalike.profile?.fullname || lookalike.profile?.full_name || lookalike.profile?.username || `User ${lookalike.userId}`,
            profilePicture: lookalike.profile?.picture || lookalike.profile?.profile_picture_url,
            followersCount: lookalike.profile?.followers,
            followingCount: lookalike.profile?.following_count,
            bio: lookalike.profile?.biography,
            isVerified: lookalike.profile?.isVerified,
            isPrivate: lookalike.profile?.isPrivate,
            // Additional fields from the profile
            engagementRate: lookalike.profile?.engagementRate,
            engagements: lookalike.profile?.engagements,
            url: lookalike.profile?.url,
            // Match data
            matchScore: lookalike.match?.score,
            matchReason: lookalike.match?.reason
          }));
        } else if (response.data.data && Array.isArray(response.data.data.influencers)) {
          results = response.data.data.influencers;
        } else if (response.data.data && typeof response.data.data === 'object' && response.data.data.influencers) {
          results = Array.isArray(response.data.data.influencers) ? response.data.data.influencers : [];
        } else if (Array.isArray(response.data)) {
          results = response.data;
        } else {
          results = [];
        }

        // Check if there are more results (API returns 15 results per page, check total count)
        // The Modash API response includes a total field showing total matching influencers
        const totalResults = response.data.data?.total || 0;
        const currentTotal = appendResults ? searchResults.length + results.length : results.length;
        const hasMore = currentTotal < totalResults;

        if (appendResults) {
          setSearchResults(prev => [...prev, ...results]);
          setCurrentPage(page);
        } else {
          setSearchResults(results);
          setCurrentPage(0);
          setTotalResults(totalResults);
        }

        setHasMoreResults(hasMore);

        if (!appendResults) {
          const message = totalResults > results.length
            ? `Found ${results.length} of ${totalResults} influencers (load more for remaining ${totalResults - results.length})`
            : `Found ${results.length} influencers`;
          toast.success(message);
          // Scroll to results after a delay to allow UI to update
          setTimeout(() => scrollToResults(), 1000);
        } else if (results.length > 0) {
          toast.success(`Loaded ${results.length} more influencers`);
        }
      } else {
        console.error('API Error:', response.data);
        toast.error(response.data.error || "Search failed");
        if (!appendResults) {
          setSearchResults([]);
          setHasMoreResults(false);
        }
      }
    } catch (error) {
      console.error("Modash search error:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Search failed";
      toast.error(errorMessage);
      if (!appendResults) {
        setSearchResults([]);
        setHasMoreResults(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    if (selectedImage && base64Image) {
      // Image search - image is already validated
      performImageSearch(0);
    } else if (isAISearch) {
      if (!aiQuery.trim()) {
        toast.error('Please enter an AI search query');
        return;
      }
      performAISearch(0);
    } else if (isUserSearch) {
      if (!userQuery.trim() || userQuery.trim().length < 2) {
        toast.error('Please enter at least 2 characters for user search');
        return;
      }
      performUserSearch(0);
    } else {
      // Traditional search validation - require at least follower range
      const hasFollowers = searchParams.filter.influencer.followers.min ||
                          searchParams.filter.influencer.followers.max;

      if (!hasFollowers) {
        toast.error('Please enter at least a follower range (min or max followers)');
        return;
      }

      performSearch(0, false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    if (selectedImage && base64Image) {
      performImageSearch(nextPage, true);
    } else if (isAISearch) {
      performAISearch(nextPage, true);
    } else if (isUserSearch) {
      performUserSearch(nextPage, true);
    } else {
      performSearch(nextPage, true);
    }
  };

  const handleDownloadCSV = () => {
    if (searchResults.length === 0) {
      toast.error("No data to download");
      return;
    }

    try {
      // Define comprehensive CSV headers for all possible fields
      const headers = [
        'ID',
        'Username',
        'Name',
        'Followers Count',
        'Following Count',
        'Engagement Rate (%)',
        'Engagements',
        'Bio/Account Category',
        'Is Verified',
        'Is Private',
        'URL',
        'Search Type',
        'Provider',
        'Provider ID',
        'Provider Messaging ID'
      ];

      // Convert data to CSV rows with comprehensive field mapping
      const csvRows = searchResults.map(user => {
        // Determine search type
        let searchType = 'Traditional';
        if (user.isFromAISearch) searchType = 'AI Search';
        else if (user.isFromImageSearch) searchType = 'Image Search';
        else if (user.isFromUserSearch) searchType = 'User Search';

        // Handle engagement rate (convert from decimal to percentage)
        const engagementRate = user.engagementRate !== undefined
          ? (user.engagementRate * 100).toFixed(2)
          : '';

        return [
          user.id || '',
          user.username || '',
          user.name || '',
          user.followersCount || 0,
          user.followingCount || 0,
          engagementRate,
          user.engagements || '',
          user.bio || user.accountCategory || '',
          user.isVerified ? 'Yes' : 'No',
          user.isPrivate ? 'Yes' : 'No',
          user.url || '',
          searchType,
          user.provider || 'Instagram',
          user.id || '', // Use frontend ID as Provider ID
          user.providerMessagingId || ''
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row =>
          row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        // Generate filename with search type and timestamp
        let searchType = 'traditional';
        if (searchResults[0]?.isFromAISearch) searchType = 'ai';
        else if (searchResults[0]?.isFromImageSearch) searchType = 'image';
        else if (searchResults[0]?.isFromUserSearch) searchType = 'user';

        link.setAttribute('download', `modash_${searchType}_search_results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Downloaded ${searchResults.length} results to CSV`);

    } catch (error) {
      console.error('Failed to download CSV:', error);
      toast.error('Failed to download CSV');
    }
  };

  const scrollToResults = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="h-screen bg-secondary-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="content-container section-spacing lg:pt-4 pt-16">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-secondary-900">Influencer Search</h1>
            </div>
            <p className="text-secondary-600">Search for influencers globally using advanced filters</p>
          </div>

          {/* Search Filters */}
          <div className="card mb-6">
            <div className="flex items-center flex-wrap gap-4 mb-4">
              {!isUserSearch && (
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-secondary-700">AI Mode</label>
                  <button
                    onClick={() => setIsAISearch(!isAISearch)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isAISearch ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isAISearch ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
              {!isAISearch && (
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-secondary-700">Search By Name</label>
                  <button
                    onClick={() => setIsUserSearch(!isUserSearch)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isUserSearch ? 'bg-black' : 'bg-secondary-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isUserSearch ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* HR line - Show when both AI and user search are not active */}
            {/* {!isAISearch && !isUserSearch && <hr className="mb-4 border-gray-300" />} */}

            {/* AI Search Toggle and Input - Show when user search is not active */}
            {!isUserSearch && isAISearch && (
              <div className="mb-4">
                  <div className="mb-4">
                  <label className="form-label">
                    Enter your query to discover matching influencers
                  </label>
                  <textarea
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    className="input-field w-full"
                    placeholder="Describe the influencer you're looking for (e.g., 'woman with curly hair lifting weights', 'fitness model in Los Angeles', 'tech entrepreneur with blue hair')"
                    rows="3"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Use natural language to describe the influencer. Max 1024 characters.
                  </p>
                </div>
              </div>
            )}

            {/* Traditional Filters Toggle */}
            {!isAISearch && !isUserSearch && (
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-secondary-700">
                    Use Traditional Filters
                  </h3>
                </div>
              </div>
            )}

            {/* User Search input - Show when user search is enabled */}
            {isUserSearch && (
              <div className="mb-4">
                <label className="form-label">
                  Enter username or full name
                </label>
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="input-field w-full"
                  placeholder="therock, Cristiano Ronaldo"
                />
                <p className="text-xs text-secondary-500 mt-1">
                  Search for influencers by their username or full name. Minimum 2 characters required.
                </p>
              </div>
            )}

            {/* Traditional Filters - Only show when not in user search mode */}
            {!isUserSearch && (
              <>

                {/* Image Upload for AI Image Search */}
                <div className="col-span-full mb-6">
                  <label className="form-label">
                    Image Search (Optional)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus-ring"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {selectedImage ? 'Change Image' : 'Upload Image'}
                    </label>
                    {selectedImage && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-secondary-600">{selectedImage.name}</span>
                        <button
                          onClick={() => {
                            setSelectedImage(null);
                            setImageType('');
                            setBase64Image('');
                          }}
                          className="text-error-600 hover:text-error-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedImage && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="Selected for search"
                        className="max-w-xs max-h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                  <p className="text-xs text-secondary-500 mt-1">
                    Upload an image to find influencers who post similar content. Max 5MB, JPEG/PNG/WebP only.
                  </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Filters */}
              <div>
                <label className="form-label">Min Followers</label>
                <input
                  type="number"
                  value={searchParams.filter.influencer.followers.min}
                  onChange={(e) => handleInputChange('followers', { ...searchParams.filter.influencer.followers, min: e.target.value ? parseInt(e.target.value) : '' }, ['filter', 'influencer'])}
                  className="input-field"
                  placeholder="10000"
                />
              </div>

              <div>
                <label className="form-label">Max Followers</label>
                <input
                  type="number"
                  value={searchParams.filter.influencer.followers.max}
                  onChange={(e) => handleInputChange('followers', { ...searchParams.filter.influencer.followers, max: e.target.value ? parseInt(e.target.value) : '' }, ['filter', 'influencer'])}
                  className="input-field"
                  placeholder="100000"
                />
              </div>

              <div>
                <label className="form-label">Keywords</label>
                <input
                  type="text"
                  value={searchParams.filter.influencer.keywords}
                  onChange={(e) => handleInputChange('keywords', e.target.value, ['filter', 'influencer'])}
                  className="input-field"
                  placeholder="fashion, lifestyle, cars"
                />
              </div>

              <div>
                <label className="form-label">Gender</label>
                <select
                  value={searchParams.filter.influencer.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value, ['filter', 'influencer'])}
                  className="input-field"
                >
                  <option value="">Any</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="KNOWN">Known</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>

              <div>
                <label className="form-label">Min Age</label>
                <input
                  type="number"
                  value={searchParams.filter.influencer.age?.min || ''}
                  onChange={(e) => handleInputChange('age', {
                    ...searchParams.filter.influencer.age,
                    min: e.target.value ? parseInt(e.target.value) : ''
                  }, ['filter', 'influencer'])}
                  className="input-field"
                  placeholder="18"
                  min="18"
                  max="65"
                />
              </div>

              <div>
                <label className="form-label">Max Age</label>
                <input
                  type="number"
                  value={searchParams.filter.influencer.age?.max || ''}
                  onChange={(e) => handleInputChange('age', {
                    ...searchParams.filter.influencer.age,
                    max: e.target.value ? parseInt(e.target.value) : ''
                  }, ['filter', 'influencer'])}
                  className="input-field"
                  placeholder="65"
                  min="18"
                  max="65"
                />
              </div>

              <div className="relative">
                <label className="form-label">Language</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedLanguage ? selectedLanguage.name : languageSearch}
                    onChange={(e) => {
                      if (selectedLanguage) {
                        // If a language is selected and user starts typing, clear selection
                        setSelectedLanguage(null);
                        handleInputChange('language', '', ['filter', 'influencer']);
                      }
                      setLanguageSearch(e.target.value);
                      searchLanguages(e.target.value);
                    }}
                  onFocus={() => {
                    if (languageResults.length > 0) {
                      setShowLanguageDropdown(true);
                    }
                  }}
                    onBlur={() => setTimeout(() => setShowLanguageDropdown(false), 300)}
                    className="input-field pr-8"
                    placeholder="Search for languages..."
                  />
                  {selectedLanguage && (
                    <button
                      onClick={removeLanguage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Language Dropdown */}
                {showLanguageDropdown && languageResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-300 rounded-md shadow-hard max-h-60 overflow-auto">
                    {languageResults.map((language) => (
                      <div
                        key={language.code}
                        className="px-4 py-2 hover:bg-secondary-100 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addLanguage(language);
                        }}
                      >
                        <div className="font-medium">{language.name}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Language */}
                {selectedLanguage && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {selectedLanguage.name}
                      <button
                        onClick={removeLanguage}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}

              </div>

              <div className="relative">
                <label className="form-label">Interests</label>
                <input
                  type="text"
                  value={interestSearch}
                  onChange={(e) => {
                    setInterestSearch(e.target.value);
                    searchInterests(e.target.value);
                  }}
                  onFocus={() => {
                    if (interestResults.length > 0) {
                      setShowInterestDropdown(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowInterestDropdown(false), 300)}
                  className="input-field"
                  placeholder="Search for interests..."
                />

                {/* Interest Dropdown */}
                {showInterestDropdown && interestResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-300 rounded-md shadow-hard max-h-60 overflow-auto">
                    {interestResults.map((interest) => (
                      <div
                        key={interest.id}
                        className="px-4 py-2 hover:bg-secondary-100 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addInterest(interest);
                        }}
                      >
                        <div className="font-medium">{interest.name}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Interests */}
                {selectedInterests.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedInterests.map((interest) => (
                      <span
                        key={interest.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                      >
                        {interest.name}
                        <button
                          onClick={() => removeInterest(interest.id)}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Min Engagement Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={searchParams.filter.influencer.engagementRate * 100}
                  onChange={(e) => handleInputChange('engagementRate', parseFloat(e.target.value) / 100 || 0, ['filter', 'influencer'])}
                  className="input-field"
                  placeholder="1.0"
                />
              </div>

              <div className="relative">
                <label className="form-label">Locations</label>
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    searchLocations(e.target.value);
                  }}
                  onFocus={() => {
                    if (locationResults.length > 0) {
                      setShowLocationDropdown(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowLocationDropdown(false), 300)}
                  className="input-field"
                  placeholder="Search for locations..."
                />

                {/* Location Dropdown */}
                {showLocationDropdown && locationResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-300 rounded-md shadow-hard max-h-60 overflow-auto">
                    {locationResults.map((location) => (
                      <div
                        key={location.id}
                        className="px-4 py-2 hover:bg-secondary-100 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addLocation(location);
                        }}
                      >
                        <div className="font-medium">{location.name}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Locations */}
                {selectedLocations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedLocations.map((location) => (
                      <span
                        key={location.id}
                        className="badge-accent"
                      >
                        {location.name}
                        <button
                          onClick={() => removeLocation(location.id)}
                          className="ml-1 text-accent-600 hover:text-accent-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center space-x-4 mt-6">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn-primary"
              >
                    {loading ? (
                      selectedImage ? "Image Searching..." :
                      isUserSearch ? "User Searching..." :
                      isAISearch ? "AI Searching..." : "Searching..."
                    ) : (
                      selectedImage ? "Search by Image" :
                      isUserSearch ? "Search Users" :
                      isAISearch ? "AI Search Influencers" : "Search Influencers"
                    )}
              </button>
            </div>
              </>
            )}

            {/* User Search - Show search button when in user search mode */}
            {isUserSearch && (
              <div className="flex items-center space-x-4 mt-6">
                <button
                  onClick={handleSearch}
                  disabled={loading || userQuery.trim().length < 2}
                  className="btn-primary"
                >
                  {loading ? "User Searching..." : "Search Users"}
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          <div ref={resultsRef}>
            {loading && searchResults.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : searchResults.length === 0 && !loading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card text-center py-12"
            >
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No Results</h3>
              <p className="text-secondary-500">Try adjusting your search filters.</p>
            </motion.div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600">
                    Showing <span className="font-semibold">{Array.isArray(searchResults) ? searchResults.length : 0}</span> of <span className="font-semibold">{totalResults || 'many'}</span> influencers
                    {searchResults.length > 0 && (
                      <span className="ml-2 badge-accent">
                        {searchResults[0]?.isFromAISearch ? 'AI Search Results' :
                         searchResults[0]?.isFromImageSearch ? 'Image Search Results' :
                         searchResults[0]?.isFromUserSearch ? 'User Search Results' : 'Traditional Search Results'}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                {hasMoreResults && (
                  <p className="text-xs text-black">
                    {((totalResults || 0) - (searchResults?.length || 0))} more available
                  </p>
                )}
                  <button
                    onClick={handleDownloadCSV}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {Array.isArray(searchResults) && searchResults.map((influencer, index) => (
                  <motion.div
                    key={influencer.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index % 20) * 0.05 }}
                    className="card hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 relative">
                        {influencer.profilePicture || influencer.avatar ? (
                          <img
                            src={influencer.profilePicture || influencer.avatar}
                            alt={influencer.username || influencer.handle}
                            className="w-20 h-20 rounded-full object-cover mx-auto"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto ${(influencer.profilePicture || influencer.avatar) ? 'hidden' : 'flex'}`}
                        >
                          <span className="text-black font-bold text-xl">
                            {(influencer.username || influencer.handle || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>

                        <div className="w-full">
                          {/* Name and Username */}
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <h3 className="text-sm font-semibold text-secondary-900 truncate">
                              {influencer.name || 'Unknown'}
                            </h3>
                            {influencer.isVerified && (
                              <span className="text-blue-500 flex-shrink-0" title="Verified">
                                ✓
                              </span>
                            )}
                            {influencer.isPrivate && (
                              <span className="text-secondary-400 flex-shrink-0" title="Private Account">
                                🔒
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary-500 mb-2">@{influencer.username}</p>

                          {/* Profile URL */}
                          {influencer.url && (
                            <a
                              href={influencer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-700 mb-2 block truncate"
                              title={influencer.url}
                            >
                              View Profile →
                            </a>
                          )}

                          {/* Follower/Following Stats */}
                          {(influencer.followersCount !== undefined || influencer.followingCount !== undefined) && (
                            <div className="flex items-center justify-center space-x-4 mb-3 text-xs text-secondary-600">
                              {influencer.followersCount !== undefined && (
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-secondary-900">{formatNumber(influencer.followersCount)}</span>
                                  <span className="text-secondary-500">Followers</span>
                                </div>
                              )}
                              {influencer.followingCount !== undefined && (
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-secondary-900">{formatNumber(influencer.followingCount)}</span>
                                  <span className="text-secondary-500">Following</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Engagement Stats */}
                          {(influencer.engagementRate !== undefined || influencer.engagements !== undefined) && (
                            <div className="flex items-center justify-center space-x-4 mb-2 text-xs text-secondary-600">
                              {influencer.engagementRate !== undefined && (
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-secondary-900">{(influencer.engagementRate * 100).toFixed(2)}%</span>
                                  <span className="text-secondary-500">Engagement</span>
                                </div>
                              )}
                              {influencer.engagements !== undefined && (
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-secondary-900">{formatNumber(influencer.engagements)}</span>
                                  <span className="text-secondary-500">Engagements</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Match Score */}
                          {influencer.matchScore !== undefined && (
                            <div className="text-xs text-center text-green-600 font-medium mb-2">
                              Match Score: {(influencer.matchScore * 100).toFixed(1)}%
                            </div>
                          )}

                          {/* Bio */}
                          <p className="text-xs text-secondary-500 mb-2 line-clamp-2" title={influencer.bio || "No bio available"}>
                            {influencer.bio || "Influencer"}
                          </p>

                          {/* AI/Image Search Posts */}
                          {(influencer.isFromAISearch || influencer.isFromImageSearch) && (
                            <div className="mb-2 space-y-2">
                              {/* Matched Posts */}
                              {influencer.matchedPosts && influencer.matchedPosts.length > 0 && (
                                <div>
                                  <div className="text-xs text-black font-medium mb-1 text-center">
                                    {influencer.isFromImageSearch ? 'Image Matched Posts' : 'AI Matched Posts'} ({influencer.matchedPosts.length})
                                  </div>
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {influencer.matchedPosts.slice(0, 3).map((post, postIndex) => (
                                      <a
                                        key={post.id}
                                        href={post.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0"
                                        title={`View matched post - ${post.stats.likesCount >= 0 ? formatNumber(post.stats.likesCount) : 'Hidden'} likes, ${formatNumber(post.stats.commentsCount)} comments`}
                                      >
                                        <img
                                          src={post.thumbnail}
                                          alt={`Matched post ${postIndex + 1}`}
                                          className="w-12 h-12 rounded object-cover border-2 border-purple-300 hover:border-purple-500 transition-colors"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recent Posts */}
                              {influencer.recentPosts && influencer.recentPosts.length > 0 && (
                                <div>
                                  <div className="text-xs text-blue-600 font-medium mb-1 text-center">
                                    Recent Posts ({influencer.recentPosts.length})
                                  </div>
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {influencer.recentPosts.slice(0, 6).map((post, postIndex) => (
                                      <a
                                        key={post.id}
                                        href={post.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0"
                                        title={`View recent post - ${post.stats.likesCount >= 0 ? formatNumber(post.stats.likesCount) : 'Hidden'} likes, ${formatNumber(post.stats.commentsCount)} comments`}
                                      >
                                        <img
                                          src={post.thumbnail}
                                          alt={`Recent post ${postIndex + 1}`}
                                          className="w-10 h-10 rounded object-cover border border-blue-200 hover:border-blue-400 transition-colors"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* User ID */}
                          <div className="text-xs text-secondary-400 text-center mt-2">
                            ID: {influencer.id}
                          </div>

                          {/* Detail Button */}
                          <button
                            onClick={() => handleDetailClick(influencer)}
                            className="mt-3 btn-primary"
                          >
                            Detail & Message
                          </button>
                        </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMoreResults && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="btn-secondary"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Influencers'}
                  </button>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModashSearch;
