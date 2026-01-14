import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const StatusTracking = () => {
  const navigate = useNavigate();
  const [userStatuses, setUserStatuses] = useState([]);
  const [stats, setStats] = useState({
    statusBreakdown: [],
    sourceBreakdown: [],
    totalUsers: 0,
    totalMessages: 0,
    trackingRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    search: '',
    skip: 0,
  });
  const [hasMore, setHasMore] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState(false);
  const [trackingRegistrations, setTrackingRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  // Combine user statuses and tracking registrations for display
  const allUsers = React.useMemo(() => {
    const formattedRegistrations = trackingRegistrations.map(registration => ({
      userId: registration._id || registration.trackingId,
      name: registration.statusInfo?.name || registration.name,
      username: registration.trackingId,
      status: 'registered',
      profilePicture: registration.statusInfo?.profilePicture,
      profilePictureData: registration.statusInfo?.profilePictureData,
      followersCount: registration.statusInfo?.followersCount || 0,
      followingCount: registration.statusInfo?.followingCount || 0,
      provider: registration.statusInfo?.provider || 'dynamite',
      source: registration.statusInfo?.source || 'registration',
      lastContacted: registration.createdAt,
      messageCount: 0,
      campaignIds: [],
      email: registration.email,
      storeName: registration.influencerData?.storeName || registration.storeData?.storeName,
      totalEarnings: registration.influencerData?.totalEarnings || 0,
      orderCount: registration.storeData?.orders?.length || 0,
      registrationDate: registration.createdAt,
      isRegistration: true, // Flag to identify registration users
    }));

    const combinedUsers = [...userStatuses, ...formattedRegistrations];

    // Sort by date (most recent first)
    return combinedUsers.sort((a, b) => {
      const dateA = new Date(a.lastContacted || a.registrationDate || 0);
      const dateB = new Date(b.lastContacted || b.registrationDate || 0);
      return dateB - dateA; // Descending order (most recent first)
    });
  }, [userStatuses, trackingRegistrations]);

  useEffect(() => {
    fetchStats();
    fetchUserStatuses();
    fetchTrackingRegistrations();
  }, [filters]);

  // Filter users based on search query and status
  const filteredUsers = React.useMemo(() => {
    return allUsers.filter((user) => {
      // Exclude active status users completely
      if (user.status === 'active') {
        return false;
      }

      // Status filter
      if (filters.status && user.status !== filters.status) {
        return false;
      }

      // Source filter
      if (filters.source && user.provider !== filters.source && user.source !== filters.source) {
        return false;
      }

      // Search filter
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const name = (user.name || '').toLowerCase();
        const username = (user.username || '').toLowerCase();
        const userId = (user.userId || '').toLowerCase();
        const email = (user.email || '').toLowerCase();

        return name.includes(query) ||
               username.includes(query) ||
               userId.includes(query) ||
               email.includes(query);
      }

      return true;
    });
  }, [allUsers, filters]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch user status stats
      const userStatusResponse = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/user-statuses/stats`, {
        withCredentials: true,
      });

      // Fetch main stats for tracking registrations
      const mainStatsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/stats`, {
        withCredentials: true,
      });

      if (userStatusResponse.data.success && mainStatsResponse.data.success) {
        setStats({
          ...userStatusResponse.data.data,
          trackingRegistrations: mainStatsResponse.data.data.trackingRegistrations || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTrackingRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/tracking/registrations`, {
        withCredentials: true,
      });
      if (response.data.success) {
        // Filter to only show users with valid tracking IDs
        let filteredRegistrations = (response.data.data?.registrations || []).filter(
          user => user.trackingId && user.trackingId.trim() !== ''
        );

        // Sort by creation date (newest first)
        filteredRegistrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTrackingRegistrations(filteredRegistrations);
      }
    } catch (error) {
      console.error('Failed to fetch tracking registrations:', error);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const fetchUserStatuses = async (append = false) => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (append) {
        params.skip = userStatuses.length;
      }

      // Remove limit from params since we're not using it
      const { limit, ...apiParams } = params;
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/user-statuses`, {
        params: apiParams,
        withCredentials: true,
      });

      if (response.data.success) {
        const newUsers = response.data.data;
        if (append) {
          setUserStatuses(prev => [...prev, ...newUsers]);
        } else {
          setUserStatuses(newUsers);
        }
        setHasMore(response.data.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to fetch user statuses:', error);
      toast.error('Failed to load user statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      skip: 0, // Reset pagination when filters change
    }));
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUserStatuses(true);
    }
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
    if (selectedUsers.size === userStatuses.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(userStatuses.map(user => user.userId)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select users to delete');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteSelected = async () => {
    setDeletingUsers(true);
    const userIds = Array.from(selectedUsers);
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      try {
        const response = await axios.delete(`${import.meta.env.VITE_API_URL}/influencers/user-statuses/${userId}`, {
          withCredentials: true,
        });

        if (response.data.success) {
          successCount++;
        } else {
          failCount++;
          console.error('Failed to delete user:', userId, response.data.error);
        }
      } catch (error) {
        failCount++;
        console.error('Failed to delete user:', userId, error);
      }
    }

    // Remove deleted users from local state
    setUserStatuses(prev => prev.filter(user => !selectedUsers.has(user.userId)));
    setSelectedUsers(new Set());

    // Refresh stats
    await fetchStats();

    setDeletingUsers(false);
    setShowDeleteConfirm(false);
    setIsDeleteMode(false);

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} user${successCount !== 1 ? 's' : ''} successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} user${failCount !== 1 ? 's' : ''}`);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteMode(false);
    setSelectedUsers(new Set());
    setShowDeleteConfirm(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'contacted':
        return (
          <svg className="w-5 h-5" fill="none" stroke="#06b6d4" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" fill="#06b6d4" fillOpacity="0.1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" opacity="0.6" />
          </svg>
        );
      case 'onboarded':
        return (
          <svg className="w-5 h-5" fill="none" stroke="#10b981" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="#10b981" fillOpacity="0.1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.6" />
          </svg>
        );
      case 'offboarded':
        return (
          <svg className="w-5 h-5" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" fill="#ef4444" fillOpacity="0.1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" opacity="0.6" />
          </svg>
        );
      case 'not_interested':
        return (
          <svg className="w-5 h-5" fill="none" stroke="#f97316" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" fill="#f97316" fillOpacity="0.1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.6" />
          </svg>
        );
      case 'registered':
        return (
          <svg className="w-5 h-5" fill="none" stroke="#7c3aed" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" fill="#7c3aed" fillOpacity="0.1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.6" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" fill="#6b7280" fillOpacity="0.1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.6" />
          </svg>
        );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'onboarded':
        return 'bg-green-100 text-green-800';
      case 'offboarded':
        return 'bg-red-100 text-red-800';
      case 'not_interested':
        return 'bg-orange-100 text-orange-800';
      case 'registered':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-screen bg-secondary-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="content-container section-spacing lg:pt-4 pt-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">Status Tracking</h1>
              <p className="text-secondary-600">Track user engagement and status across your outreach campaigns</p>
            </div>
            <div className="flex items-center space-x-3">
              {isDeleteMode ? (
                <>
                  <button
                    onClick={handleSelectAll}
                    className="btn-secondary text-sm"
                  >
                    {selectedUsers.size === userStatuses.length && userStatuses.length > 0 ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <span className="text-sm text-secondary-600">
                    {selectedUsers.size} selected
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedUsers.size === 0}
                    className="btn-error text-sm"
                  >
                    Delete Selected ({selectedUsers.size})
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsDeleteMode(true)}
                  className="btn-secondary text-sm flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Users</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-secondary-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <p className="text-sm text-secondary-500">Total Users</p>
              <p className="text-3xl font-bold text-primary-700 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="card">
              <p className="text-sm text-secondary-500">Total Messages</p>
              <p className="text-3xl font-bold text-primary-700 mt-2">{stats.totalMessages}</p>
            </div>
            <div
              className="card cursor-pointer hover-lift"
              onClick={() => navigate('/registration-details')}
            >
              <p className="text-sm text-secondary-500">Total Registrations on Influencer Store</p>
              <p className="text-3xl font-bold text-primary-700 mt-2">{stats.trackingRegistrations || 0}</p>
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {!loadingStats && stats.statusBreakdown.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Status Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.statusBreakdown.filter(status => status._id !== 'active').map((status) => (
                <div key={status._id} className="flex items-center p-4 bg-secondary-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(status._id)}</span>
                    <div>
                      <p className="font-medium text-secondary-900 capitalize">{status._id.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-secondary-500">{status.count} users</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="contacted">Contacted</option>
                <option value="onboarded">Onboarded</option>
                <option value="offboarded">Offboarded</option>
                <option value="not_interested">Not Interested</option>
                <option value="registered">Registered</option>
              </select>
            </div>
            <div>
              <label className="form-label">Source</label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="input-field"
              >
                <option value="">All Sources</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div>
              <label className="form-label">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name or username"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Users List */}
        {loading && userStatuses.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-12"
          >
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No Users Found</h3>
            <p className="text-secondary-500">Try adjusting your filters or start sending messages to users.</p>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.userId || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.05 }}
                  className={`card hover-lift ${
                    isDeleteMode ? "cursor-default" : "cursor-pointer"
                  } ${
                    selectedUsers.has(user.userId)
                      ? "border-2 border-error-500 bg-error-50"
                      : ""
                  }`}
                  onClick={() => {
                    if (isDeleteMode) {
                      handleUserSelect(user.userId);
                    }
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    {isDeleteMode && (
                      <div className="mb-2 w-full flex justify-start">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.userId)}
                          onChange={() => handleUserSelect(user.userId)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 text-error-600 border-secondary-300 rounded focus:ring-error-500 cursor-pointer"
                        />
                      </div>
                    )}
                    <div className="mb-3 relative">
                      {(user.profilePictureData || user.profilePicture) ? (
                        <img
                          src={user.profilePictureData || user.profilePicture}
                          alt={user.username}
                          className="w-16 h-16 rounded-full object-cover mx-auto"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto ${(user.profilePictureData || user.profilePicture) ? 'hidden' : 'flex'}`}
                      >
                        <span className="text-primary-600 font-bold text-lg">
                          {user.username?.charAt(0)?.toUpperCase() || user.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="absolute -top-1 -right-1">
                        <span className="text-lg" title={user.status}>
                          {getStatusIcon(user.status)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full">
                      <h3 className="text-sm font-semibold text-secondary-900 truncate mb-1">
                        {user.name || user.username || 'Unknown'}
                      </h3>
                      <p className="text-xs text-secondary-500 mb-2">@{user.username}</p>
                      {user.email && (
                        <p className="text-xs text-secondary-500 mb-2">{user.email}</p>
                      )}
                      <div className="flex justify-center mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                          {user.status === 'registered' ? 'Registered' : user.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>

                      {user.isRegistration ? (
                        // Display for registration users
                        <>
                          {user.storeName && (
                            <div className="text-xs text-secondary-600 mb-2">
                              <p className="font-medium">Store: {user.storeName}</p>
                            </div>
                          )}

                          <div className="text-xs text-secondary-500 space-y-1">
                            <p>Earnings: ${user.totalEarnings * 100 || 0}</p>
                            <p>Orders: {user.orderCount || 0}</p>
                            <p>Registered: {formatDate(user.registrationDate)}</p>
                          </div>
                        </>
                      ) : (
                        // Display for regular user status users
                        <>
                          {(user.followersCount > 0 || user.followingCount > 0) && (
                            <div className="flex items-center justify-center space-x-4 mb-2 text-xs text-secondary-600">
                              {user.followersCount !== undefined && user.followersCount > 0 && (
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-secondary-900">{formatNumber(user.followersCount)}</span>
                                  <span className="text-secondary-500">Followers</span>
                                </div>
                              )}
                              {user.followingCount !== undefined && user.followingCount > 0 && (
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-secondary-900">{formatNumber(user.followingCount)}</span>
                                  <span className="text-secondary-500">Following</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-secondary-500 space-y-1">
                            <p>Source: <span className="capitalize">{user.provider || user.source?.replace('_', ' ') || 'Unknown'}</span></p>
                            <p>Last contacted: {formatDate(user.lastContacted)}</p>
                            <p>Messages sent: {user.messageCount || 0}</p>
                            {user.campaignIds && user.campaignIds.length > 0 && (
                              <p>In campaigns: {user.campaignIds.length}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}


        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-secondary-900">Delete User Statuses</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-secondary-500">
                  Are you sure you want to delete the status records for{' '}
                  <span className="font-medium text-secondary-900">
                    {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}
                  </span>
                  ?
                </p>
                <p className="text-sm text-secondary-500 mt-2">
                  This action cannot be undone. The user statuses, message histories, and campaign associations will be permanently removed.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                  disabled={deletingUsers}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteSelected}
                  disabled={deletingUsers}
                  className="btn-error flex-1"
                >
                  {deletingUsers ? 'Deleting...' : `Delete ${selectedUsers.size} User${selectedUsers.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default StatusTracking;
