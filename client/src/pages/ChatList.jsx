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
  const [pagination, setPagination] = useState({
    cursor: null,
    hasMore: false,
    count: 0,
    limit: 10,
  });
  const [chatPreviews, setChatPreviews] = useState(new Map()); // chatId -> last message preview
  const [loadingPreviews, setLoadingPreviews] = useState(new Set()); // Track loading state for previews
  const [searchQuery, setSearchQuery] = useState(''); // Search query for filtering chats

  // Calculate total unread messages
  const totalUnreadMessages = chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);

  // Filter chats based on search query (name and ID)
  const filteredChats = chats.filter((chat) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const name = (chat.name || '').toLowerCase();
    const id = (chat.id || '').toLowerCase();
    const username = (chat.username || '').toLowerCase();

    return name.includes(query) || id.includes(query) || username.includes(query);
  });

  // Helper function to get message text from message object, checking attachments if main text is empty
  const getMessageText = (message) => {
    // Get text content - first check main text, then check attachments
    let text = message.text;

    // If no main text, check attachments for text content
    if (!text && message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.link && attachment.link.text) {
          text = attachment.link.text;
          break; // Use the first attachment with text
        }
      }
    }

    return text || 'No message content';
  };

  const handleChatClick = (chatId, chatName, e) => {
    // Prevent navigation if clicking on checkbox or in selection mode
    if (e?.target?.type === 'checkbox' || isSelectionMode) {
      return;
    }

    // Find the enriched chat data to pass more information
    const chatData = chats.find(chat => chat.id === chatId);

    navigate(`/chat-messages/${chatId}`, {
      state: {
        chatName,
        accountId: selectedAccountId,
        chatData: chatData, // Pass the full enriched chat data
        attendeeProviderId: chatData?.attendeeProviderId,
        providerId: chatData?.providerId,
        userStatus: chatData?.userStatus,
        username: chatData?.username,
        profilePicture: chatData?.profilePicture,
        profilePictureData: chatData?.profilePictureData,
        userFollowersCount: chatData?.userFollowersCount,
        userFollowingCount: chatData?.userFollowingCount,
      },
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
    if (selectedChats.size === filteredChats.length) {
      setSelectedChats(new Set());
    } else {
      setSelectedChats(new Set(filteredChats.map((chat) => chat.id)));
    }
  };

  const handleSendMessageClick = () => {
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


  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchChats();
    }
  }, [selectedAccountId]);


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

        // Enrich chats with profile picture data for contacted users
        const enrichedChats = await Promise.all(
          chatsData.map(async (chat) => {
            try {
              // Try to find user status by attendeeProviderId (preferred) or chat id
              const userResponse = await axios.get(
                `${import.meta.env.VITE_API_URL}/influencers/user-statuses`,
                {
                  params: {
                    search: chat.attendeeProviderId || chat.id,
                    limit: 1,
                  },
                  withCredentials: true,
                }
              );

              if (userResponse.data.success && userResponse.data.data.length > 0) {
                const userStatus = userResponse.data.data[0];
                return {
                  ...chat,
                  profilePicture: userStatus.profilePicture,
                  profilePictureData: userStatus.profilePictureData,
                  userFollowersCount: userStatus.followersCount,
                  userFollowingCount: userStatus.followingCount,
                  userStatus: userStatus.status,
                  username: userStatus.username,
                };
              }
            } catch (userError) {
              // User not found in database, continue without enrichment
              console.debug(`No user status found for chat ${chat.id}`);
            }

            return chat;
          })
        );

        if (cursor) {
          // Append to existing data for pagination
          setChats((prev) => [...prev, ...enrichedChats]);
          // Fetch previews for new chats
          enrichedChats.forEach((chat) => {
            fetchChatPreview(chat.id);
          });
        } else {
          // Replace data for new search
          setChats(enrichedChats);
          // Fetch previews for all chats
          enrichedChats.forEach((chat) => {
            fetchChatPreview(chat.id);
          });
        }

        setPagination({
          cursor: response.data.pagination?.cursor || null,
          hasMore: response.data.pagination?.hasMore || false,
          count: response.data.pagination?.count || enrichedChats.length,
          limit: response.data.pagination?.limit || 10,
        });

        if (enrichedChats.length === 0 && !cursor) {
          toast("No chats found for this account", { duration: 3000 });
        } else if (enrichedChats.length > 0 && !cursor) {
          toast.success(`Found ${enrichedChats.length} chat${enrichedChats.length !== 1 ? 's' : ''}`);
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
    <div className="h-screen bg-secondary-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="content-container section-spacing lg:pt-4 pt-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-secondary-900">Chat List</h1>
                {totalUnreadMessages > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                    {totalUnreadMessages} unread
                  </span>
                )}
              </div>
              <p className="text-secondary-600">
                View all your Instagram chats from your linked accounts
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {chats.length > 0 && (
                <>
                  {isSelectionMode && (
                    <>
                      <button
                        onClick={handleSelectAll}
                        className="btn-secondary text-sm"
                      >
                        {selectedChats.size === filteredChats.length ? "Deselect All" : "Select All"}
                      </button>
                      <button
                        onClick={handleCancelSelection}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleSendMessageClick}
                    className="btn-primary"
                    disabled={!selectedAccountId || chats.length === 0}
                  >
                    Send Message
                    {selectedChats.size > 0 && ` (${selectedChats.size})`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Selection and Search Filter */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Selection */}
            <div className="card">
          <div className="space-y-4">
            <div>
              <label className="form-label">
                Select Account
              </label>
              {loadingAccounts ? (
                <div className="input-field flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  <span className="text-sm text-secondary-500">Loading accounts...</span>
                </div>
              ) : linkedAccounts.length > 0 ? (
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    setChats([]);
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
                      @{account.username}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-secondary-500">
                  No linked accounts found. Please add a linked account first.
                </p>
              )}
            </div>
          </div>
        </div>

            {/* Search Filter */}
            {
                <div className="card">
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">
                        Search Chats
                      </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
              </div>
                      <input
                        type="text"
                        placeholder="Search chats by name, username, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10 pr-4 w-full"
                      />
                      {searchQuery && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-secondary-400 hover:text-secondary-600"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                          </button>
                </div>
                          )}
                        </div>
                    {searchQuery && (
                      <div className="mt-2 text-sm text-secondary-600">
                        Found <span className="font-semibold">{filteredChats.length}</span> of <span className="font-semibold">{chats.length}</span> chats
                          </div>
                        )}
                      </div>
                                </div>
                              </div>
            }
                              </div>
                        </div>

        {/* Results */}
        {loading && chats.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No Chats Found
            </h3>
            <p className="text-secondary-500">
              {selectedAccountId
                ? "No chats found for the selected account."
                : "Please select an account to view chats."}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-secondary-600">
                Showing <span className="font-semibold">{filteredChats.length}</span> of <span className="font-semibold">{chats.length}</span> chat{chats.length !== 1 ? 's' : ''}
                {pagination.hasMore && " (more available)"}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {filteredChats.map((chat, index) => (
                <motion.div
                  key={chat.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card hover-lift ${
                    isSelectionMode ? "cursor-default" : "cursor-pointer"
                  } ${
                    selectedChats.has(chat.id)
                      ? "border-2 border-primary-500 bg-primary-50"
                      : chat.unreadCount > 0
                      ? "border-l-4 border-l-error-500 bg-error-50/30"
                      : ""
                  }`}
                  onClick={(e) => handleChatClick(chat.id, chat.name, e)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedChats.has(chat.id)}
                          onChange={() => handleChatSelect(chat.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 cursor-pointer"
                        />
                      )}
                      <div className="relative">
                        {(chat.profilePictureData || chat.profilePicture) ? (
                          <img
                            src={chat.profilePictureData || chat.profilePicture}
                            alt={chat.name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 ${
                            (chat.profilePictureData || chat.profilePicture) ? 'hidden' : 'flex'
                          }`}
                        >
                          <span className="text-primary-600 font-bold text-lg">
                            {chat.name?.charAt(0)?.toUpperCase() || "C"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-base font-semibold text-secondary-900 truncate">
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
                        {chat.username && (
                          <p className="text-sm text-secondary-500 truncate">
                            @{chat.username}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-secondary-500">
                          <span>ID: {chat.id}</span>
                          {chat.providerId && (
                            <span>Provider ID: {chat.providerId}</span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {loadingPreviews.has(chat.id) ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                                <span className="text-xs text-secondary-400">Loading preview...</span>
                              </div>
                            ) : chatPreviews.has(chat.id) && chatPreviews.get(chat.id) ? (
                              <p className="text-sm text-secondary-600 truncate">
                                {chatPreviews.get(chat.id).isFromMe ? 'You: ' : ''}
                                {getMessageText(chatPreviews.get(chat.id))}
                              </p>
                            ) : (
                              <p className="text-sm text-secondary-400 italic">
                                Click to start conversation
                              </p>
                            )}
                          </div>
                          {chat.unreadCount > 0 && (
                            <span className="text-error-600 font-semibold text-xs ml-2 flex-shrink-0">
                              {chat.unreadCount} new
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-4">
                      {/* Status indicator - colored badges */}
                      <div className={`badge mb-2 ${
                        chat.userStatus === 'onboarded'
                          ? 'bg-success-100 text-success-800 border border-success-200 rounded-full px-2 py-1 text-xs font-medium'
                          : chat.userStatus === 'offboarded'
                          ? 'badge-error'
                          : chat.userStatus === 'not_interested'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}>
                        {chat.userStatus === 'onboarded'
                          ? 'Onboarded'
                          : chat.userStatus === 'offboarded'
                          ? 'Offboarded'
                          : chat.userStatus === 'not_interested'
                          ? 'Not Interested'
                          : 'Contacted'}
                        </div>
                      <span className="text-xs text-secondary-500">
                        {formatDate(chat.timestamp)}
                      </span>
                      <div className="flex items-center space-x-2">
                        {chat.archived === 1 && (
                          <span className="text-xs text-secondary-400" title="Archived">
                            📦
                          </span>
                        )}
                        {chat.mutedUntil !== -1 && (
                          <span className="text-xs text-secondary-400" title="Muted">
                            🔇
                          </span>
                        )}
                        {chat.readOnly === 1 && (
                          <span className="text-xs text-secondary-400" title="Read Only">
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
            {pagination.hasMore && !searchQuery.trim() && (
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

