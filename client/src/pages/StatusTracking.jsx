import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const StatusTracking = () => {
  const [userStatuses, setUserStatuses] = useState([]);
  const [stats, setStats] = useState({
    statusBreakdown: [],
    sourceBreakdown: [],
    totalUsers: 0,
    totalMessages: 0,
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

  useEffect(() => {
    fetchStats();
    fetchUserStatuses();
  }, [filters]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/user-statuses/stats`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
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
      case 'active':
        return (
          <svg className="w-5 h-5" fill="none" stroke="#8b5cf6" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" fill="#8b5cf6" fillOpacity="0.1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" opacity="0.6" />
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
      case 'active':
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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Status Tracking</h1>
              <p className="text-gray-600">Track user engagement and status across your outreach campaigns</p>
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
                  <span className="text-sm text-gray-600">
                    {selectedUsers.size} selected
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedUsers.size === 0}
                    className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
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
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Total Messages</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">{stats.totalMessages}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.statusBreakdown.find(s => s._id === 'active')?.count || 0}
              </p>
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {!loadingStats && stats.statusBreakdown.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.statusBreakdown.map((status) => (
                <div key={status._id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(status._id)}</span>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{status._id}</p>
                      <p className="text-sm text-gray-500">{status.count} users</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="contacted">Contacted</option>
                <option value="onboarded">Onboarded</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : userStatuses.length === 0 ? (
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-500">Try adjusting your filters or start sending messages to users.</p>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {userStatuses.map((user, index) => (
                <motion.div
                  key={user.userId || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.05 }}
                  className={`card hover:shadow-lg transition-shadow ${
                    isDeleteMode ? "cursor-default" : "cursor-pointer"
                  } ${
                    selectedUsers.has(user.userId)
                      ? "border-2 border-red-500 bg-red-50"
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
                          className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
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
                        className={`w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto ${(user.profilePictureData || user.profilePicture) ? 'hidden' : 'flex'}`}
                      >
                        <span className="text-purple-600 font-bold text-lg">
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
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {user.name || user.username || 'Unknown'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">@{user.username}</p>

                      {(user.followersCount > 0 || user.followingCount > 0) && (
                        <div className="flex items-center justify-center space-x-4 mb-2 text-xs text-gray-600">
                          {user.followersCount !== undefined && user.followersCount > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-gray-900">{formatNumber(user.followersCount)}</span>
                              <span className="text-gray-500">Followers</span>
                            </div>
                          )}
                          {user.followingCount !== undefined && user.followingCount > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-gray-900">{formatNumber(user.followingCount)}</span>
                              <span className="text-gray-500">Following</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Source: <span className="capitalize">{user.provider || user.source?.replace('_', ' ') || 'Unknown'}</span></p>
                        <p>Last contacted: {formatDate(user.lastContacted)}</p>
                        <p>Messages sent: {user.messageCount || 0}</p>
                        {user.campaignIds && user.campaignIds.length > 0 && (
                          <p>In campaigns: {user.campaignIds.length}</p>
                        )}
                      </div>
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
                  <h3 className="text-lg font-medium text-gray-900">Delete User Statuses</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the status records for{' '}
                  <span className="font-medium text-gray-900">
                    {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}
                  </span>
                  ?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone. The user statuses, message histories, and campaign associations will be permanently removed.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  disabled={deletingUsers}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteSelected}
                  disabled={deletingUsers}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
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
