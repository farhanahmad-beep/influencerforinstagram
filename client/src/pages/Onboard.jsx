import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const Onboard = () => {
  const [onboardedUsers, setOnboardedUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'campaigns'
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    userIds: [],
    expiresAt: '',
    notes: '',
  });
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [usersInCampaigns, setUsersInCampaigns] = useState(new Map()); // userId -> array of campaign names
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedUsersForDelete, setSelectedUsersForDelete] = useState(new Set());
  const [deleteProgress, setDeleteProgress] = useState({});
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [sendingCampaigns, setSendingCampaigns] = useState(new Set()); // Track campaigns currently sending messages
  const [sentCampaigns, setSentCampaigns] = useState(new Set()); // Track campaigns that have been sent at least once

  useEffect(() => {
    fetchOnboardedUsers();
    fetchCampaigns();
    fetchLinkedAccounts();
  }, []);

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

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/influencers/onboarded-users/${userId}`,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("User deleted successfully");
        // Remove the deleted user from the list
        setOnboardedUsers((prev) => prev.filter((user) => user.userId !== userId));
      } else {
        toast.error(response.data.error || "Failed to delete user");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to delete user";
      toast.error(errorMessage);
      console.error("Failed to delete user:", error);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleUserSelectForDelete = (userId) => {
    setSelectedUsersForDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAllForDelete = () => {
    if (selectedUsersForDelete.size === onboardedUsers.length) {
      setSelectedUsersForDelete(new Set());
    } else {
      setSelectedUsersForDelete(new Set(onboardedUsers.map(user => user.userId)));
    }
  };

  const handleDeleteMultipleClick = () => {
    if (isSelectionMode) {
      toast.error("Exit campaign creation mode first");
      return;
    }
    if (selectedUsersForDelete.size === 0) {
      // Enable delete selection mode if no users are selected
      setIsDeleteMode(true);
      toast("Select users to delete", { duration: 3000 });
    } else {
      // Delete selected users
      handleDeleteMultiple();
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedUsersForDelete.size === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedUsersForDelete.size} user${selectedUsersForDelete.size !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingMultiple(true);
    const userIds = Array.from(selectedUsersForDelete);
    const progress = {};
    userIds.forEach((id) => {
      progress[id] = { status: "pending", message: "" };
    });
    setDeleteProgress(progress);

    let successCount = 0;
    let failCount = 0;

    // Delete users sequentially to avoid overwhelming the API
    for (const userId of userIds) {
      try {
        const response = await axios.delete(
          `${import.meta.env.VITE_API_URL}/influencers/onboarded-users/${userId}`,
          {
            withCredentials: true,
          }
        );

        if (response.data.success) {
          successCount++;
          setDeleteProgress((prev) => ({
            ...prev,
            [userId]: { status: "success", message: "Deleted successfully" },
          }));
          // Remove from local state
          setOnboardedUsers((prev) => prev.filter((user) => user.userId !== userId));
        } else {
          failCount++;
          setDeleteProgress((prev) => ({
            ...prev,
            [userId]: {
              status: "error",
              message: response.data.error || "Failed to delete",
            },
          }));
        }
      } catch (error) {
        failCount++;
        const errorMessage =
          error.response?.data?.error || error.message || "Failed to delete";
        setDeleteProgress((prev) => ({
          ...prev,
          [userId]: { status: "error", message: errorMessage },
        }));
      }

      // Small delay between deletions to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsDeletingMultiple(false);

    if (successCount > 0) {
      toast.success(
        `Deleted ${successCount} user${successCount !== 1 ? "s" : ""} successfully`
      );
    }
    if (failCount > 0) {
      toast.error(
        `Failed to delete ${failCount} user${failCount !== 1 ? "s" : ""}`
      );
    }

    // Reset after a delay to show progress
    setTimeout(() => {
      setSelectedUsersForDelete(new Set());
      setIsDeleteMode(false);
      setDeleteProgress({});
    }, 2000);
  };

  const handleCancelDeleteSelection = () => {
    setIsDeleteMode(false);
    setSelectedUsersForDelete(new Set());
  };

  // Campaign management functions
  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns`,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const campaignData = response.data.data || [];
        setCampaigns(campaignData);

        // Build map of users in campaigns
        const userCampaignMap = new Map();
        campaignData.forEach(campaign => {
          campaign.userIds.forEach(userId => {
            if (!userCampaignMap.has(userId)) {
              userCampaignMap.set(userId, []);
            }
            userCampaignMap.get(userId).push(campaign.name);
          });
        });
        setUsersInCampaigns(userCampaignMap);
      } else {
        toast.error(response.data.error || "Failed to fetch campaigns");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to fetch campaigns";
      toast.error(errorMessage);
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    if (!campaignForm.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user for the campaign");
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns`,
        {
          ...campaignForm,
          userIds: Array.from(selectedUsers),
          name: campaignForm.name.trim(),
          description: campaignForm.description.trim(),
          notes: campaignForm.notes.trim(),
          expiresAt: campaignForm.expiresAt || null,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("Campaign created successfully!");
        setShowCreateCampaignModal(false);
        setCampaignForm({
          name: '',
          description: '',
          userIds: [],
          expiresAt: '',
          notes: '',
        });
        setSelectedUsers(new Set());
        setIsSelectionMode(false);
        fetchCampaigns();
      } else {
        toast.error(response.data.error || "Failed to create campaign");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to create campaign";
      toast.error(errorMessage);
      console.error("Failed to create campaign:", error);
    }
  };

  const handleUpdateCampaignStatus = async (campaignId, status) => {
    try {
      // If starting a campaign, send messages to all users first
      if (status === 'running') {
        const campaign = campaigns.find(c => c._id === campaignId);
        if (!campaign) {
          toast.error("Campaign not found");
          return;
        }

        if (!selectedAccountId) {
          toast.error("Please select an account first to send campaign messages");
          return;
        }

        // Send campaign message to all users
        await sendCampaignMessages(campaignId, campaign);
        return; // sendCampaignMessages will handle the status update
      }

      // For other status updates, just update the status
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns/${campaignId}`,
        { status },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success(`Campaign status updated to ${status}`);
        fetchCampaigns();
      } else {
        toast.error(response.data.error || "Failed to update campaign status");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to update campaign status";
      toast.error(errorMessage);
      console.error("Failed to update campaign status:", error);
    }
  };

  const handleUpdateCampaignExpiration = async (campaignId, expiresAt) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns/${campaignId}`,
        { expiresAt: expiresAt || null },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("Campaign expiration date updated");
        fetchCampaigns();
      } else {
        toast.error(response.data.error || "Failed to update campaign expiration");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to update campaign expiration";
      toast.error(errorMessage);
      console.error("Failed to update campaign expiration:", error);
    }
  };

  const handleDeleteCampaign = async (campaignId, campaignName) => {
    if (!window.confirm(`Are you sure you want to delete the campaign "${campaignName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns/${campaignId}`,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("Campaign deleted successfully");
        fetchCampaigns();
      } else {
        toast.error(response.data.error || "Failed to delete campaign");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to delete campaign";
      toast.error(errorMessage);
      console.error("Failed to delete campaign:", error);
    }
  };

  const fetchLinkedAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/linked-accounts`, {
        withCredentials: true,
      });
      if (response.data.success) {
        const accounts = response.data.data || [];
        setLinkedAccounts(accounts);
        if (accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch linked accounts:", error);
    } finally {
      setLoadingAccounts(false);
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

  const handleSelectAllUsers = () => {
    if (selectedUsers.size === onboardedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(onboardedUsers.map(user => user.userId)));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '▶️';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      case 'expired': return '⏰';
      default: return '📝';
    }
  };

  const sendCampaignMessages = async (campaignId, campaign) => {
    // Add campaign to sending state
    setSendingCampaigns(prev => new Set([...prev, campaignId]));

    const campaignMessage = `✨ Hey! Hope you're doing well!

I wanted to share something super useful for creators — Dynamite Influencer Store just launched! 🚀

It's a platform made specifically for influencers to create their own store, add products, and start selling directly to their audience — all in a few clicks.

You can check it out here

🔗 https://dynamiteinfluencerstore.icod.ai/

If you've ever wanted to launch your own store, earn more, and manage everything in one place, this is the perfect tool for you.

Let me know if you want help getting started! 😊`;

    try {
      toast(`Starting campaign "${campaign.name}" - sending messages...`, { duration: 3000 });

      // First, fetch all existing chats for this account
      const chatsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/chats`, {
        params: {
          account_id: selectedAccountId,
          limit: 1000, // Get as many chats as possible
        },
        withCredentials: true,
      });

      if (!chatsResponse.data.success) {
        throw new Error("Failed to fetch existing chats");
      }

      const existingChats = chatsResponse.data.data || [];

      let successCount = 0;
      let failCount = 0;
      let noChatCount = 0;

      // Send messages sequentially to avoid rate limiting
      for (let i = 0; i < campaign.userIds.length; i++) {
        const userId = campaign.userIds[i];
        const user = onboardedUsers.find(u => u.userId === userId);

        if (!user || !user.providerMessagingId) {
          failCount++;
          console.error(`User ${userId} not found or missing messaging ID`);
          continue;
        }

        // Find existing chat with this user
        const existingChat = existingChats.find(chat =>
          chat.attendeeProviderId === user.providerMessagingId ||
          chat.providerId === user.providerMessagingId
        );

        if (!existingChat) {
          noChatCount++;
          console.log(`No existing chat found for user ${user.name || userId}`);
          continue;
        }

        try {
          // Send message to existing chat
          const messageResponse = await axios.post(
            `${import.meta.env.VITE_API_URL}/influencers/chats/${existingChat.id}/messages`,
            `account_id=${encodeURIComponent(selectedAccountId)}&text=${encodeURIComponent(campaignMessage)}`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              withCredentials: true,
            }
          );

          if (messageResponse.data.success) {
            successCount++;
            toast.success(`Message sent to ${user.name || userId} (${successCount}/${campaign.userIds.length - noChatCount})`);
          } else {
            failCount++;
            console.error(`Failed to send to ${user.name || userId}:`, messageResponse.data.error);
          }
        } catch (error) {
          failCount++;
          console.error(`Error sending to ${user.name || userId}:`, error);
        }

        // Small delay between messages to avoid rate limiting
        if (i < campaign.userIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      // Update campaign status to running after sending messages
      const statusResponse = await axios.put(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns/${campaignId}`,
        { status: 'running' },
        {
          withCredentials: true,
        }
      );

      if (statusResponse.data.success) {
        // Mark campaign as sent
        setSentCampaigns(prev => new Set([...prev, campaignId]));

        toast.success(`Campaign "${campaign.name}" completed! Messages sent: ${successCount}/${campaign.userIds.length}`);
        if (noChatCount > 0) {
          toast.warning(`${noChatCount} user${noChatCount !== 1 ? 's' : ''} skipped (no existing chat)`);
        }
        fetchCampaigns();
      } else {
        toast.error("Campaign completed but status update failed");
      }

      if (failCount > 0) {
        toast.warning(`Failed to send to ${failCount} user${failCount !== 1 ? 's' : ''}`);
      }

    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to send campaign messages";
      toast.error(`Campaign failed: ${errorMessage}`);
      console.error("Failed to send campaign messages:", error);
    } finally {
      // Remove campaign from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboard Management</h1>
          <p className="text-gray-600">
            Manage onboarded users and create campaigns
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users ({onboardedUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'campaigns'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Campaigns ({campaigns.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Onboarded Users</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage users who have been onboarded</p>
                </div>
              </div>

              {/* Account Selection */}
              <div className="card mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Account for Messaging
                    </label>
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
                        <option value="">Select an account...</option>
                        {linkedAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            @{account.username} - {account.id}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No linked accounts found. Please add a linked account first.
                      </p>
                    )}
                  </div>
                  {selectedAccountId && (
                    <p className="text-sm text-green-600">
                      ✓ Account selected for campaign messaging
                    </p>
                  )}
                </div>
              </div>
            </div>

            {onboardedUsers.length > 0 && (
              <div className="flex items-center space-x-3 mb-6">
                {isSelectionMode && (
                  <>
                    <button
                      onClick={handleSelectAllUsers}
                      className="btn-secondary text-sm"
                    >
                      {selectedUsers.size === onboardedUsers.length ? "Deselect All" : "Select All"}
                    </button>
                    <button
                      onClick={() => setShowCreateCampaignModal(true)}
                      className="btn-primary text-sm"
                      disabled={selectedUsers.size === 0}
                    >
                      Create Campaign ({selectedUsers.size})
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedUsers(new Set());
                      }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {isDeleteMode && (
                  <>
                    <button
                      onClick={handleSelectAllForDelete}
                      className="btn-secondary text-sm"
                    >
                      {selectedUsersForDelete.size === onboardedUsers.length ? "Deselect All" : "Select All"}
                    </button>
                    <button
                      onClick={handleDeleteMultipleClick}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={selectedUsersForDelete.size === 0}
                    >
                      Delete Selected ({selectedUsersForDelete.size})
                    </button>
                    <button
                      onClick={handleCancelDeleteSelection}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {!isSelectionMode && !isDeleteMode && (
                  <>
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="btn-primary text-sm"
                    >
                      Create Campaign
                    </button>
                    <button
                      onClick={handleDeleteMultipleClick}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Multiple
                    </button>
                  </>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : onboardedUsers.length === 0 ? (
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
                  No Onboarded Users
                </h3>
                <p className="text-gray-500">
                  No users have been onboarded yet. Use the "Onboard" button in Chat List to onboard users.
                </p>
              </motion.div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{onboardedUsers.length}</span> onboarded user{onboardedUsers.length !== 1 ? 's' : ''}
                    {isSelectionMode && selectedUsers.size > 0 && (
                      <span className="ml-2 text-purple-600 font-medium">
                        ({selectedUsers.size} selected for campaign)
                      </span>
                    )}
                    {isDeleteMode && selectedUsersForDelete.size > 0 && (
                      <span className="ml-2 text-red-600 font-medium">
                        ({selectedUsersForDelete.size} selected for deletion)
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
                  {onboardedUsers.map((user, index) => (
                    <motion.div
                      key={user._id || user.userId || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index % 20) * 0.05 }}
                      className={`card hover:shadow-lg transition-shadow ${
                        selectedUsers.has(user.userId) || selectedUsersForDelete.has(user.userId)
                          ? "border-2 border-purple-500 bg-purple-50"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-4 mb-4">
                          {(isSelectionMode || isDeleteMode) && (
                            <input
                              type="checkbox"
                              checked={isSelectionMode ? selectedUsers.has(user.userId) : selectedUsersForDelete.has(user.userId)}
                              onChange={() => isSelectionMode ? handleUserSelect(user.userId) : handleUserSelectForDelete(user.userId)}
                              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                          )}
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                            selectedUsers.has(user.userId) || selectedUsersForDelete.has(user.userId) ? 'bg-purple-200' : 'bg-purple-100'
                          }`}>
                            <span className="text-purple-600 font-bold text-2xl">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {user.name || "Unknown"}
                              </h3>
                              {usersInCampaigns.has(user.userId) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  In {usersInCampaigns.get(user.userId).length} campaign{usersInCampaigns.get(user.userId).length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-start py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600 font-medium">User ID:</span>
                            <span className="text-sm text-gray-900 font-mono break-all text-right ml-2">
                              {user.userId || "N/A"}
                            </span>
                          </div>

                          {user.providerId && (
                            <div className="flex justify-between items-start py-2 border-b border-gray-200">
                              <span className="text-sm text-gray-600 font-medium">Provider ID:</span>
                              <span className="text-sm text-gray-900 font-mono break-all text-right ml-2">
                                {user.providerId}
                              </span>
                            </div>
                          )}

                          {user.providerMessagingId && (
                            <div className="flex justify-between items-start py-2 border-b border-gray-200">
                              <span className="text-sm text-gray-600 font-medium">Messaging ID:</span>
                              <span className="text-sm text-gray-900 font-mono break-all text-right ml-2">
                                {user.providerMessagingId}
                              </span>
                            </div>
                          )}

                          {usersInCampaigns.has(user.userId) && (
                            <div className="flex justify-between items-start py-2 border-b border-gray-200">
                              <span className="text-sm text-gray-600 font-medium">Campaigns:</span>
                              <div className="text-sm text-gray-900 text-right ml-2">
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {usersInCampaigns.get(user.userId).map((campaignName, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {campaignName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {user.createdAt && (
                            <div className="flex justify-between items-start py-2">
                              <span className="text-sm text-gray-600 font-medium">Created At:</span>
                              <span className="text-sm text-gray-900 text-right ml-2">
                                {formatDate(user.createdAt)}
                              </span>
                            </div>
                          )}
                        </div>

                        {!isSelectionMode && !isDeleteMode && (
                          <button
                            onClick={() => handleDelete(user.userId, user.name)}
                            disabled={deletingUserId === user.userId}
                            className="w-full mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingUserId === user.userId ? "Deleting..." : "Delete User"}
                          </button>
                        )}
                        {isDeleteMode && deleteProgress[user.userId] && (
                          <div className="w-full mt-4 px-4 py-2 text-sm font-medium text-center rounded-lg bg-gray-100">
                            <span
                              className={`${
                                deleteProgress[user.userId].status === "success"
                                  ? "text-green-600"
                                  : deleteProgress[user.userId].status === "error"
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {deleteProgress[user.userId].status === "pending" && "⏳ Deleting..."}
                              {deleteProgress[user.userId].status === "success" && "✓ Deleted"}
                              {deleteProgress[user.userId].status === "error" && `✗ ${deleteProgress[user.userId].message}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Campaigns</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your marketing campaigns</p>
                {!selectedAccountId && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Select an account in the Users tab to send campaign messages
                  </p>
                )}
              </div>
              {/* <button
                onClick={() => setShowCreateCampaignModal(true)}
                className="btn-primary"
              >
                Create Campaign
              </button> */}
            </div>

            {loadingCampaigns ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : campaigns.length === 0 ? (
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
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Campaigns
                </h3>
                <p className="text-gray-500">
                  No campaigns have been created yet. Create your first campaign to get started.
                </p>
              </motion.div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{campaigns.length}</span> campaign{campaigns.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {campaigns.map((campaign, index) => (
                    <motion.div
                      key={campaign._id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index % 20) * 0.05 }}
                      className="card hover:shadow-lg transition-shadow"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {campaign.name}
                            </h3>
                            <div className="flex items-center mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                <span className="mr-1">{getStatusIcon(campaign.status)}</span>
                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                              </span>
                              <span className="ml-2 text-sm text-gray-600">
                                {campaign.userCount} users
                              </span>
                            </div>
                          </div>
                        </div>

                        {campaign.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {campaign.description}
                          </p>
                        )}

                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-start py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600 font-medium">Created:</span>
                            <span className="text-sm text-gray-900 text-right ml-2">
                              {formatDate(campaign.createdAt)}
                            </span>
                          </div>

                          {campaign.expiresAt && (
                            <div className="flex justify-between items-start py-2 border-b border-gray-200">
                              <span className="text-sm text-gray-600 font-medium">Expires:</span>
                              <span className={`text-sm text-right ml-2 ${
                                new Date(campaign.expiresAt) < new Date() ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {formatDate(campaign.expiresAt)}
                              </span>
                            </div>
                          )}

                          {campaign.notes && (
                            <div className="py-2">
                              <span className="text-sm text-gray-600 font-medium">Notes:</span>
                              <p className="text-sm text-gray-900 mt-1">{campaign.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          {campaign.status === 'draft' && (
                            <button
                              onClick={() => {
                                if (!selectedAccountId) {
                                  toast.error("Please select an account in the Users tab first to send messages");
                                  setActiveTab('users');
                                } else {
                                  handleUpdateCampaignStatus(campaign._id, 'running');
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                              disabled={sendingCampaigns.has(campaign._id)}
                            >
                              {sendingCampaigns.has(campaign._id) ? 'Sending...' : 'Send Message'}
                            </button>
                          )}
                          {campaign.status === 'running' && !sendingCampaigns.has(campaign._id) && (
                            <>
                              {!sentCampaigns.has(campaign._id) ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateCampaignStatus(campaign._id, 'paused')}
                                    className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                                  >
                                    Pause
                                  </button>
                                  <button
                                    onClick={() => handleUpdateCampaignStatus(campaign._id, 'completed')}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    Complete
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (!selectedAccountId) {
                                      toast.error("Please select an account in the Users tab first to send messages");
                                      setActiveTab('users');
                                    } else {
                                      sendCampaignMessages(campaign._id, campaign);
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Send Message Again
                                </button>
                              )}
                            </>
                          )}
                          {campaign.status === 'running' && sendingCampaigns.has(campaign._id) && (
                            <button
                              className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg cursor-not-allowed"
                              disabled
                            >
                              Sending...
                            </button>
                          )}
                          {campaign.status === 'paused' && (
                            <button
                              onClick={() => handleUpdateCampaignStatus(campaign._id, 'running')}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                              disabled={sendingCampaigns.has(campaign._id)}
                            >
                              {sendingCampaigns.has(campaign._id) ? 'Sending...' : 'Send Message'}
                            </button>
                          )}
                          {campaign.status === 'completed' && (
                            <button
                              onClick={() => {
                                if (!selectedAccountId) {
                                  toast.error("Please select an account in the Users tab first to send messages");
                                  setActiveTab('users');
                                } else {
                                  handleUpdateCampaignStatus(campaign._id, 'running');
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                              disabled={sendingCampaigns.has(campaign._id)}
                            >
                              {sendingCampaigns.has(campaign._id) ? 'Sending...' : 'Send Again'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(campaign._id, campaign.name)}
                            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Create Campaign Modal */}
        {showCreateCampaignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Campaign</h2>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter campaign description"
                    className="input-field min-h-[80px] resize-y"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Users ({selectedUsers.size})
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {Array.from(selectedUsers).length === 0 ? (
                      <p className="text-sm text-gray-500">No users selected</p>
                    ) : (
                      <div className="space-y-1">
                        {Array.from(selectedUsers).map((userId) => {
                          const user = onboardedUsers.find(u => u.userId === userId);
                          const userCampaigns = usersInCampaigns.get(userId) || [];
                          return (
                            <div key={userId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-700">
                                  {user?.name || userId}
                                </span>
                                {userCampaigns.length > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                    In {userCampaigns.length} campaign{userCampaigns.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUserSelect(userId)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="datetime-local"
                    value={campaignForm.expiresAt}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Set when the campaign should expire
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={campaignForm.notes}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes for the campaign"
                    className="input-field min-h-[60px] resize-y"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCampaignModal(false);
                      setCampaignForm({
                        name: '',
                        description: '',
                        userIds: [],
                        expiresAt: '',
                        notes: '',
                      });
                      setSelectedUsers(new Set());
                      setIsSelectionMode(false);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={!campaignForm.name.trim() || selectedUsers.size === 0}
                  >
                    Create Campaign
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboard;

