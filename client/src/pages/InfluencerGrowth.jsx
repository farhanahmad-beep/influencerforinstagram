import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const InfluencerGrowth = () => {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [refreshingInfluencers, setRefreshingInfluencers] = useState(new Set());
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedInfluencersForDelete, setSelectedInfluencersForDelete] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [topFilter, setTopFilter] = useState("all"); // "all", "3", "5", "10"

  useEffect(() => {
    fetchInfluencerGrowth();
  }, []);

  // Reset date range when modal closes
  useEffect(() => {
    if (!selectedInfluencer) {
      setDateRange({ start: null, end: null });
      setShowDatePicker(false);
    }
  }, [selectedInfluencer]);

  const fetchInfluencerGrowth = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/influencer-growth`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setInfluencers(response.data.data);
      } else {
        toast.error(response.data.error || "Failed to fetch influencer growth data");
      }
    } catch (error) {
      toast.error("Failed to fetch influencer growth data");
      console.error("Failed to fetch influencer growth data:", error);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const prepareChartData = (growthHistory) => {
    const sortedHistory = growthHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return sortedHistory.map((point, index) => {
      const previousPoint = sortedHistory[index - 1];
      const followersDiff = calculateDifference(point.followersCount, previousPoint?.followersCount);
      const timeDiff = calculateTimeDifference(point.timestamp, previousPoint?.timestamp);

      return {
        date: formatDate(point.timestamp),
        followers: point.followersCount,
        followersDiff,
        timeDiff,
        index,
      };
    });
  };

  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const calculateDifference = (current, previous) => {
    if (previous === undefined || previous === null) return null;
    return current - previous;
  };

  const calculateTimeDifference = (currentTimestamp, previousTimestamp) => {
    if (!previousTimestamp) return null;

    const current = new Date(currentTimestamp);
    const previous = new Date(previousTimestamp);
    const diffMs = current - previous;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const filterGrowthHistoryByDateRange = (growthHistory, startDate, endDate) => {
    if (!startDate || !endDate) return growthHistory;

    const start = new Date(startDate);
    const end = new Date(endDate);

    return growthHistory.filter(point => {
      const pointDate = new Date(point.timestamp);
      return pointDate >= start && pointDate <= end;
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const calculatePeriodGrowth = (filteredHistory) => {
    if (filteredHistory.length < 2) return null;

    const firstPoint = filteredHistory[0];
    const lastPoint = filteredHistory[filteredHistory.length - 1];

    return {
      followersGrowth: lastPoint.followersCount - firstPoint.followersCount,
      followingGrowth: lastPoint.followingCount - firstPoint.followingCount,
      startDate: firstPoint.timestamp,
      endDate: lastPoint.timestamp,
      dataPoints: filteredHistory.length
    };
  };

  const getDateRangeBounds = (growthHistory) => {
    if (!growthHistory || growthHistory.length === 0) return { min: null, max: null };

    const timestamps = growthHistory.map(point => new Date(point.timestamp));
    return {
      min: new Date(Math.min(...timestamps)).toISOString().slice(0, 16),
      max: new Date(Math.max(...timestamps)).toISOString().slice(0, 16)
    };
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {data.timeDiff && (
            <p className="text-xs text-gray-500 mb-2">Time since previous: +{data.timeDiff}</p>
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-purple-600 font-medium">Followers:</span>
              <span className="ml-2">
                {data.followers.toLocaleString()}
                {data.followersDiff !== null && (
                  <span className={`ml-1 text-xs ${data.followersDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({data.followersDiff >= 0 ? '+' : ''}{data.followersDiff})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleRefreshInfluencer = async (influencerId) => {
    setRefreshingInfluencers(prev => new Set(prev).add(influencerId));

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/influencers/refresh-influencer`, {
        influencerId
      }, { withCredentials: true });

      if (response.data.success) {
        toast.success("Influencer data refreshed successfully!");

        // Update the local state with the refreshed data
        setInfluencers(prev => prev.map(inf =>
          inf.id === influencerId ? response.data.data : inf
        ));

        // If the selected influencer is being refreshed, update it too
        if (selectedInfluencer && selectedInfluencer.id === influencerId) {
          setSelectedInfluencer(response.data.data);
        }
      } else {
        toast.error(response.data.error || "Failed to refresh influencer data");
      }
    } catch (error) {
      toast.error("Failed to refresh influencer data");
      console.error("Failed to refresh influencer:", error);
    } finally {
      setRefreshingInfluencers(prev => {
        const newSet = new Set(prev);
        newSet.delete(influencerId);
        return newSet;
      });
    }
  };

  const handleRefreshAllInfluencers = async () => {
    if (influencers.length === 0) {
      toast.error("No influencers to refresh");
      return;
    }

    setIsGlobalRefreshing(true);
    let successCount = 0;
    let failCount = 0;

    // Set all influencers as refreshing
    setRefreshingInfluencers(new Set(influencers.map(inf => inf.id)));

    try {
      // Refresh all influencers sequentially to avoid overwhelming the API
      for (const influencer of influencers) {
        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/influencers/refresh-influencer`, {
            influencerId: influencer.id
          }, { withCredentials: true });

          if (response.data.success) {
            successCount++;
            // Update the influencer data
            setInfluencers(prev => prev.map(inf =>
              inf.id === influencer.id ? response.data.data : inf
            ));

            // Update selected influencer if it's the one being refreshed
            if (selectedInfluencer && selectedInfluencer.id === influencer.id) {
              setSelectedInfluencer(response.data.data);
            }
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          console.error(`Failed to refresh influencer ${influencer.id}:`, error);
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (successCount > 0) {
        toast.success(`Successfully refreshed ${successCount} influencer(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to refresh ${failCount} influencer(s)`);
      }
    } catch (error) {
      toast.error("Failed to refresh influencers");
      console.error("Failed to refresh all influencers:", error);
    } finally {
      setIsGlobalRefreshing(false);
      setRefreshingInfluencers(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedInfluencersForDelete.size === 0) {
      toast.error("Please select influencers to delete");
      return;
    }

    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/influencers/influencer-growth`, {
        data: { ids: Array.from(selectedInfluencersForDelete) },
        withCredentials: true,
      });

      if (response.data.success) {
        toast.success(`Successfully deleted ${response.data.deletedCount} influencer(s)`);
        // Remove deleted influencers from the state
        setInfluencers(prev => prev.filter(inf => !selectedInfluencersForDelete.has(inf.id)));
        setSelectedInfluencersForDelete(new Set());
        setIsDeleteMode(false);
        setShowDeleteModal(false);
      } else {
        toast.error(response.data.error || "Failed to delete influencers");
      }
    } catch (error) {
      toast.error("Failed to delete influencers");
      console.error("Failed to delete influencers:", error);
    }
  };

  const toggleInfluencerSelection = (influencerId) => {
    const newSelection = new Set(selectedInfluencersForDelete);
    if (newSelection.has(influencerId)) {
      newSelection.delete(influencerId);
    } else {
      newSelection.add(influencerId);
    }
    setSelectedInfluencersForDelete(newSelection);
  };

  const selectAllInfluencers = () => {
    if (selectedInfluencersForDelete.size === influencers.length) {
      setSelectedInfluencersForDelete(new Set());
    } else {
      setSelectedInfluencersForDelete(new Set(influencers.map(inf => inf.id)));
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Influencer Growth Tracking</h1>
                <p className="text-gray-600">
                  Monitor follower and engagement growth for influencers you've contacted
                </p>
              </div>
              {!loading && influencers.length > 0 && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRefreshAllInfluencers}
                    disabled={isGlobalRefreshing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isGlobalRefreshing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh All</span>
                      </>
                    )}
                  </button>
                  {isDeleteMode && (
                    <button
                      onClick={selectAllInfluencers}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {selectedInfluencersForDelete.size === influencers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <button
                    onClick={() => setIsDeleteMode(!isDeleteMode)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isDeleteMode
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {isDeleteMode ? 'Cancel Delete' : 'Delete Users'}
                  </button>
                  {isDeleteMode && selectedInfluencersForDelete.size > 0 && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Selected ({selectedInfluencersForDelete.size})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Filters Section */}
            {!loading && influencers.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Search Input */}
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search influencers by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Top Performer Filter */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Show:</span>
                    <div className="flex space-x-1">
                      {[
                        { value: "all", label: "All" },
                        { value: "10", label: "Top 10" },
                        { value: "5", label: "Top 5" },
                        { value: "3", label: "Top 3" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setTopFilter(option.value)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            topFilter === option.value
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active Filters Display */}
                {(searchTerm || topFilter !== "all") && (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                    <span>Active filters:</span>
                    {searchTerm && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        Name: "{searchTerm}"
                        <button
                          onClick={() => setSearchTerm("")}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {topFilter !== "all" && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                        Top {topFilter}
                        <button
                          onClick={() => setTopFilter("all")}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : influencers.length === 0 ? (
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
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Growth Data Yet</h3>
              <p className="text-gray-500">
                Start sending messages to influencers from Global Search to begin tracking their growth.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Influencers List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(() => {
                  // First sort by growth
                  const sortedInfluencers = influencers.sort((a, b) => {
                    const aGrowth = a.latestGrowth?.followersGrowth || 0;
                    const bGrowth = b.latestGrowth?.followersGrowth || 0;
                    return bGrowth - aGrowth; // Sort by growth descending
                  });

                  // Apply top filter
                  let filteredInfluencers = sortedInfluencers;
                  if (topFilter !== "all") {
                    const limit = parseInt(topFilter);
                    filteredInfluencers = sortedInfluencers.slice(0, limit);
                  }

                  // Apply search filter
                  if (searchTerm) {
                    filteredInfluencers = filteredInfluencers.filter(influencer =>
                      influencer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      influencer.username?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  }

                  return filteredInfluencers.map((influencer, index) => (
                  <motion.div
                    key={influencer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`card hover:shadow-lg transition-shadow relative ${
                      isDeleteMode ? 'cursor-default' : 'cursor-pointer'
                    } ${index === 0 ? 'border-2 border-yellow-400' : ''}`}
                    onClick={() => !isDeleteMode && setSelectedInfluencer(influencer)}
                  >
                    {/* Ranking Badge - Only show for top 10 */}
                    {index < 10 && (
                      <div className="absolute top-4 right-16 z-10">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1 ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {index === 0 && <span>🏆</span>}
                          {index === 1 && <span>🥈</span>}
                          {index === 2 && <span>🥉</span>}
                          <span>#{index + 1}</span>
                        </div>
                      </div>
                    )}

                    {isDeleteMode && (
                      <div
                        className="absolute top-4 left-4 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedInfluencersForDelete.has(influencer.id)}
                          onChange={() => toggleInfluencerSelection(influencer.id)}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshInfluencer(influencer.id);
                      }}
                      disabled={refreshingInfluencers.has(influencer.id) || isDeleteMode || isGlobalRefreshing}
                      className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isGlobalRefreshing ? "Global refresh in progress" : isDeleteMode ? "Disabled in delete mode" : "Refresh profile data"}
                    >
                      {refreshingInfluencers.has(influencer.id) ? (
                        <svg className="w-4 h-4 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                    <div className="flex items-start space-x-4">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        {influencer.profilePictureData ? (
                          <img
                            src={influencer.profilePictureData}
                            alt={influencer.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : influencer.profilePicture ? (
                          <img
                            src={influencer.profilePicture}
                            alt={influencer.name}
                            className="w-16 h-16 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-xl">
                              {influencer.name?.charAt(0)?.toUpperCase() || "I"}
                            </span>
                          </div>
                        )}
                        {influencer.isVerified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {influencer.name}
                          </h3>
                          {influencer.isPrivate && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              Private
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-500 mb-1">
                          @{influencer.username}
                        </p>
                        <p className="text-xs text-gray-400 mb-3">
                          ID: {influencer.id}
                        </p>

                        <div className="mb-3">
                          <div>
                            <p className="text-sm text-gray-500">Followers</p>
                            <p className="text-lg font-semibold text-purple-600">
                              {influencer.followersCount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {influencer.latestGrowth && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Total Growth (since first contact)</p>
                            <div className="text-xs">
                              <span className={influencer.latestGrowth.followersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                                Followers: {influencer.latestGrowth.followersGrowth >= 0 ? '+' : ''}{influencer.latestGrowth.followersGrowth.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>Tracked: {formatDate(influencer.firstTrackedAt)}</span>
                          <span>Updated: {formatDate(influencer.lastUpdatedAt)}</span>
                        </div>

                        {influencer.growthHistory && influencer.growthHistory.length > 1 && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-500 mb-1">Recent Growth</div>
                            <div className="h-12">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={prepareChartData(influencer.growthHistory.slice(-5))}>
                                  <Line
                                    type="monotone"
                                    dataKey="followers"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Detailed View Modal */}
          {selectedInfluencer && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Growth Details</h2>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="px-3 py-2 bg-blue-50 text-purple-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        Filter by Date
                      </button>
                    <button
                      onClick={() => setSelectedInfluencer(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  </div>

                  {/* Date Range Picker */}
                  {showDatePicker && selectedInfluencer.growthHistory && selectedInfluencer.growthHistory.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Filter Growth Data</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={dateRange.start || ''}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            min={getDateRangeBounds(selectedInfluencer.growthHistory).min}
                            max={getDateRangeBounds(selectedInfluencer.growthHistory).max}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={dateRange.end || ''}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            min={dateRange.start || getDateRangeBounds(selectedInfluencer.growthHistory).min}
                            max={getDateRangeBounds(selectedInfluencer.growthHistory).max}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-600">
                          Showing data from {getDateRangeBounds(selectedInfluencer.growthHistory).min ? formatDate(getDateRangeBounds(selectedInfluencer.growthHistory).min) : 'N/A'} to {getDateRangeBounds(selectedInfluencer.growthHistory).max ? formatDate(getDateRangeBounds(selectedInfluencer.growthHistory).max) : 'N/A'}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setDateRange({ start: null, end: null })}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Clear Filter
                          </button>
                          <button
                            onClick={() => setShowDatePicker(false)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-6 mb-6">
                    <div className="relative">
                      {selectedInfluencer.profilePictureData ? (
                        <img
                          src={selectedInfluencer.profilePictureData}
                          alt={selectedInfluencer.name}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : selectedInfluencer.profilePicture ? (
                        <img
                          src={selectedInfluencer.profilePicture}
                          alt={selectedInfluencer.name}
                          className="w-24 h-24 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-2xl">
                            {selectedInfluencer.name?.charAt(0)?.toUpperCase() || "I"}
                          </span>
                        </div>
                      )}
                      {selectedInfluencer.isVerified && (
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{selectedInfluencer.name}</h3>
                      <p className="text-gray-500 mb-1">@{selectedInfluencer.username}</p>
                      <p className="text-xs text-gray-400 mb-2">ID: {selectedInfluencer.id}</p>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedInfluencer.isPrivate ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {selectedInfluencer.isPrivate ? 'Private' : 'Public'}
                        </span>
                        {selectedInfluencer.isVerified && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    // Calculate filtered data for display
                    const isFiltered = dateRange.start && dateRange.end;
                    const filteredHistory = selectedInfluencer.growthHistory ?
                      (isFiltered ? filterGrowthHistoryByDateRange(selectedInfluencer.growthHistory, dateRange.start, dateRange.end) : selectedInfluencer.growthHistory) : [];
                    const periodGrowth = isFiltered ? calculatePeriodGrowth(filteredHistory) : null;

                    return (
                      <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                              {isFiltered && filteredHistory.length > 0 ?
                                filteredHistory[filteredHistory.length - 1].followersCount.toLocaleString() :
                                selectedInfluencer.followersCount.toLocaleString()}
                            </p>
                      <p className="text-sm text-gray-500">
                              {isFiltered ? 'Followers (Filtered)' : 'Current Followers'}
                            </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Data Points</p>
                      <p className="text-2xl font-bold text-purple-600">{filteredHistory.length || selectedInfluencer.growthHistory?.length || 0}</p>
                    </div>
                  </div>

                        {/* Period Growth Metrics */}
                        {periodGrowth && dateRange.start && dateRange.end && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                              Growth in Selected Period ({formatDate(periodGrowth.startDate)} - {formatDate(periodGrowth.endDate)})
                            </h4>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                              <p className="text-sm text-gray-500 mb-1">Followers Growth</p>
                              <p className={`text-2xl font-bold ${periodGrowth.followersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {periodGrowth.followersGrowth >= 0 ? '+' : ''}{periodGrowth.followersGrowth.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">Over {periodGrowth.dataPoints} data points</p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {selectedInfluencer.latestGrowth && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Total Growth Metrics</h4>
                      <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">Followers Growth</p>
                        <p className={`text-2xl font-bold ${selectedInfluencer.latestGrowth.followersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedInfluencer.latestGrowth.followersGrowth >= 0 ? '+' : ''}{selectedInfluencer.latestGrowth.followersGrowth.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Since first contact</p>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const filteredHistory = selectedInfluencer.growthHistory ?
                      filterGrowthHistoryByDateRange(selectedInfluencer.growthHistory, dateRange.start, dateRange.end) : [];
                    const chartData = filteredHistory.length > 1 ? prepareChartData(filteredHistory) : [];

                    return filteredHistory.length > 1 ? (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Growth Chart {dateRange.start && dateRange.end ? '(Filtered Period)' : '(All Time)'}
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" fontSize={12} />
                              <YAxis fontSize={12} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="followers"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                name="Followers"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Growth History {dateRange.start && dateRange.end ? '(Filtered Period)' : '(All Time)'}
                    </h4>
                    {(() => {
                      const filteredHistory = selectedInfluencer.growthHistory ?
                        filterGrowthHistoryByDateRange(selectedInfluencer.growthHistory, dateRange.start, dateRange.end) : [];

                      return (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {filteredHistory.length > 0 ? (
                            filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((point, index, array) => {
                              const nextPoint = array[index + 1]; // Next item is chronologically previous
                              const followersDiff = calculateDifference(point.followersCount, nextPoint?.followersCount);
                              const timeDiff = calculateTimeDifference(point.timestamp, nextPoint?.timestamp);

                              return (
                                <div key={index} className="py-3 px-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900">{formatDate(point.timestamp)}</span>
                                    {timeDiff && (
                                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                        +{timeDiff}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex">
                                      <span className="text-sm">
                                        <span className="font-medium text-purple-600">{point.followersCount.toLocaleString()}</span>
                                        {followersDiff !== null && (
                                          <span className={`ml-1 text-xs ${followersDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ({followersDiff >= 0 ? '+' : ''}{followersDiff})
                                          </span>
                                        )}
                                        <span className="text-gray-500 ml-1">followers</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p>No data points found in the selected date range.</p>
                              <p className="text-sm mt-1">Try adjusting your date filter or clearing it to see all data.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg max-w-md w-full p-6"
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Influencers</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to delete {selectedInfluencersForDelete.size} influencer(s)? This action cannot be undone and will permanently remove all growth data for these influencers.
                  </p>
                  <div className="flex space-x-3 justify-center">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfluencerGrowth;