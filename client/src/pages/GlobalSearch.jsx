import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const GlobalSearch = () => {
  const navigate = useNavigate();

  // Predefined message template
  const getPredefinedMessage = (username) => `Hey! Check this out: https://poc_influencerstore.icod.ai/register?${username}`;

  const [keyword, setKeyword] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [maxFollowers, setMaxFollowers] = useState("");
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [pagination, setPagination] = useState({
    cursor: null,
    hasMore: false,
    count: 0,
    total: 0,
    limit: 10,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessages, setSendingMessages] = useState(false);
  const [sendProgress, setSendProgress] = useState({});
  const [isFollowerMode, setIsFollowerMode] = useState(false);

  useEffect(() => {
    applyFilters();
  }, [results, minFollowers, maxFollowers]);

  // Enable selection mode when there are results and keep it enabled
  useEffect(() => {
    if (filteredResults.length > 0) {
      setIsSelectionMode(true);
    }
    // Don't turn off selection mode when results are empty
    // This allows continued selection even after sending messages
  }, [filteredResults]);

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  useEffect(() => {
    if (isFollowerMode) {
      navigate('/followers');
    }
  }, [isFollowerMode, navigate]);

  const fetchLinkedAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/linked-accounts`, {
        withCredentials: true,
      });
      if (response.data.success) {
        const accounts = response.data.data || [];
        setLinkedAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch linked accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const applyFilters = () => {
    if (results.length === 0) {
      setFilteredResults([]);
      return;
    }

    let filtered = [...results];

    // Min followers
    if (minFollowers !== "" && minFollowers.toString().trim() !== "") {
      const min = parseInt(minFollowers.toString().trim());
      if (!isNaN(min) && min >= 0) {
        filtered = filtered.filter((item) => (item.followersCount || 0) >= min);
      }
    }

    // Max followers
    if (maxFollowers !== "" && maxFollowers.toString().trim() !== "") {
      const max = parseInt(maxFollowers.toString().trim());
      if (!isNaN(max) && max >= 0) {
        filtered = filtered.filter((item) => (item.followersCount || 0) <= max);
      }
    }

    setFilteredResults(filtered);
    // Clear selections when filters change the results
    if (filtered.length !== filteredResults.length) {
      setSelectedUsers(new Set());
    }
  };

  const performSearch = async (opts = { cursor: null, append: false }) => {
    const { cursor = null, append = false } = opts;
    const params = {
      query: keyword.trim(),
      limit: 10,
    };
    if (selectedAccountId) params.account_id = selectedAccountId;
    if (cursor !== null) params.cursor = cursor;

    const setLoadingFlag = append ? setLoadingMore : setLoading;
    setLoadingFlag(true);

    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/search-users`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        const users = response.data.data || [];
        if (append) {
          setResults((prev) => [...prev, ...users]);
          setFilteredResults((prev) => [...prev, ...users]);
        } else {
          setResults(users);
          setFilteredResults(users);
        }

        setPagination({
          cursor: response.data.pagination?.cursor ?? null,
          hasMore: !!response.data.pagination?.hasMore,
          count: response.data.pagination?.count || users.length,
          total: response.data.pagination?.total || (append ? results.length + users.length : users.length),
          limit: response.data.pagination?.limit || 10,
        });

        if (!append) {
          if (users.length === 0) {
            toast("No users found", { duration: 3000 });
          } else {
            toast.success(`Found ${users.length} user${users.length !== 1 ? "s" : ""}`);
          }
        }
      } else {
        toast.error(response.data.error || "Search failed");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Search failed";
      toast.error(errorMessage);
      console.error("Rocket search error:", error);
    } finally {
      setLoadingFlag(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }
    // Reset state for fresh search
    setResults([]);
    setFilteredResults([]);
    setSelectedUsers(new Set()); // Clear selections for new search
    setPagination({
      cursor: null,
      hasMore: false,
      count: 0,
      total: 0,
      limit: 10,
    });
    await performSearch({ cursor: null, append: false });
  };

  const loadMore = async () => {
    if (!pagination.hasMore || pagination.cursor === null || loadingMore) return;
    await performSearch({ cursor: pagination.cursor, append: true });
  };

  const handleViewProfile = (userId) => {
    if (!selectedAccountId) {
      toast.error("Select an account to view user details");
      return;
    }
    navigate(`/user-profile/${userId}`, {
      state: { accountId: selectedAccountId, from: "global-search" },
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
    const usersWithMessagingId = filteredResults
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
      // Open modal if users are selected
      // For single user selection, use personalized message
      if (selectedUsers.size === 1) {
        const userId = Array.from(selectedUsers)[0];
        const user = filteredResults.find((item) => item.id === userId);
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

    if (!selectedAccountId) {
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
        const user = filteredResults.find((item) => item.id === userId);
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
        const userData = filteredResults.find((item) => item.id === user.id);
        const username = userData?.username || 'user';
        const personalizedMessage = getPredefinedMessage(username);

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/influencers/start-chat`,
          {
            account_id: selectedAccountId,
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
            const fullUserData = filteredResults.find((item) => item.id === user.id);
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
                source: 'global_search',
              }, { withCredentials: true });
            }
          } catch (statusError) {
            console.error('Failed to update user status:', statusError);
          }

          // Save influencer data for growth tracking
          try {
            const userData = filteredResults.find((item) => item.id === user.id);
            if (userData) {
              await axios.post(`${import.meta.env.VITE_API_URL}/influencers/influencer-growth`, {
                id: userData.id,
                username: userData.username,
                name: userData.name,
                profilePicture: userData.profilePicture,
                profilePictureData: userData.profilePictureData,
                isPrivate: userData.isPrivate || false,
                isVerified: userData.isVerified || false,
                followersCount: userData.followersCount || 0,
                followingCount: userData.followingCount || 0,
                providerMessagingId: userData.providerMessagingId,
              }, { withCredentials: true });
            }
          } catch (growthError) {
            console.error('Failed to save influencer growth data:', growthError);
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
    if (filteredResults.length === 0) {
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
      const csvRows = filteredResults.map(user => [
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
        link.setAttribute('download', `global_search_results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Downloaded ${filteredResults.length} results to CSV`);

    } catch (error) {
      console.error('Failed to download CSV:', error);
      toast.error('Failed to download CSV');
    }
  };

  const handleViewProfileClick = (userId, e) => {
    // Prevent navigation if clicking on checkbox or in selection mode
    if (e?.target?.type === 'checkbox' || isSelectionMode) {
      return;
    }
    handleViewProfile(userId);
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Search</h1>
              <p className="text-gray-600">Search Instagram users globally</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Linked Account Users</label>
                <button
                  onClick={() => {
                    setIsFollowerMode(!isFollowerMode);
                    if (!isFollowerMode) {
                      navigate('/followers');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isFollowerMode ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isFollowerMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            {filteredResults.length > 0 && (
              <div className="flex items-center space-x-3">
                {isSelectionMode && (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="btn-secondary text-sm"
                    >
                      {(() => {
                        const usersWithMessagingId = filteredResults.filter((item) => item.providerMessagingId).map((item) => item.id);
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
                  disabled={filteredResults.length === 0}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={handleSendMessageClick}
                  className="btn-primary"
                  disabled={!selectedAccountId || filteredResults.length === 0}
                >
                  Send Message
                  {selectedUsers.size > 0 && ` (${selectedUsers.size})`}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search by username or name"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Followers</label>
                <input
                  type="number"
                  min="0"
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(e.target.value)}
                  placeholder="e.g., 1000"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Followers</label>
                <input
                  type="number"
                  min="0"
                  value={maxFollowers}
                  onChange={(e) => setMaxFollowers(e.target.value)}
                  placeholder="e.g., 50000"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account for profile lookup</label>
                {loadingAccounts ? (
                  <div className="input-field flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                    <span className="text-sm text-gray-500">Loading accounts...</span>
                  </div>
                ) : linkedAccounts.length > 0 ? (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="input-field"
                  >
                    {linkedAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        @{account.username} - {account.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">No linked accounts found. Add one to view profiles.</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Searching..." : "Search Users"}
              </button>
            </div>
          </form>
        </div>

        {loading && results.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredResults.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results</h3>
            <p className="text-gray-500">Try another keyword or adjust follower filters.</p>
          </motion.div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredResults.length}</span> of{" "}
                <span className="font-semibold">{results.length}</span> results
                {pagination.hasMore && " (more available)"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {filteredResults.map((item, index) => (
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
                  onClick={(e) => {
                    if (isSelectionMode && item.providerMessagingId) {
                      handleUserSelect(item.id);
                    } else if (!isSelectionMode) {
                      handleViewProfileClick(item.id, e);
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
                            e.target.style.display = "none";
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto ${
                          (item.profilePictureData || item.profilePicture) ? "hidden" : "flex"
                        }`}
                      >
                        <span className="text-purple-600 font-bold text-xl">
                          {item.username?.charAt(0)?.toUpperCase() || item.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                    </div>
                    <div className="w-full">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {item.name || item.username || "Unknown"}
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
                        {/* {item.isBusinessAccount && (
                            <span classname="text-green-500 flex-shrink-0" title="Business Account">
                            💼
                            </span>
                        )} */}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">@{item.username}</p>
                      {item.id && (
                        <p className="text-xs text-gray-400 mb-2">ID: {item.id}</p>
                      )}
                      {item.providerMessagingId && (
                        <p className="text-xs text-gray-400 mb-2">Messaging ID: {item.providerMessagingId}</p>
                      )}
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
                      {!isSelectionMode && (
                        <button
                          className="w-full mt-2 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(item.id);
                          }}
                          disabled={!selectedAccountId}
                        >
                          Details
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {pagination.hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-secondary"
                >
                  {loadingMore ? "Loading..." : "Load More"}
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
                    const user = filteredResults.find((item) => item.id === userId);
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
                {!selectedAccountId && (
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
                    disabled={sendingMessages || !selectedAccountId || selectedUsers.size === 0}
                  >
                    {sendingMessages
                      ? `Sending... (${Object.values(sendProgress).filter((p) => p.status === "success" || p.status === "error").length}/${Array.from(selectedUsers).filter((id) => {
                          const user = filteredResults.find((item) => item.id === id);
                          return user && user.providerMessagingId;
                        }).length})`
                      : `Send to ${Array.from(selectedUsers).filter((id) => {
                          const user = filteredResults.find((item) => item.id === id);
                          return user && user.providerMessagingId;
                        }).length} User${Array.from(selectedUsers).filter((id) => {
                          const user = filteredResults.find((item) => item.id === id);
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

export default GlobalSearch;

