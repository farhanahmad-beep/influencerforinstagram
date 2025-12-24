import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const ChatList = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedChats, setSelectedChats] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessages, setSendingMessages] = useState(false);
  const [sendProgress, setSendProgress] = useState({});
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [selectedForOnboarding, setSelectedForOnboarding] = useState(new Set());
  const [onboardingProgress, setOnboardingProgress] = useState({});
  const [isOnboardingMultiple, setIsOnboardingMultiple] = useState(false);
  const [pagination, setPagination] = useState({
    cursor: null,
    hasMore: false,
    count: 0,
    limit: 10,
  });
  const [showCampaignMessages, setShowCampaignMessages] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [onboardedUsers, setOnboardedUsers] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignMessages, setCampaignMessages] = useState(new Map()); // campaignId -> array of messages
  const [chatPreviews, setChatPreviews] = useState(new Map()); // chatId -> last message preview
  const [loadingPreviews, setLoadingPreviews] = useState(new Set()); // Track loading state for previews

  // Calculate total unread messages
  const totalUnreadMessages = chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);

  const handleChatClick = (chatId, chatName, e) => {
    // Prevent navigation if clicking on checkbox or in selection mode
    if (e?.target?.type === 'checkbox' || isSelectionMode || isOnboardingMode) {
      return;
    }
    navigate(`/chat-messages/${chatId}`, {
      state: { chatName, accountId: selectedAccountId },
    });
  };

  const fetchChatPreview = async (chatId) => {
    if (!selectedAccountId) return;

    setLoadingPreviews(prev => new Set(prev).add(chatId));

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/chats/${chatId}/messages`,
        {
          params: {
            account_id: selectedAccountId,
            limit: 1, // Just get the last message for preview
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const messages = response.data.data || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        setChatPreviews(prev => new Map(prev).set(chatId, lastMessage));
      }
    } catch (error) {
      console.error(`Failed to fetch preview for chat ${chatId}:`, error);
      // Set null to prevent repeated fetches
      setChatPreviews(prev => new Map(prev).set(chatId, null));
    } finally {
      setLoadingPreviews(prev => {
        const newSet = new Set(prev);
        newSet.delete(chatId);
        return newSet;
      });
    }
  };

  const handleChatSelect = (chatId) => {
    setSelectedChats((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedChats.size === chats.length) {
      setSelectedChats(new Set());
    } else {
      setSelectedChats(new Set(chats.map((chat) => chat.id)));
    }
  };

  const handleSendMessageClick = () => {
    if (isOnboardingMode) {
      toast.error("Exit onboarding mode first");
      return;
    }
    if (selectedChats.size === 0) {
      // Enable selection mode if no chats are selected
      setIsSelectionMode(true);
      toast("Select chats to send message to", { duration: 3000 });
    } else {
      // Open modal if chats are selected
      setShowSendModal(true);
    }
  };

  const handleSendToMultiple = async (e) => {
    e.preventDefault();

    if (!selectedAccountId) {
      toast.error("Account ID is required to send message");
      return;
    }

    if (selectedChats.size === 0) {
      toast.error("Please select at least one chat");
      return;
    }

    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSendingMessages(true);
    const chatIds = Array.from(selectedChats);
    const progress = {};
    chatIds.forEach((id) => {
      progress[id] = { status: "pending", message: "" };
    });
    setSendProgress(progress);

    let successCount = 0;
    let failCount = 0;

    // Send messages sequentially to avoid overwhelming the API
    for (const chatId of chatIds) {
      try {
        
        const formData = new URLSearchParams();
        formData.append("account_id", selectedAccountId);
        formData.append("text", messageText.trim());

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/influencers/chats/${chatId}/messages`,
          formData.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            withCredentials: true,
          }
        );

        if (response.data.success) {
          successCount++;
          setSendProgress((prev) => ({
            ...prev,
            [chatId]: { status: "success", message: "Sent successfully" },
          }));
        } else {
          failCount++;
          setSendProgress((prev) => ({
            ...prev,
            [chatId]: {
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
          [chatId]: { status: "error", message: errorMessage },
        }));
      }

      // Small delay between messages to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setSendingMessages(false);

    if (successCount > 0) {
      toast.success(
        `Message sent to ${successCount} chat${successCount !== 1 ? "s" : ""}`
      );
    }
    if (failCount > 0) {
      toast.error(
        `Failed to send to ${failCount} chat${failCount !== 1 ? "s" : ""}`
      );
    }

    // Reset after a delay to show progress
    setTimeout(() => {
      setShowSendModal(false);
      setMessageText("");
      setSelectedChats(new Set());
      setIsSelectionMode(false);
      setSendProgress({});
    }, 2000);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedChats(new Set());
  };

  const handleOnboard = async (chatId, chatName, providerId, attendeeProviderId) => {
    if (!chatId || !chatName) {
      toast.error("Chat ID and name are required");
      return;
    }

    try {
      const onboardingData = {
        name: chatName,
        userId: attendeeProviderId || chatId, // Use attendeeProviderId as userId if available
        chatId: chatId, // Store the chat ID separately
        providerId: providerId || attendeeProviderId || '',
        providerMessagingId: attendeeProviderId || '',
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/influencers/onboard`,
        onboardingData,
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "User onboarded successfully!");

        // Update user status to onboarded
        try {
          await axios.post(`${import.meta.env.VITE_API_URL}/influencers/user-status/onboarded`, {
            userId: attendeeProviderId || chatId, // Use attendeeProviderId if available, fallback to chatId
            chatName: chatName, // Pass chat name for user matching
          }, { withCredentials: true });
        } catch (statusError) {
          console.error('Failed to update user status:', statusError);
        }
      } else {
        toast.error(response.data.error || "Failed to onboard user");
      }
    } catch (error) {
      // Handle 409 Conflict (user already onboarded)
      if (error.response?.status === 409) {
        toast("User is already onboarded", { duration: 3000 });
      } else {
        const errorMessage = error.response?.data?.error || error.message || "Failed to onboard user";
        toast.error(errorMessage);
      }
      console.error("Failed to onboard user:", error);
    }
  };

  const handleOnboardSelect = (chatId) => {
    setSelectedForOnboarding((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const handleSelectAllForOnboarding = () => {
    if (selectedForOnboarding.size === chats.length) {
      setSelectedForOnboarding(new Set());
    } else {
      setSelectedForOnboarding(new Set(chats.map((chat) => chat.id)));
    }
  };

  const handleOnboardMultipleClick = () => {
    if (isSelectionMode) {
      toast.error("Exit message selection mode first");
      return;
    }
    if (selectedForOnboarding.size === 0) {
      // Enable selection mode if no users are selected
      setIsOnboardingMode(true);
      toast("Select users to onboard", { duration: 3000 });
    } else {
      // Onboard selected users
      handleOnboardMultiple();
    }
  };

  const handleOnboardMultiple = async () => {
    if (selectedForOnboarding.size === 0) {
      toast.error("Please select at least one user");
      return;
    }

    setIsOnboardingMultiple(true);
    const chatIds = Array.from(selectedForOnboarding);
    const progress = {};
    chatIds.forEach((id) => {
      progress[id] = { status: "pending", message: "" };
    });
    setOnboardingProgress(progress);

    let successCount = 0;
    let failCount = 0;

    // Onboard users sequentially to avoid overwhelming the API
    for (const chatId of chatIds) {
      try {
        const chat = chats.find((c) => c.id === chatId);
        if (!chat) continue;

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/influencers/onboard`,
          {
            name: chat.name,
            userId: chat.attendeeProviderId || chat.id,
            chatId: chat.id, // Store the chat ID separately
            providerId: chat.providerId || chat.attendeeProviderId || '',
            providerMessagingId: chat.attendeeProviderId || '',
          },
          {
            withCredentials: true,
          }
        );

        if (response.data.success) {
          successCount++;
          setOnboardingProgress((prev) => ({
            ...prev,
            [chatId]: { status: "success", message: "Onboarded successfully" },
          }));
        } else {
          failCount++;
          setOnboardingProgress((prev) => ({
            ...prev,
            [chatId]: {
              status: "error",
              message: response.data.error || "Failed to onboard",
            },
          }));
        }
      } catch (error) {
        failCount++;
        const errorMessage =
          error.response?.status === 409
            ? "Already onboarded"
            : error.response?.data?.error || error.message || "Failed to onboard";
        setOnboardingProgress((prev) => ({
          ...prev,
          [chatId]: { status: "error", message: errorMessage },
        }));
      }

      // Small delay between onboardings to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsOnboardingMultiple(false);

    if (successCount > 0) {
      toast.success(
        `Onboarded ${successCount} user${successCount !== 1 ? "s" : ""} successfully`
      );
    }
    if (failCount > 0) {
      toast.error(
        `Failed to onboard ${failCount} user${failCount !== 1 ? "s" : ""}`
      );
    }

    // Reset after a delay to show progress
    setTimeout(() => {
      setSelectedForOnboarding(new Set());
      setIsOnboardingMode(false);
      setOnboardingProgress({});
    }, 2000);
  };

  const handleCancelOnboardingSelection = () => {
    setIsOnboardingMode(false);
    setSelectedForOnboarding(new Set());
  };

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchChats();
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (showCampaignMessages && selectedAccountId) {
      const loadCampaignData = async () => {
        await fetchOnboardedUsers();
        await fetchCampaigns();
      };
      loadCampaignData();
    }
  }, [showCampaignMessages, selectedAccountId]);

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

  const fetchChats = async (cursor = null) => {
    if (!selectedAccountId) {
      toast.error("Please select an account");
      return;
    }

    const setLoadingFlag = cursor ? setLoadingMore : setLoading;
    setLoadingFlag(true);

    try {
      const params = {
        account_id: selectedAccountId,
        limit: 10,
      };
      if (cursor) {
        params.cursor = cursor;
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/chats`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        const chatsData = response.data.data || [];

        if (cursor) {
          // Append to existing data for pagination
          setChats((prev) => [...prev, ...chatsData]);
          // Fetch previews for new chats
          chatsData.forEach((chat) => {
            fetchChatPreview(chat.id);
          });
        } else {
          // Replace data for new search
          setChats(chatsData);
          // Fetch previews for all chats
          chatsData.forEach((chat) => {
            fetchChatPreview(chat.id);
          });
        }

        setPagination({
          cursor: response.data.pagination?.cursor || null,
          hasMore: response.data.pagination?.hasMore || false,
          count: response.data.pagination?.count || chatsData.length,
          limit: response.data.pagination?.limit || 10,
        });

        if (chatsData.length === 0 && !cursor) {
          toast("No chats found for this account", { duration: 3000 });
        } else if (chatsData.length > 0 && !cursor) {
          toast.success(`Found ${chatsData.length} chat${chatsData.length !== 1 ? 's' : ''}`);
        }
      } else {
        toast.error(response.data.error || "Failed to fetch chats");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to fetch chats";
      toast.error(errorMessage);
      console.error("Failed to fetch chats:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    } finally {
      setLoadingFlag(false);
    }
  };

  const loadMore = () => {
    if (pagination.cursor && !loadingMore) {
      fetchChats(pagination.cursor);
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
        const users = response.data.data || [];
        setOnboardedUsers(users);
        return users;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch onboarded users:", error);
      return [];
    }
  };

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
        
        // Get current onboarded users from state
        const currentUsers = onboardedUsers.length > 0 ? onboardedUsers : await fetchOnboardedUsers();
        
        // Fetch messages for each campaign user
        await fetchCampaignMessages(campaignData, currentUsers);
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

  const fetchCampaignMessages = async (campaignsData, usersList) => {
    if (!selectedAccountId) return;

    const messagesMap = new Map();
    const campaignMessage = `✨ Hey! Hope you're doing well!

I wanted to share something super useful for creators — Dynamite Influencer Store just launched! 🚀

It's a platform made specifically for influencers to create their own store, add products, and start selling directly to their audience — all in a few clicks.

You can check it out here

🔗 https://dynamiteinfluencerstore.icod.ai/

If you've ever wanted to launch your own store, earn more, and manage everything in one place, this is the perfect tool for you.

Let me know if you want help getting started! 😊`;

    // Fetch all chats first
    try {
      const chatsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/chats`, {
        params: {
          account_id: selectedAccountId,
          limit: 1000,
        },
        withCredentials: true,
      });

      if (!chatsResponse.data.success) {
        return;
      }

      const allChats = chatsResponse.data.data || [];

      // For each campaign, get users and their messages
      for (const campaign of campaignsData) {
        if (campaign.status !== 'running' && campaign.status !== 'completed') continue;

        const campaignUsers = [];
        for (const userId of campaign.userIds) {
          const user = usersList.find(u => u.userId === userId);
          if (!user || !user.providerMessagingId) continue;

          // Find chat for this user
          const chat = allChats.find(c =>
            c.attendeeProviderId === user.providerMessagingId ||
            c.providerId === user.providerMessagingId
          );

          if (chat) {
            // Fetch messages for this chat
            try {
              const messagesResponse = await axios.get(
                `${import.meta.env.VITE_API_URL}/influencers/chats/${chat.id}/messages`,
                {
                  params: {
                    account_id: selectedAccountId,
                    limit: 50,
                  },
                  withCredentials: true,
                }
              );

              if (messagesResponse.data.success) {
                const messages = messagesResponse.data.data || [];
                // Find campaign message in the messages
                const campaignMsg = messages.find(msg =>
                  msg.text && msg.text.includes('Dynamite Influencer Store')
                );

                campaignUsers.push({
                  userId: user.userId,
                  name: user.name || chat.name,
                  chatId: chat.id,
                  chatName: chat.name,
                  messagingId: user.providerMessagingId,
                  message: campaignMsg || {
                    text: campaignMessage,
                    timestamp: campaign.createdAt || new Date().toISOString(),
                    sent: true,
                  },
                  lastMessageTime: campaignMsg?.timestamp || campaign.createdAt,
                });
              }
            } catch (error) {
              console.error(`Failed to fetch messages for chat ${chat.id}:`, error);
              // Still add user with campaign message even if we can't fetch messages
              campaignUsers.push({
                userId: user.userId,
                name: user.name || chat.name,
                chatId: chat.id,
                chatName: chat.name,
                messagingId: user.providerMessagingId,
                message: {
                  text: campaignMessage,
                  timestamp: campaign.createdAt || new Date().toISOString(),
                  sent: true,
                },
                lastMessageTime: campaign.createdAt,
              });
            }
          }
        }

        if (campaignUsers.length > 0) {
          messagesMap.set(campaign._id, {
            campaign,
            users: campaignUsers,
          });
        }
      }

      setCampaignMessages(messagesMap);
    } catch (error) {
      console.error("Failed to fetch campaign messages:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Chat List</h1>
                {!showCampaignMessages && totalUnreadMessages > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                    {totalUnreadMessages} unread
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                {showCampaignMessages
                  ? "View campaign messages grouped by campaign"
                  : "View all your Instagram chats from your linked accounts"}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const newValue = !showCampaignMessages;
                  setShowCampaignMessages(newValue);
                  if (newValue) {
                    // Switching to campaign messages - clear selection modes
                    setIsSelectionMode(false);
                    setIsOnboardingMode(false);
                    setSelectedChats(new Set());
                    setSelectedForOnboarding(new Set());
                  } else {
                    // Switching back to regular chats - clear campaign data
                    setCampaignMessages(new Map());
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showCampaignMessages
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                disabled={!selectedAccountId}
              >
                {showCampaignMessages ? "All Chats" : "Campaign Messages"}
              </button>
              {!showCampaignMessages && chats.length > 0 && (
                <>
                  {isSelectionMode && (
                    <>
                      <button
                        onClick={handleSelectAll}
                        className="btn-secondary text-sm"
                      >
                        {selectedChats.size === chats.length ? "Deselect All" : "Select All"}
                      </button>
                      <button
                        onClick={handleCancelSelection}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <span className="text-sm text-gray-600">
                        {selectedChats.size} selected
                      </span>
                    </>
                  )}
                  {isOnboardingMode && (
                    <>
                      <button
                        onClick={handleSelectAllForOnboarding}
                        className="btn-secondary text-sm"
                      >
                        {selectedForOnboarding.size === chats.length ? "Deselect All" : "Select All"}
                      </button>
                      <button
                        onClick={handleCancelOnboardingSelection}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <span className="text-sm text-gray-600">
                        {selectedForOnboarding.size} selected
                      </span>
                    </>
                  )}
                  <button
                    onClick={handleOnboardMultipleClick}
                    className="btn-primary"
                    disabled={!selectedAccountId || chats.length === 0 || isSelectionMode}
                  >
                    Onboard Multiple
                    {selectedForOnboarding.size > 0 && ` (${selectedForOnboarding.size})`}
                  </button>
                  <button
                    onClick={handleSendMessageClick}
                    className="btn-primary"
                    disabled={!selectedAccountId || chats.length === 0 || isOnboardingMode}
                  >
                    Send Message
                    {selectedChats.size > 0 && ` (${selectedChats.size})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Selection */}
        <div className="card mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Account
              </label>
              {loadingAccounts ? (
                <div className="input-field flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                  <span className="text-sm text-gray-500">Loading accounts...</span>
                </div>
              ) : linkedAccounts.length > 0 ? (
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    setChats([]);
                    setCampaignMessages(new Map());
                    setPagination({
                      cursor: null,
                      hasMore: false,
                      count: 0,
                      limit: 10,
                    });
                  }}
                  className="input-field"
                >
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
          </div>
        </div>

        {/* Results */}
        {showCampaignMessages ? (
          <>
            {loadingCampaigns ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : campaignMessages.size === 0 ? (
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
                  No Campaign Messages
                </h3>
                <p className="text-gray-500">
                  No running or completed campaigns found with messages.
                </p>
              </motion.div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{campaignMessages.size}</span> campaign{campaignMessages.size !== 1 ? 's' : ''} with messages
                  </p>
                </div>

                <div className="space-y-6 mb-6">
                  {Array.from(campaignMessages.values()).map((campaignData, campaignIndex) => (
                    <motion.div
                      key={campaignData.campaign._id || campaignIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: campaignIndex * 0.1 }}
                      className="card"
                    >
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {campaignData.campaign.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {campaignData.users.length} user{campaignData.users.length !== 1 ? 's' : ''} • Status: {campaignData.campaign.status}
                            </p>
                          </div>
                          {campaignData.campaign.description && (
                            <p className="text-sm text-gray-500 max-w-md">
                              {campaignData.campaign.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Campaign Message - Shown Once */}
                        {campaignData.users.length > 0 && campaignData.users[0]?.message && (
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mt-3">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                                Campaign Message
                              </span>
                              <span className="inline-flex items-center text-xs text-green-600">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Sent to {campaignData.users.length} user{campaignData.users.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {campaignData.users[0].message.text || "No message"}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Users List */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Sent to:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {campaignData.users.map((user, userIndex) => (
                            <motion.div
                              key={user.chatId || userIndex}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: (campaignIndex * 0.1) + (userIndex * 0.03) }}
                              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                              onClick={(e) => handleChatClick(user.chatId, user.chatName, e)}
                            >
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-600 font-bold text-sm">
                                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">
                                  {user.name || "Unknown"}
                                </h4>
                                <p className="text-xs text-gray-500 truncate">
                                  {formatDate(user.lastMessageTime)}
                                </p>
                              </div>
                              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : loading && chats.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : chats.length === 0 ? (
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Chats Found
            </h3>
            <p className="text-gray-500">
              {selectedAccountId
                ? "No chats found for the selected account."
                : "Please select an account to view chats."}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{chats.length}</span> chat{chats.length !== 1 ? 's' : ''}
                {pagination.hasMore && " (more available)"}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {chats.map((chat, index) => (
                <motion.div
                  key={chat.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card hover:shadow-lg transition-shadow ${
                    isSelectionMode || isOnboardingMode ? "cursor-default" : "cursor-pointer"
                  } ${
                    selectedChats.has(chat.id) || selectedForOnboarding.has(chat.id)
                      ? "border-2 border-purple-500 bg-purple-50"
                      : chat.unreadCount > 0
                      ? "border-l-4 border-l-red-500 bg-red-50/30"
                      : ""
                  }`}
                  onClick={(e) => handleChatClick(chat.id, chat.name, e)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {(isSelectionMode || isOnboardingMode) && (
                        <input
                          type="checkbox"
                          checked={isSelectionMode ? selectedChats.has(chat.id) : selectedForOnboarding.has(chat.id)}
                          onChange={() => isSelectionMode ? handleChatSelect(chat.id) : handleOnboardSelect(chat.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                        />
                      )}
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 font-bold text-lg">
                          {chat.name?.charAt(0)?.toUpperCase() || "C"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {chat.name || "Unknown"}
                          </h3>
                          {chat.pinned === 1 && (
                            <span className="text-yellow-500 flex-shrink-0" title="Pinned">
                              📌
                            </span>
                          )}
                          {chat.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 animate-pulse shadow-lg border-2 border-white">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>ID: {chat.id}</span>
                          {chat.providerId && (
                            <span>Provider ID: {chat.providerId}</span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {loadingPreviews.has(chat.id) ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                                <span className="text-xs text-gray-400">Loading preview...</span>
                              </div>
                            ) : chatPreviews.has(chat.id) && chatPreviews.get(chat.id) ? (
                              <p className="text-sm text-gray-600 truncate">
                                {chatPreviews.get(chat.id).isFromMe ? 'You: ' : ''}
                                {chatPreviews.get(chat.id).text || 'No message content'}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">
                                Click to start conversation
                              </p>
                            )}
                          </div>
                          {chat.unreadCount > 0 && (
                            <span className="text-red-600 font-semibold text-xs ml-2 flex-shrink-0">
                              {chat.unreadCount} new
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-4">
                      {!isSelectionMode && !isOnboardingMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOnboard(chat.id, chat.name, chat.providerId, chat.attendeeProviderId);
                          }}
                          className="btn-secondary text-xs px-2 py-1 mb-2"
                          title="Onboard this user"
                        >
                          Onboard
                        </button>
                      )}
                      {isOnboardingMode && onboardingProgress[chat.id] && (
                        <div className="text-xs px-2 py-1 mb-2">
                          <span
                            className={`${
                              onboardingProgress[chat.id].status === "success"
                                ? "text-green-600"
                                : onboardingProgress[chat.id].status === "error"
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {onboardingProgress[chat.id].status === "pending" && "⏳ Onboarding..."}
                            {onboardingProgress[chat.id].status === "success" && "✓ Onboarded"}
                            {onboardingProgress[chat.id].status === "error" && `✗ ${onboardingProgress[chat.id].message}`}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(chat.timestamp)}
                      </span>
                      <div className="flex items-center space-x-2">
                        {chat.archived === 1 && (
                          <span className="text-xs text-gray-400" title="Archived">
                            📦
                          </span>
                        )}
                        {chat.mutedUntil !== -1 && (
                          <span className="text-xs text-gray-400" title="Muted">
                            🔇
                          </span>
                        )}
                        {chat.readOnly === 1 && (
                          <span className="text-xs text-gray-400" title="Read Only">
                            👁️
                          </span>
                        )}
                      </div>
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
                  disabled={loadingMore}
                  className="btn-secondary"
                >
                  {loadingMore ? "Loading..." : "Load More Chats"}
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
                Send Message to {selectedChats.size} Chat{selectedChats.size !== 1 ? "s" : ""}
              </h2>

              {/* Selected Chats List */}
              <div className="mb-4 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Chats:</p>
                <div className="space-y-1">
                  {Array.from(selectedChats).map((chatId) => {
                    const chat = chats.find((c) => c.id === chatId);
                    const progress = sendProgress[chatId];
                    return (
                      <div
                        key={chatId}
                        className="flex items-center justify-between text-sm p-2 bg-white rounded"
                      >
                        <span className="text-gray-700">
                          {chat?.name || chatId}
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
                    disabled={sendingMessages || !selectedAccountId || selectedChats.size === 0}
                  >
                    {sendingMessages
                      ? `Sending... (${Object.values(sendProgress).filter((p) => p.status === "success" || p.status === "error").length}/${selectedChats.size})`
                      : `Send to ${selectedChats.size} Chat${selectedChats.size !== 1 ? "s" : ""}`}
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

export default ChatList;

