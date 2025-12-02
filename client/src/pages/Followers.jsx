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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [viewMode, setViewMode] = useState(searchParams.get("mode") || "followers"); // "followers" or "following"
  const [pagination, setPagination] = useState({
    cursor: null,
    hasMore: false,
    count: 0,
    limit: 100,
  });
  const [filters, setFilters] = useState({
    user_id: searchParams.get("user_id") || "",
    account_id: searchParams.get("account_id") || "",
    limit: searchParams.get("limit") || "100",
  });

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
        limit: parseInt(filters.limit) || 100,
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
          setData((prev) => [...prev, ...followersData]);
        } else {
          // Replace data for new search
          setData(followersData);
        }

        setPagination({
          cursor: response.data.pagination?.cursor || null,
          hasMore: response.data.pagination?.hasMore || false,
          count: response.data.pagination?.count || followersData.length,
          limit: response.data.pagination?.limit || 100,
        });

        if (followersData.length === 0 && !cursor) {
          toast.info("No followers found for this account");
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
        limit: parseInt(filters.limit) || 100,
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
          setData((prev) => [...prev, ...followingData]);
        } else {
          // Replace data for new search
          setData(followingData);
        }

        setPagination({
          cursor: response.data.pagination?.cursor || null,
          hasMore: response.data.pagination?.hasMore || false,
          count: response.data.pagination?.count || followingData.length,
          limit: response.data.pagination?.limit || 100,
        });

        if (followingData.length === 0 && !cursor) {
          toast.info("No following accounts found for this account");
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
    if (!filters.user_id && !filters.account_id) {
      toast.error("Please provide either user_id or account_id");
      return;
    }
    setData([]);
    if (viewMode === "following") {
      fetchFollowing();
    } else {
      fetchFollowers();
    }
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
    setData([]);
    setPagination({
      cursor: null,
      hasMore: false,
      count: 0,
      limit: 100,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="flex space-x-2">
              <button
                onClick={() => handleModeChange("followers")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === "followers"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => handleModeChange("following")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === "following"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Following
              </button>
            </div>
          </div>
        </div>

        {/* Search Filters */}
        <div className="card mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram Username (user_id)
                </label>
                <input
                  type="text"
                  name="user_id"
                  value={filters.user_id}
                  onChange={handleFilterChange}
                  placeholder="e.g., farhan._.ahmad"
                  className="input-field"
                />
              </div>
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
                  Limit (1-1000)
                </label>
                <input
                  type="number"
                  name="limit"
                  value={filters.limit}
                  onChange={handleFilterChange}
                  min="1"
                  max="1000"
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Loading..." : "Search Followers"}
              </button>
              <p className="text-sm text-gray-500">
                {filters.user_id && filters.account_id
                  ? "⚠️ Both fields filled - account_id will be used"
                  : filters.user_id || filters.account_id
                  ? "✓ Ready to search"
                  : "Please provide user_id or account_id"}
              </p>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading && data.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : data.length === 0 ? (
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
                ? `No ${viewMode === "following" ? "following accounts" : "followers"} found for the specified account.`
                : `Enter a username or account ID to search for ${viewMode === "following" ? "following accounts" : "followers"}.`}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{data.length}</span> {viewMode === "following" ? "following accounts" : "followers"}
                {pagination.hasMore && " (more available)"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {data.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 20) * 0.05 }}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 relative">
                      {item.profilePicture ? (
                        <img
                          src={item.profilePicture}
                          alt={item.username}
                          className="w-20 h-20 rounded-full object-cover mx-auto"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto ${item.profilePicture ? 'hidden' : 'flex'}`}
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
                      {item.id && (
                        <p className="text-xs text-gray-400 mb-1">ID: {item.id}</p>
                      )}
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
      </div>
    </div>
  );
};

export default Followers;

