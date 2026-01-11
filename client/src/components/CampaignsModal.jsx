import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const CampaignsModal = ({ isOpen, onClose, initialTab = 'active' }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [onboardedUsers, setOnboardedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'

  // Fetch campaigns and users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
      fetchOnboardedUsers();
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns`,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setCampaigns(response.data.data || []);
      } else {
        toast.error(response.data.error || "Failed to fetch campaigns");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to fetch campaigns";
      toast.error(errorMessage);
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnboardedUsers = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/onboarded-users`,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setOnboardedUsers(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch onboarded users:", error);
      // Don't show toast for users fetch since it's secondary data
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'ready':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return '▶️';
      case 'completed':
        return '✅';
      case 'expired':
        return '⏰';
      case 'ready':
        return '📝';
      default:
        return '❓';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter campaigns based on active tab
  const filteredCampaigns = campaigns.filter(campaign => {
    if (activeTab === 'active') {
      return campaign.status === 'running' || campaign.status === 'ready';
    } else {
      return campaign.status === 'completed' || campaign.status === 'expired';
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
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
            Manage your marketing campaigns and track their performance
          </p>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active Campaigns ({campaigns.filter(c => c.status === 'running' || c.status === 'ready').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'completed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Completed Campaigns ({campaigns.filter(c => c.status === 'completed' || c.status === 'expired').length})
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab === 'active' ? 'Active' : 'Completed'} Campaigns
              </h3>
              <p className="text-gray-500">
                {activeTab === 'active'
                  ? "No campaigns are currently running or in ready status."
                  : "No campaigns have been completed yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredCampaigns.length}</span> {activeTab === 'active' ? 'active' : 'completed'} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign, index) => (
                  <div
                    key={campaign._id || index}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-gray-300"
                  >
                    <div className="p-6">
                      {/* Header with Title and Status */}
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 pr-12">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            <span className="mr-1.5">{getStatusIcon(campaign.status)}</span>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </span>
                          <div className="relative group">
                            <span className="text-sm text-gray-600 font-medium cursor-pointer">
                              {campaign.userIds?.length || 0} users
                            </span>

                            {/* Tooltip */}
                            {campaign.userIds && campaign.userIds.length > 0 && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap max-w-xs">
                                <div className="text-xs text-gray-300 mb-1">Campaign Users:</div>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {campaign.userIds.map((userId) => {
                                    const user = onboardedUsers.find(u => u.userId === userId);
                                    return (
                                      <div key={userId} className="text-xs">
                                        {user?.username || user?.name || userId}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}

                      {/* Campaign Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Created</span>
                          <span className="text-sm text-gray-900 font-medium">
                            {formatDate(campaign.createdAt)}
                          </span>
                        </div>

                        {campaign.expiresAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Expires</span>
                            <span className={`text-sm font-medium ${
                              new Date(campaign.expiresAt) < new Date() ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {formatDate(campaign.expiresAt)}
                            </span>
                          </div>
                        )}

                        {campaign.notes && (
                          <div className="pt-2 border-t border-gray-100">
                            <span className="text-sm text-gray-500">Notes</span>
                            <p className="text-sm text-gray-900 mt-1 line-clamp-2">{campaign.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Campaign ID */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          <p><span className="font-medium">Campaign ID:</span> {campaign._id}</p>
                          <p className="text-purple-600 font-medium">Instagram</p>
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

export default CampaignsModal;
