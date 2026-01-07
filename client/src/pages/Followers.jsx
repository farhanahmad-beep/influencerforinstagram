import React from "react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const Followers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Predefined message template
  const getPredefinedMessage = (username) => `Hey! Check this out: https://dynamiteinfluencerstore.icod.ai/register?${username}`;
  const [allData, setAllData] = useState([]); // Store all fetched data
  const [filteredData, setFilteredData] = useState([]); // Store filtered data for display
  const [loading, setLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [viewMode, setViewMode] = useState(searchParams.get("mode") || "followers"); // "followers" or "following"
  const [pagination, setPagination] = useState({
    cursor: null,
    hasMore: false,
    count: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    user_id: searchParams.get("user_id") || "",
    account_id: searchParams.get("account_id") || "",
    limit: searchParams.get("limit") || "10",
  });
  const [displayFilters, setDisplayFilters] = useState({
    keyword: "",
    category: "",
    minFollowers: "",
    maxFollowers: "",
    minEngagement: "",
    maxEngagement: "",
    country: "",
    city: "",
  });
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessages, setSendingMessages] = useState(false);
  const [sendProgress, setSendProgress] = useState({});
  const [isGlobalSearchMode, setIsGlobalSearchMode] = useState(false);

  useEffect(() => {
    fetchLinkedAccounts();
    if (filters.user_id || filters.account_id) {
      if (viewMode === "following") {
        fetchFollowing();
      } else {
        fetchFollowers();
      }
    }
  }, [viewMode]);

  useEffect(() => {
    if (isGlobalSearchMode) {
      navigate('/global-search');
    }
  }, [isGlobalSearchMode, navigate]);

  // Apply filters whenever allData or displayFilters change
  useEffect(() => {
    if (filters.user_id || filters.account_id) {
      if (viewMode === "following") {
        fetchFollowing();
      } else {
        fetchFollowers();
      }
    }
  }, [viewMode]);

  // Apply filters whenever allData or displayFilters change
  useEffect(() => {
    applyFilters();
  }, [allData, displayFilters]);

  // Enable selection mode when there are results and keep it enabled
  useEffect(() => {
    if (filteredData.length > 0) {
      setIsSelectionMode(true);
    }
    // Don't turn off selection mode when results are empty
    // This allows continued selection even after sending messages
  }, [filteredData]);

  const fetchLinkedAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/linked-accounts`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setLinkedAccounts(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch linked accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchFollowers = async (cursor = null) => {
    setLoading(true);
    try {
      const params = {
        limit: parseInt(filters.limit) || 10,
      };

      // Prioritize account_id if both are provided (matches backend logic)
      if (filters.account_id) {
        params.account_id = filters.account_id;
      } else if (filters.user_id) {
        params.user_id = filters.user_id;
      }
      
      if (cursor) {
        params.cursor = cursor;
      }

      // Update URL params
      const newSearchParams = new URLSearchParams();
      if (params.user_id) newSearchParams.set("user_id", params.user_id);
      if (params.account_id) newSearchParams.set("account_id", params.account_id);
      if (params.limit) newSearchParams.set("limit", params.limit.toString());
      newSearchParams.set("mode", "followers");
      setSearchParams(newSearchParams);

      console.log('Fetching followers with params:', params);

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/followers`, {
        params,
        withCredentials: true,
      });

      console.log('Followers response:', response.data);

      if (response.data.success) {
        const followersData = response.data.data || [];
        
        if (cursor) {
          // Append to existing data for pagination
          setAllData((prev) => [...prev, ...followersData]);
        } else {
          // Replace data for new search
          setAllData(followersData);
        }

        setPagination({
          cursor: response.data.pagination?.cursor || null,
          hasMore: response.data.pagination?.hasMore || false,
          count: response.data.pagination?.count || followersData.length,
          limit: response.data.pagination?.limit || 10,
        });

        if (followersData.length === 0 && !cursor) {
          toast("No followers found for this account", { duration: 3000 });
        } else if (followersData.length > 0 && !cursor) {
          toast.success(`Found ${followersData.length} follower${followersData.length !== 1 ? 's' : ''}`);
        }
      } else {
        toast.error(response.data.error || "Failed to fetch followers");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to fetch followers";
      toast.error(errorMessage);
      console.error("Failed to fetch followers:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async (cursor = null) => {
    setLoading(true);
    try {
      const params = {
        limit: parseInt(filters.limit) || 10,
      };

      // Prioritize account_id if both are provided (matches backend logic)
      if (filters.account_id) {
        params.account_id = filters.account_id;
      } else if (filters.user_id) {
        params.user_id = filters.user_id;
      }
      
      if (cursor) {
        params.cursor = cursor;
      }

      // Update URL params
      const newSearchParams = new URLSearchParams();
      if (params.user_id) newSearchParams.set("user_id", params.user_id);
      if (params.account_id) newSearchParams.set("account_id", params.account_id);
      if (params.limit) newSearchParams.set("limit", params.limit.toString());
      newSearchParams.set("mode", "following");
      setSearchParams(newSearchParams);

      console.log('Fetching following with params:', params);

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/following`, {
        params,
        withCredentials: true,
      });

      console.log('Following response:', response.data);

      if (response.data.success) {
        const followingData = response.data.data || [];
        
        if (cursor) {
          // Append to existing data for pagination
          setAllData((prev) => [...prev, ...followingData]);
        } else {
          // Replace data for new search
          setAllData(followingData);
        }

        setPagination({
          cursor: response.data.pagination?.cursor || null,
          hasMore: response.data.pagination?.hasMore || false,
          count: response.data.pagination?.count || followingData.length,
          limit: response.data.pagination?.limit || 10,
        });

        if (followingData.length === 0 && !cursor) {
          toast("No following accounts found for this account", { duration: 3000 });
        } else if (followingData.length > 0 && !cursor) {
          toast.success(`Found ${followingData.length} following account${followingData.length !== 1 ? 's' : ''}`);
        }
      } else {
        toast.error(response.data.error || "Failed to fetch following accounts");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to fetch following accounts";
      toast.error(errorMessage);
      console.error("Failed to fetch following:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!filters.account_id) {
      toast.error("Please select an account");
      return;
    }
    setAllData([]);
    setFilteredData([]);
    setSelectedUsers(new Set()); // Clear selections for new search
    // Reset display filters for new search
    setDisplayFilters({
      keyword: "",
      category: "",
      minFollowers: "",
      maxFollowers: "",
      minEngagement: "",
      maxEngagement: "",
      country: "",
      city: "",
    });
    if (viewMode === "following") {
      fetchFollowing();
    } else {
      fetchFollowers();
    }
  };

  // Client-side filtering function
  const applyFilters = () => {
    if (allData.length === 0) {
      setFilteredData([]);
      return;
    }

    let filtered = [...allData];

    // Keyword filter (search in name, username)
    if (displayFilters.keyword && displayFilters.keyword.trim() !== "") {
      const keyword = displayFilters.keyword.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const username = (item.username || "").toLowerCase();
        return name.includes(keyword) || username.includes(keyword);
      });
    }

    if (displayFilters.minFollowers && displayFilters.minFollowers.toString().trim() !== "") {
      const minFollowersValue = displayFilters.minFollowers.toString().trim();
      const minFollowers = parseInt(minFollowersValue);
      if (!isNaN(minFollowers) && minFollowers >= 0) {
        filtered = filtered.filter((item) => {
          const followersCount = item.followersCount !== undefined && item.followersCount !== null ? item.followersCount : 0;
          return followersCount >= minFollowers;
        });
      }
    }

    if (displayFilters.maxFollowers && displayFilters.maxFollowers.toString().trim() !== "") {
      const maxFollowersValue = displayFilters.maxFollowers.toString().trim();
      const maxFollowers = parseInt(maxFollowersValue);
      if (!isNaN(maxFollowers) && maxFollowers >= 0) {
        filtered = filtered.filter((item) => {
          const followersCount = item.followersCount !== undefined && item.followersCount !== null ? item.followersCount : 0;
          return followersCount <= maxFollowers;
        });
      }
    }

    setFilteredData(filtered);
  };

  const loadMore = () => {
    if (pagination.cursor && !loading) {
      if (viewMode === "following") {
        fetchFollowing(pagination.cursor);
      } else {
        fetchFollowers(pagination.cursor);
      }
    }
  };

  const handleModeChange = (mode) => {
    setViewMode(mode);
    setAllData([]);
    setFilteredData([]);
    setSelectedUsers(new Set()); // Clear selections when switching modes
    setPagination({
      cursor: null,
      hasMore: false,
      count: 0,
      limit: 10,
    });
    if (filters.user_id || filters.account_id) {
      if (mode === "following") {
        fetchFollowing();
      } else {
        fetchFollowers();
      }
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleViewProfile = (userId) => {
    if (!filters.account_id) {
      toast.error("Account ID is required to view profile details");
      return;
    }

    // Navigate to user profile page with userId and accountId
    navigate(`/user-profile/${userId}`, {
      state: { accountId: filters.account_id, from: "followers" },
    });
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });

  };

  const handleSelectAll = () => {
    // Only select users that have providerMessagingId
    const usersWithMessagingId = filteredData
      .filter((item) => item.providerMessagingId)
      .map((item) => item.id);

    if (selectedUsers.size === usersWithMessagingId.length &&
        usersWithMessagingId.every((id) => selectedUsers.has(id))) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(usersWithMessagingId));
    }
  };
  

  const handleSendMessageClick = () => {
    if (selectedUsers.size === 0) {
      // Enable selection mode if no users are selected
      setIsSelectionMode(true);
      toast("Select users with messaging IDs to send message to", { duration: 3000 });
    } else {
      // Open modal if users are selected and pre-populate with message
      // For single user selection, use personalized message
      if (selectedUsers.size === 1) {
        const userId = Array.from(selectedUsers)[0];
        const user = filteredData.find((item) => item.id === userId);
        const username = user?.username || 'user';
        setMessageText(getPredefinedMessage(username));
      } else {
        // For multiple users, show generic message
        setMessageText(getPredefinedMessage('user'));
      }
      setShowSendModal(true);
    }
  };

  const handleSendToMultiple = async (e) => {
    e.preventDefault();

    if (!filters.account_id) {
      toast.error("Account ID is required to send message");
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Filter selected users to only those with providerMessagingId
    const usersToSend = Array.from(selectedUsers)
      .map((userId) => {
        const user = filteredData.find((item) => item.id === userId);
        return user && user.providerMessagingId ? { id: userId, messagingId: user.providerMessagingId, name: user.name || user.username } : null;
      })
      .filter(Boolean);

    if (usersToSend.length === 0) {
      toast.error("Selected users don't have messaging IDs. Please select users with messaging IDs.");
      return;
    }

    setSendingMessages(true);
    const progress = {};
    usersToSend.forEach((user) => {
      progress[user.id] = { status: "pending", message: "" };
    });
    setSendProgress(progress);

    let successCount = 0;
    let failCount = 0;

    // Send messages sequentially to avoid overwhelming the API
    for (const user of usersToSend) {
      try {
        // Get personalized message for this user
        const userData = filteredData.find((item) => item.id === user.id);
        const username = userData?.username || 'user';
        const personalizedMessage = getPredefinedMessage(username);

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/influencers/start-chat`,
          {
            account_id: filters.account_id,
            text: personalizedMessage,
            attendees_ids: [user.messagingId],
          },
          {
            withCredentials: true,
          }
        );

        if (response.data.success) {
          successCount++;
          setSendProgress((prev) => ({
            ...prev,
            [user.id]: { status: "success", message: "Sent successfully" },
          }));

          // Update user status to contacted with profile picture data and counts
          try {
            const fullUserData = filteredData.find((item) => item.id === user.id);
            if (fullUserData) {
              await axios.post(`${import.meta.env.VITE_API_URL}/influencers/user-status/contacted`, {
                userId: user.id,
                username: fullUserData.username,
                name: fullUserData.name,
                profilePicture: fullUserData.profilePicture,
                profilePictureData: fullUserData.profilePictureData, // Save the base64 profile image
                followersCount: fullUserData.followersCount,
                followingCount: fullUserData.followingCount,
                provider: 'INSTAGRAM',
                providerId: user.id,
                providerMessagingId: user.messagingId,
                source: viewMode === 'following' ? 'following' : 'followers',
              }, { withCredentials: true });
            }
          } catch (statusError) {
            console.error('Failed to update user status:', statusError);
          }
        } else {
          failCount++;
          setSendProgress((prev) => ({
            ...prev,
            [user.id]: {
              status: "error",
              message: response.data.error || "Failed to send",
            },
          }));
        }
      } catch (error) {
        failCount++;
        const errorMessage =
          error.response?.data?.error || error.message || "Failed to send";
        setSendProgress((prev) => ({
          ...prev,
          [user.id]: { status: "error", message: errorMessage },
        }));
      }

      // Small delay between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setSendingMessages(false);

    if (successCount > 0) {
      toast.success(
        `Message sent to ${successCount} user${successCount !== 1 ? "s" : ""}`
      );
    }
    if (failCount > 0) {
      toast.error(
        `Failed to send to ${failCount} user${failCount !== 1 ? "s" : ""}`
      );
    }

    // Reset after a delay to show progress
    setTimeout(() => {
      setShowSendModal(false);
      setMessageText("");
      setSelectedUsers(new Set());
      // Keep selection mode on for continued selection
      setSendProgress({});
    }, 2000);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedUsers(new Set());
  };

  const handleDownloadCSV = () => {
    if (filteredData.length === 0) {
      toast.error("No data to download");
      return;
    }

    try {
      // Define CSV headers
      const headers = [
        'ID',
        'Username',
        'Name',
        'Followers Count',
        'Following Count',
        'Provider',
        'Provider ID',
        'Provider Messaging ID'
      ];

      // Convert data to CSV rows
      const csvRows = filteredData.map(user => [
        user.id || '',
        user.username || '',
        user.name || '',
        user.followersCount || 0,
        user.followingCount || 0,
        user.provider || 'Instagram',
        user.id || '', // Use frontend ID as Provider ID
        user.providerMessagingId || ''
      ]);

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
        link.setAttribute('download', `${viewMode}_results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Downloaded ${filteredData.length} results to CSV`);

    } catch (error) {
      console.error('Failed to download CSV:', error);
      toast.error('Failed to download CSV');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {viewMode === "following" ? "Following" : "Followers"}
              </h1>
              <p className="text-gray-600">
                {viewMode === "following" 
                  ? "View and manage accounts you follow from your linked Instagram accounts"
                  : "View and manage followers from your linked Instagram accounts"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Global Search</label>
                <button
                  onClick={() => {
                    setIsGlobalSearchMode(!isGlobalSearchMode);
                    if (!isGlobalSearchMode) {
                      navigate('/global-search');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isGlobalSearchMode ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isGlobalSearchMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleModeChange("followers")}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    viewMode === "followers"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Followers
                </button>
                <button
                  onClick={() => handleModeChange("following")}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    viewMode === "following"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Following
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Filters */}
        <div className="card mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account ID (account_id)
                </label>
                {loadingAccounts ? (
                  <div className="input-field flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                    <span className="text-sm text-gray-500">Loading accounts...</span>
                  </div>
                ) : linkedAccounts.length > 0 ? (
                  <select
                    name="account_id"
                    value={filters.account_id}
                    onChange={handleFilterChange}
                    className="input-field"
                  >
                    <option value="">Select an account...</option>
                    {linkedAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                       (@{account.username}) - {account.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="account_id"
                      value={filters.account_id}
                      onChange={handleFilterChange}
                      placeholder="e.g., nTx-Zhh_SCmBzH4opdXhgw"
                      className="input-field"
                    />
                    <p className="text-xs text-gray-500">
                      No linked accounts found. You can manually enter an account ID.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keyword Search
                </label>
                <input
                  type="text"
                  value={displayFilters.keyword}
                  onChange={(e) => setDisplayFilters(prev => ({ ...prev, keyword: e.target.value }))}
                  placeholder="Search by name or username"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Followers
                </label>
                <input
                  type="number"
                  value={displayFilters.minFollowers}
                  onChange={(e) => setDisplayFilters(prev => ({ ...prev, minFollowers: e.target.value }))}
                  placeholder="e.g., 1000"
                  min="0"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Followers
                </label>
                <input
                  type="number"
                  value={displayFilters.maxFollowers}
                  onChange={(e) => setDisplayFilters(prev => ({ ...prev, maxFollowers: e.target.value }))}
                  placeholder="e.g., 10000"
                  min="0"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Loading..." : "Search" + (viewMode === "following" ? " Following" : " Followers")}
              </button>
              <p className="text-sm text-gray-500">
                {filters.account_id
                  ? "✓ Ready to search"
                  : "Please select an account"}
              </p>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading && allData.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-12"
          >
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {viewMode === "following" ? "Following" : "Followers"} Found
            </h3>
            <p className="text-gray-500">
              {filters.user_id || filters.account_id
                ? allData.length === 0
                  ? `No ${viewMode === "following" ? "following accounts" : "followers"} found for the specified account.`
                  : `No results match your filters. Try adjusting your search criteria.`
                : `Enter a username or account ID to search for ${viewMode === "following" ? "following accounts" : "followers"}.`}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredData.length}</span> of <span className="font-semibold">{allData.length}</span> {viewMode === "following" ? "following accounts" : "followers"}
                {pagination.hasMore && " (more available)"}
              </p>
              <div className="flex items-center space-x-3">
                {isSelectionMode && (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="btn-secondary text-sm"
                    >
                      {(() => {
                        const usersWithMessagingId = filteredData.filter((item) => item.providerMessagingId).map((item) => item.id);
                        const allSelected = usersWithMessagingId.length > 0 && usersWithMessagingId.every((id) => selectedUsers.has(id));
                        return allSelected ? "Deselect All" : "Select All";
                      })()}
                    </button>
                    <button
                      onClick={handleCancelSelection}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedUsers.size} selected
                    </span>
                  </>
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
                <button
                  onClick={handleSendMessageClick}
                  className="btn-primary"
                  disabled={!filters.account_id || filteredData.length === 0}
                >
                  Send Message
                  {selectedUsers.size > 0 && ` (${selectedUsers.size})`}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {filteredData.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.05 }}
                  className={`card hover:shadow-lg transition-shadow ${
                    isSelectionMode ? "cursor-default" : "cursor-pointer"
                  } ${
                    selectedUsers.has(item.id)
                      ? "border-2 border-purple-500 bg-purple-50"
                      : ""
                  } ${!item.providerMessagingId && isSelectionMode ? "opacity-50" : ""}`}
                  onClick={() => {
                    if (isSelectionMode && item.providerMessagingId) {
                      handleUserSelect(item.id);
                    }
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    {isSelectionMode && (
                      <div className="mb-2 w-full flex justify-start">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(item.id)}
                          onChange={() => handleUserSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!item.providerMessagingId}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {!item.providerMessagingId && (
                          <span className="text-xs text-gray-400 ml-2">No messaging ID</span>
                        )}
                      </div>
                    )}
                    <div className="mb-3 relative">
                      {(item.profilePictureData || item.profilePicture) ? (
                        <img
                          src={item.profilePictureData || item.profilePicture}
                          alt={item.username}
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
                        className={`w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto ${(item.profilePictureData || item.profilePicture) ? 'hidden' : 'flex'}`}
                      >
                        <span className="text-purple-600 font-bold text-xl">
                          {item.username?.charAt(0)?.toUpperCase() || item.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                    </div>
                    <div className="w-full">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {item.name || item.username || 'Unknown'}
                        </h3>
                        {item.isVerified && (
                          <span className="text-blue-500 flex-shrink-0" title="Verified">
                            ✓
                          </span>
                        )}
                        {item.isPrivate && (
                          <span className="text-gray-400 flex-shrink-0" title="Private Account">
                            🔒
                          </span>
                        )}
                        {item.isFavorite && viewMode === "following" && (
                          <span className="text-yellow-500 flex-shrink-0" title="Favorite">
                            ⭐
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">@{item.username}</p>
                      {(item.followersCount !== undefined || item.followingCount !== undefined) && (
                        <div className="flex items-center justify-center space-x-4 mb-2 text-xs text-gray-600">
                          {item.followersCount !== undefined && (
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-gray-900">{formatNumber(item.followersCount)}</span>
                              <span className="text-gray-500">Followers</span>
                            </div>
                          )}
                          {item.followingCount !== undefined && (
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-gray-900">{formatNumber(item.followingCount)}</span>
                              <span className="text-gray-500">Following</span>
                            </div>
                          )}
                        </div>
                      )}
                      {item.id && (
                        <p className="text-xs text-gray-400 mb-3">ID: {item.id}</p>
                      )}
                      <button
                        className="w-full mt-2 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                        onClick={() => handleViewProfile(item.id)}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? "Loading..." : `Load More ${viewMode === "following" ? "Following" : "Followers"}`}
                </button>
              </div>
            )}
          </>
        )}

        {/* Send Message Modal */}
        {showSendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Send Message to {selectedUsers.size} User{selectedUsers.size !== 1 ? "s" : ""}
              </h2>

              {/* Selected Users List */}
              <div className="mb-4 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Users:</p>
                <div className="space-y-1">
                  {Array.from(selectedUsers).map((userId) => {
                    const user = filteredData.find((item) => item.id === userId);
                    if (!user || !user.providerMessagingId) return null;
                    const progress = sendProgress[userId];
                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between text-sm p-2 bg-white rounded"
                      >
                        <span className="text-gray-700">
                          {user.name || user.username || userId}
                        </span>
                        {progress && (
                          <span
                            className={`text-xs ${
                              progress.status === "success"
                                ? "text-green-600"
                                : progress.status === "error"
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {progress.status === "pending" && "⏳ Sending..."}
                            {progress.status === "success" && "✓ Sent"}
                            {progress.status === "error" && `✗ ${progress.message}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSendToMultiple} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    className="input-field min-h-[120px] resize-y"
                    required
                    disabled={sendingMessages}
                  />
                </div>
                {!filters.account_id && (
                  <p className="text-sm text-red-600">
                    Account ID is required to send messages
                  </p>
                )}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSendModal(false);
                      setMessageText("");
                      setSendProgress({});
                    }}
                    className="btn-secondary flex-1"
                    disabled={sendingMessages}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={sendingMessages || !filters.account_id || selectedUsers.size === 0}
                  >
                    {sendingMessages
                      ? `Sending... (${Object.values(sendProgress).filter((p) => p.status === "success" || p.status === "error").length}/${Array.from(selectedUsers).filter((id) => {
                          const user = filteredData.find((item) => item.id === id);
                          return user && user.providerMessagingId;
                        }).length})`
                      : `Send to ${Array.from(selectedUsers).filter((id) => {
                          const user = filteredData.find((item) => item.id === id);
                          return user && user.providerMessagingId;
                        }).length} User${Array.from(selectedUsers).filter((id) => {
                          const user = filteredData.find((item) => item.id === id);
                          return user && user.providerMessagingId;
                        }).length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Followers;

