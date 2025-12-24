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

  useEffect(() => {
    fetchInfluencerGrowth();
  }, []);

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
    return growthHistory.map((point, index) => ({
      date: formatDate(point.timestamp),
      followers: point.followersCount,
      following: point.followingCount,
      index,
    }));
  };

  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
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

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-8 pt-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Influencer Growth Tracking</h1>
            <p className="text-gray-600">
              Monitor follower and engagement growth for influencers you've contacted
            </p>
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
                {influencers.map((influencer, index) => (
                  <motion.div
                    key={influencer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card hover:shadow-lg transition-shadow cursor-pointer relative"
                    onClick={() => setSelectedInfluencer(influencer)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshInfluencer(influencer.id);
                      }}
                      disabled={refreshingInfluencers.has(influencer.id)}
                      className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh profile data"
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

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-500">Followers</p>
                            <p className="text-lg font-semibold text-purple-600">
                              {influencer.followersCount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Following</p>
                            <p className="text-lg font-semibold text-purple-600">
                              {influencer.followingCount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {influencer.latestGrowth && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Total Growth (since first contact)</p>
                            <div className="flex justify-between text-xs">
                              <span className={influencer.latestGrowth.followersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                                Followers: {influencer.latestGrowth.followersGrowth >= 0 ? '+' : ''}{influencer.latestGrowth.followersGrowth.toLocaleString()}
                              </span>
                              <span className={influencer.latestGrowth.followingGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                                Following: {influencer.latestGrowth.followingGrowth >= 0 ? '+' : ''}{influencer.latestGrowth.followingGrowth.toLocaleString()}
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
                ))}
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
                    <button
                      onClick={() => setSelectedInfluencer(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedInfluencer.followersCount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Current Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedInfluencer.followingCount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Current Following</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Data Points</p>
                      <p className="text-2xl font-bold text-purple-600">{selectedInfluencer.growthHistory?.length || 0}</p>
                    </div>
                  </div>

                  {selectedInfluencer.latestGrowth && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Total Growth Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500 mb-1">Followers Growth</p>
                          <p className={`text-2xl font-bold ${selectedInfluencer.latestGrowth.followersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedInfluencer.latestGrowth.followersGrowth >= 0 ? '+' : ''}{selectedInfluencer.latestGrowth.followersGrowth.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Since first contact</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500 mb-1">Following Growth</p>
                          <p className={`text-2xl font-bold ${selectedInfluencer.latestGrowth.followingGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedInfluencer.latestGrowth.followingGrowth >= 0 ? '+' : ''}{selectedInfluencer.latestGrowth.followingGrowth.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Since first contact</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedInfluencer.growthHistory && selectedInfluencer.growthHistory.length > 1 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Growth Chart</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={prepareChartData(selectedInfluencer.growthHistory)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="followers"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              name="Followers"
                            />
                            <Line
                              type="monotone"
                              dataKey="following"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              name="Following"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Growth History</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedInfluencer.growthHistory?.map((point, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">{formatDate(point.timestamp)}</span>
                          <div className="flex space-x-4">
                            <span className="text-sm">
                              <span className="font-medium text-purple-600">{point.followersCount.toLocaleString()}</span>
                              <span className="text-gray-500 ml-1">followers</span>
                            </span>
                            <span className="text-sm">
                              <span className="font-medium text-blue-600">{point.followingCount.toLocaleString()}</span>
                              <span className="text-gray-500 ml-1">following</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
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