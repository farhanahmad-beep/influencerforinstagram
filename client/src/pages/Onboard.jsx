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
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewingCampaign, setRenewingCampaign] = useState(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');

  useEffect(() => {
    fetchOnboardedUsers();
    fetchCampaigns();
    fetchLinkedAccounts();
  }, []);

  // Refresh campaigns when user switches to the campaigns tab
  useEffect(() => {
    if (activeTab === 'campaigns') {
      fetchCampaigns();
    }
  }, [activeTab]);

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

  const handleRenewCampaign = async (campaignId) => {
    if (!newExpirationDate) {
      toast.error("Please select a new expiration date");
      return;
    }

    try {
      // Update the expiration date
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/influencers/campaigns/${campaignId}`,
        {
          expiresAt: new Date(newExpirationDate).toISOString(),
          status: 'draft' // Reset to draft status when renewing
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("Campaign renewed successfully");
        setShowRenewModal(false);
        setRenewingCampaign(null);
        setNewExpirationDate('');
        fetchCampaigns();
      } else {
        toast.error(response.data.error || "Failed to renew campaign");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to renew campaign";
      toast.error(errorMessage);
      console.error("Failed to renew campaign:", error);
    }
  };

  const handleRenewClick = (campaign) => {
    setRenewingCampaign(campaign);
    setNewExpirationDate('');
    setShowRenewModal(true);
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
      case 'running':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M8 5V19L19 12L8 5Z" fill="#10B981" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 7V17" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'draft':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 4H11Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 9V9C20.5523 9 21 8.55228 21 8V7C21 6.44772 20.5523 6 20 6H14C13.4477 6 13 6.44772 13 7V8C13 8.55228 13.4477 9 14 9H20Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 13H7" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 17H7" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 13H11" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7089 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 4L12 14.01L9 11.01" fill="#10B981" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'paused':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" rx="2"/>
            <rect x="14" y="4" width="4" height="16" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" rx="2"/>
          </svg>
        );
      case 'expired':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5"/>
            <path d="M12 6V12L16 14" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2V4" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M22 12H20" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M9 12L11 14L15 10" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#6B7280" strokeWidth="1.5"/>
            <path d="M12 7V12L15 15" fill="#6B7280" stroke="#374151" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
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

            // Update user status to active (in campaign)
            try {
              await axios.post(`${import.meta.env.VITE_API_URL}/influencers/user-status/active`, {
                userId: userId,
                campaignId: campaignId,
              }, { withCredentials: true });
            } catch (statusError) {
              console.error('Failed to update user status to active:', statusError);
            }
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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
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
                      className={`relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 ${
                        selectedUsers.has(user.userId) || selectedUsersForDelete.has(user.userId)
                          ? "border-2 border-purple-500 bg-purple-50/30 shadow-purple-100"
                          : "hover:border-gray-300"
                      }`}
                    >
                      {/* Delete Icon - Top Right Corner */}
                      {!isSelectionMode && !isDeleteMode && (
                        <button
                          onClick={() => handleDelete(user.userId, user.name)}
                          disabled={deletingUserId === user.userId}
                          className="absolute top-3 right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                          title="Delete user"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}

                      <div className="p-6">
                        {/* Header with Avatar and Name */}
                        <div className="flex items-center space-x-4 mb-4">
                          {(isSelectionMode || isDeleteMode) && (
                            <input
                              type="checkbox"
                              checked={isSelectionMode ? selectedUsers.has(user.userId) : selectedUsersForDelete.has(user.userId)}
                              onChange={() => isSelectionMode ? handleUserSelect(user.userId) : handleUserSelectForDelete(user.userId)}
                              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                          )}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            selectedUsers.has(user.userId) || selectedUsersForDelete.has(user.userId) ? 'bg-purple-200' : 'bg-purple-100'
                          }`}>
                            <span className="text-purple-600 font-bold text-lg">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                              {user.name || "Unknown"}
                            </h3>
                            {usersInCampaigns.has(user.userId) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">User ID</span>
                            <span className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                              {user.userId}
                            </span>
                          </div>

                          {user.chatId && user.chatId !== user.userId && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Chat ID</span>
                              <span className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                                {user.chatId}
                              </span>
                            </div>
                          )}

                          {user.providerMessagingId && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Messaging ID</span>
                              <span className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded truncate max-w-[120px]">
                                {user.providerMessagingId}
                              </span>
                            </div>
                          )}

                          {user.createdAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Onboarded</span>
                              <span className="text-sm text-gray-900">
                                {formatDate(user.createdAt)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Campaigns Tags */}
                        {usersInCampaigns.has(user.userId) && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex flex-wrap gap-1">
                              {usersInCampaigns.get(user.userId).map((campaignName, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  {campaignName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Delete Progress */}
                        {isDeleteMode && deleteProgress[user.userId] && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center space-x-2">
                              {deleteProgress[user.userId].status === "pending" && (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                  <span className="text-sm text-gray-600">Deleting...</span>
                                </>
                              )}
                              {deleteProgress[user.userId].status === "success" && (
                                <>
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-sm text-green-600">Deleted successfully</span>
                                </>
                              )}
                              {deleteProgress[user.userId].status === "error" && (
                                <>
                                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span className="text-sm text-red-600">{deleteProgress[user.userId].message}</span>
                                </>
                              )}
                            </div>
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
              <button
                onClick={fetchCampaigns}
                disabled={loadingCampaigns}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh campaigns"
              >
                <svg className={`w-4 h-4 mr-2 ${loadingCampaigns ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
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
                      className="relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-gray-300"
                    >
                      {/* Delete Icon - Top Right Corner */}
                      <button
                        onClick={() => handleDeleteCampaign(campaign._id, campaign.name)}
                        className="absolute top-3 right-3 p-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-full transition-colors z-10"
                        title="Delete campaign"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

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
                                {campaign.userCount || 0} users
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
                                          {user?.name || userId}
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

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2">
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
                              className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              disabled={sendingCampaigns.has(campaign._id)}
                            >
                              {sendingCampaigns.has(campaign._id) ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Sending...</span>
                                </div>
                              ) : (
                                'Send Message'
                              )}
                            </button>
                          )}

                          {campaign.status === 'running' && !sendingCampaigns.has(campaign._id) && (
                            <div className="flex space-x-2">
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
                                  className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Send Again
                                </button>
                              )}
                            </div>
                          )}

                          {campaign.status === 'running' && sendingCampaigns.has(campaign._id) && (
                            <button
                              className="w-full px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg cursor-not-allowed"
                              disabled
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Sending...</span>
                              </div>
                            </button>
                          )}

                          {campaign.status === 'paused' && (
                            <button
                              onClick={() => handleUpdateCampaignStatus(campaign._id, 'running')}
                              className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              disabled={sendingCampaigns.has(campaign._id)}
                            >
                              {sendingCampaigns.has(campaign._id) ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Sending...</span>
                                </div>
                              ) : (
                                'Send Message'
                              )}
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
                              className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              disabled={sendingCampaigns.has(campaign._id)}
                            >
                              {sendingCampaigns.has(campaign._id) ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Sending...</span>
                                </div>
                              ) : (
                                'Send Again'
                              )}
                            </button>
                          )}

                          {campaign.status === 'expired' && (
                            <button
                              onClick={() => handleRenewClick(campaign)}
                              className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              Renew Campaign
                            </button>
                          )}
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
              className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
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

                {/* Add Users Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Users to Campaign
                  </label>
                  <div className="space-y-3">
                    {/* User Selection Dropdown */}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleUserSelect(e.target.value);
                          e.target.value = ""; // Reset dropdown
                        }
                      }}
                      className="input-field"
                    >
                      <option value="">Select a user to add...</option>
                      {onboardedUsers
                        .filter(user => !selectedUsers.has(user.userId))
                        .map((user) => {
                          const userCampaigns = usersInCampaigns.get(user.userId) || [];
                          return (
                            <option key={user.userId} value={user.userId}>
                              {user.name || user.userId} {userCampaigns.length > 0 ? `(In ${userCampaigns.length} campaigns)` : ''}
                            </option>
                          );
                        })}
                    </select>

                    {/* Available Users Count */}
                    <div className="text-sm text-gray-600">
                      {onboardedUsers.filter(user => !selectedUsers.has(user.userId)).length} users available to add
                    </div>
                  </div>
                </div>

                {/* Selected Users Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Selected Users ({selectedUsers.size})
                    </label>
                    {selectedUsers.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedUsers(new Set())}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
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

        {/* Renew Campaign Modal */}
        {showRenewModal && renewingCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Renew Campaign</h2>
              <p className="text-gray-600 mb-4">
                Renew "{renewingCampaign.name}" by setting a new expiration date. The campaign will be reset to draft status.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleRenewCampaign(renewingCampaign._id);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Expiration Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={newExpirationDate}
                    onChange={(e) => setNewExpirationDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select when the renewed campaign should expire
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRenewModal(false);
                      setRenewingCampaign(null);
                      setNewExpirationDate('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={!newExpirationDate}
                  >
                    Renew Campaign
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

export default Onboard;

