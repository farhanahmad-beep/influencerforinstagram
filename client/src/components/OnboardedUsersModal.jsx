import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const OnboardedUsersModal = ({ isOpen, onClose }) => {
  const [onboardedUsers, setOnboardedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usersInCampaigns, setUsersInCampaigns] = useState(new Map()); // userId -> array of campaign names

  // Fetch onboarded users and campaigns when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchOnboardedUsers();
      fetchCampaigns();
    }
  }, [isOpen]);

  const fetchOnboardedUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/onboarded-users`,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setOnboardedUsers(response.data.data || []);
      } else {
        toast.error(response.data.error || "Failed to fetch onboarded users");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to fetch onboarded users";
      toast.error(errorMessage);
      console.error("Failed to fetch onboarded users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns`,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const campaigns = response.data.data || [];
        // Build a map of userId -> campaign names array
        const userCampaignMap = new Map();

        campaigns.forEach(campaign => {
          if (campaign.userIds) {
            campaign.userIds.forEach(userId => {
              if (!userCampaignMap.has(userId)) {
                userCampaignMap.set(userId, []);
              }
              userCampaignMap.get(userId).push(campaign.name);
            });
          }
        });

        setUsersInCampaigns(userCampaignMap);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      // Don't show toast for campaign fetch errors since it's secondary data
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    const numericValue = Number(num);
    if (isNaN(numericValue)) return '0';

    if (numericValue >= 1000000) {
      return `${(numericValue / 1000000).toFixed(1)}M`;
    } else if (numericValue >= 1000) {
      return `${(numericValue / 1000).toFixed(1)}K`;
    }
    return numericValue.toString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Users Who Show Interest</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            View all users who have shown interest and been onboarded
          </p>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : onboardedUsers.length === 0 ? (
            <div className="text-center py-12">
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
                No Onboarded Users
              </h3>
              <p className="text-gray-500">
                No users have shown interest yet
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{onboardedUsers.length}</span> onboarded user{onboardedUsers.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {onboardedUsers.map((user, index) => (
                  <div
                    key={user._id || user.userId || index}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="p-6">
                      {/* Header with Avatar and Name */}
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                          {(user.profilePictureData || user.profilePicture) ? (
                            <img
                              src={user.profilePictureData || user.profilePicture}
                              alt={user.username || user.name}
                              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.nextElementSibling;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 ${
                              (user.profilePictureData || user.profilePicture) ? 'hidden' : 'flex'
                            }`}
                          >
                            <span className="text-purple-600 font-bold text-lg">
                              {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                            {user.name || "Unknown"}
                          </h3>
                          {user.username && (
                            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                          )}
                          {usersInCampaigns.has(user.userId) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              In {usersInCampaigns.get(user.userId).length} campaign{usersInCampaigns.get(user.userId).length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* User Details */}
                      <div className="space-y-3">
                        {(user.followersCount > 0 || user.followingCount > 0) && (
                          <div className="flex items-center justify-center space-x-4 py-2 border-t border-gray-100">
                            {user.followersCount !== undefined && user.followersCount > 0 && (
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-gray-900 text-sm">{formatNumber(user.followersCount)}</span>
                                <span className="text-xs text-gray-500">Followers</span>
                              </div>
                            )}
                            {user.followersCount > 0 && user.followingCount > 0 && (
                              <div className="w-px h-8 bg-gray-300"></div>
                            )}
                            {user.followingCount !== undefined && user.followingCount > 0 && (
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-gray-900 text-sm">{formatNumber(user.followingCount)}</span>
                                <span className="text-xs text-gray-500">Following</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Additional Info */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500 space-y-1">
                            <p><span className="font-medium">User ID:</span> {user.userId}</p>
                            {user.providerId && (
                              <p><span className="font-medium">Provider ID:</span> {user.providerId}</p>
                            )}
                            {user.createdAt && (
                              <p><span className="font-medium">Onboarded:</span> {formatDate(user.createdAt)}</p>
                            )}
                            <p className="text-purple-600 font-medium">Instagram</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardedUsersModal;
