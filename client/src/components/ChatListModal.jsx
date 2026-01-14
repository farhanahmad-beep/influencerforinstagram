import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const ChatListModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Fetch linked accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLinkedAccounts();
    }
  }, [isOpen]);

  // Fetch chats when account is selected
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

  const fetchChats = async () => {
    if (!selectedAccountId) return;

    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/chats`, {
        params: {
          account_id: selectedAccountId,
          limit: 20, // Show more chats in modal
        },
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

        setChats(enrichedChats);
      } else {
        toast.error(response.data.error || "Failed to fetch chats");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to fetch chats";
      toast.error(errorMessage);
      console.error("Failed to fetch chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (chatId, chatName) => {
    navigate(`/chat-messages/${chatId}`, {
      state: { chatName, accountId: selectedAccountId },
    });
    onClose(); // Close modal after navigation
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-secondary-900">Chat List</h2>
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 focus-ring"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-secondary-600 mb-6">
            View your Instagram chats and start conversations
          </p>

          {/* Account Selection */}
          <div className="mb-6">
            <label className="form-label">
              Select Account
            </label>
            {loadingAccounts ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                <span className="text-sm text-secondary-500">Loading accounts...</span>
              </div>
            ) : linkedAccounts.length > 0 ? (
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setChats([]);
                }}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
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

          {/* Chat List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-secondary-400 mb-4">
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
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-secondary-600">
                  Showing <span className="font-semibold">{chats.length}</span> chat{chats.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-3">
                {chats.map((chat, index) => (
                  <div
                    key={chat.id || index}
                    className="border border-secondary-200 rounded-lg p-4 hover-lift cursor-pointer"
                    onClick={() => handleChatClick(chat.id, chat.name)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {chat.profilePictureData || chat.profilePicture ? (
                          <img
                            src={chat.profilePictureData || chat.profilePicture}
                            alt={chat.name}
                            className="w-12 h-12 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                        className={`w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center ${
                          (chat.profilePictureData || chat.profilePicture) ? 'hidden' : 'flex'
                        }`}
                        >
                          <span className="text-white font-bold text-lg">
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
                            <span className="text-yellow-500" title="Pinned">
                              📌
                            </span>
                          )}
                          {chat.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>

                        {chat.username && (
                          <p className="text-sm text-secondary-500 truncate">
                            @{chat.username}
                          </p>
                        )}
                        {(chat.userFollowersCount || chat.userFollowingCount) && (
                          <p className="text-xs text-secondary-400">
                            {chat.userFollowersCount && `${chat.userFollowersCount.toLocaleString()} followers`}
                            {chat.userFollowersCount && chat.userFollowingCount && ' • '}
                            {chat.userFollowingCount && `${chat.userFollowingCount.toLocaleString()} following`}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-secondary-500">
                              {formatDate(chat.timestamp)}
                            </span>
                            <span className="text-xs text-black font-medium">
                              Instagram
                            </span>
                          </div>
                          {chat.unreadCount > 0 && (
                            <span className="text-red-600 font-semibold text-xs">
                              {chat.unreadCount} new message{chat.unreadCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {chat.archived === 1 && (
                          <span className="text-secondary-400 text-sm" title="Archived">
                            📦
                          </span>
                        )}
                        {chat.mutedUntil !== -1 && (
                          <span className="text-secondary-400 text-sm" title="Muted">
                            🔇
                          </span>
                        )}
                        {chat.readOnly === 1 && (
                          <span className="text-secondary-400 text-sm" title="Read Only">
                            👁️
                          </span>
                        )}
                        <svg className="w-5 h-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-secondary-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="btn-secondary"
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

export default ChatListModal;
