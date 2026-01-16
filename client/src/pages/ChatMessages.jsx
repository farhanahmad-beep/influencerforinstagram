import React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const ChatMessages = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const chatName = location.state?.chatName || "Chat";
  const accountId = location.state?.accountId || "";
  const attendeeProviderId = location.state?.attendeeProviderId;
  const providerId = location.state?.providerId;
  const userId = location.state?.userId; // Add userId from navigation state
  const chatData = location.state?.chatData;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [pagination, setPagination] = useState({
    cursor: null,
    hasMore: false,
    count: 0,
    limit: 10,
  });
  const [isVerificationCompleted, setIsVerificationCompleted] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [offboardingStatus, setOffboardingStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [notInterestedStatus, setNotInterestedStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [reconsiderStatus, setReconsiderStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [isOffboarded, setIsOffboarded] = useState(false); // Track if user is offboarded
  const [isRegistered, setIsRegistered] = useState(false); // Track if user is registered (read-only status)

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      checkUserStatus();
    } else {
      toast.error("Chat ID is required");
      navigate("/chat-list");
    }
  }, [chatId]);

  // Re-check user status when window gains focus or becomes visible (user comes back to this chat)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && chatId) {
        checkUserStatus();
      }
    };

    const handleFocus = () => {
      if (chatId) {
        checkUserStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [chatId]);

  const fetchMessages = async (cursor = null) => {
    if (!chatId) return;

    const setLoadingFlag = cursor ? setLoadingMore : setLoading;
    setLoadingFlag(true);

    try {
      const params = {
        limit: 10,
      };
      if (cursor) {
        params.cursor = cursor;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/chats/${chatId}/messages`,
        {
          params,
          withCredentials: true,
        }
      );

      if (response.data.success) {
        const messagesData = response.data.data || [];

        if (cursor) {
          // Append to existing data for pagination (newer messages)
          setMessages((prev) => [...messagesData, ...prev]);
        } else {
          // Replace data for new fetch and reverse to show chronological order
          setMessages(messagesData.reverse());
        }

        setPagination({
          cursor: response.data.pagination?.cursor || null,
          hasMore: response.data.pagination?.hasMore || false,
          count: response.data.pagination?.count || messagesData.length,
          limit: response.data.pagination?.limit || 10,
        });

        if (messagesData.length === 0 && !cursor) {
          toast("No messages found in this chat", { duration: 3000 });
        }
      } else {
        toast.error(response.data.error || "Failed to fetch messages");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch messages";
      toast.error(errorMessage);
      console.error("Failed to fetch messages:", {
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
      fetchMessages(pagination.cursor);
    }
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!accountId) {
      toast.error("Account ID is required to send message");
      return;
    }

    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSendingMessage(true);
    try {
      const formData = new URLSearchParams();
      formData.append('account_id', accountId);
      formData.append('text', messageText.trim());

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/influencers/chats/${chatId}/messages`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("Message sent successfully!");
        setMessageText("");
        // Refresh messages to show the new one
        fetchMessages();
      } else {
        toast.error(response.data.error || "Failed to send message");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to send message";
      toast.error(errorMessage);
      console.error("Failed to send message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const [userStatusData, setUserStatusData] = useState(null);

  const checkUserStatus = async () => {
    // Try multiple possible IDs to find user status
    const searchIds = [
      userId,             // First priority - direct user ID if available
      attendeeProviderId, // Second priority - attendee provider ID
      providerId,         // Third priority - provider ID
      chatId              // Fallback - chat ID
    ].filter(Boolean); // Remove undefined/null values

    for (const searchId of searchIds) {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/influencers/user-statuses`,
          {
            params: {
              search: searchId,
              limit: 1,
            },
            withCredentials: true,
          }
        );

        if (response.data.success && response.data.data.length > 0) {
          const userStatus = response.data.data[0];
          setUserStatusData(userStatus); // Store the found user data

          if (userStatus.status === 'onboarded' || userStatus.status === 'active') {
            setIsVerificationCompleted(true);
            setOnboardingStatus('success');
            setOffboardingStatus('idle');
            setNotInterestedStatus('idle');
            setIsOffboarded(false);
            setIsRegistered(false);
          } else if (userStatus.status === 'registered') {
            // Registered users: show Registered and disable actions
            setIsVerificationCompleted(false);
            setOnboardingStatus('idle');
            setOffboardingStatus('idle');
            setNotInterestedStatus('idle');
            setIsOffboarded(false);
            setIsRegistered(true);
          } else if (userStatus.status === 'offboarded') {
            // Offboarded users can be re-onboarded
            setIsVerificationCompleted(false);
            setOnboardingStatus('idle');
            setOffboardingStatus('idle');
            setNotInterestedStatus('idle');
            setIsOffboarded(true);
            setIsRegistered(false);
          } else if (userStatus.status === 'not_interested') {
            // Not interested users stay marked as such
            setIsVerificationCompleted(false);
            setOnboardingStatus('idle');
            setOffboardingStatus('idle');
            setNotInterestedStatus('success');
            setIsOffboarded(false);
            setIsRegistered(false);
          } else {
            // Default to contacted state for any other status
            setIsVerificationCompleted(false);
            setOnboardingStatus('idle');
            setOffboardingStatus('idle');
            setNotInterestedStatus('idle');
            setIsOffboarded(false);
            setIsRegistered(false);
          }
          return; // Found user status, exit the loop
        }
      } catch (error) {
        console.debug(`Error checking user status for ID ${searchId}:`, error);
        // Continue to next ID
      }
    }

    // No user status found with any ID - treat as contacted (not onboarded)
    console.debug(`No user status found for chat ${chatId} with any ID`);
    setUserStatusData(null);
    setIsVerificationCompleted(false);
    setOnboardingStatus('idle');
    setOffboardingStatus('idle');
    setNotInterestedStatus('idle');
    setIsRegistered(false);
  };

  const handleOnboard = async () => {
    if (!isVerificationCompleted) {
      toast.error("Please complete verification first");
      return;
    }

    setOnboardingStatus('loading');

    try {
      const onboardingData = {
        name: userStatusData?.name || chatName,
        userId: userStatusData?.userId || chatId,
        chatId: chatId,
        providerId: userStatusData?.providerId || chatId,
        providerMessagingId: userStatusData?.providerMessagingId || chatId,
        // Include additional enriched data from user status
        username: userStatusData?.username,
        profilePicture: userStatusData?.profilePicture,
        profilePictureData: userStatusData?.profilePictureData,
        followersCount: userStatusData?.followersCount,
        followingCount: userStatusData?.followingCount,
        source: userStatusData?.source,
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
            userId: userStatusData?.userId || chatId,
            chatName: chatName,
          }, { withCredentials: true });

          // Refresh user status data
          await checkUserStatus();
        } catch (statusError) {
          console.error('Failed to update user status:', statusError);
        }

        setOnboardingStatus('success');
      } else {
        toast.error(response.data.error || "Failed to onboard user");
        setOnboardingStatus('error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to onboard user";
      toast.error(errorMessage);
      setOnboardingStatus('error');
      console.error("Failed to onboard user:", error);
    }
  };

  const handleOffboard = async () => {
    setOffboardingStatus('loading');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/influencers/offboard`,
        { userId: userStatusData?.userId || chatId },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "User offboarded successfully!");

        // Update local state
        setIsVerificationCompleted(false);
        setOnboardingStatus('idle');
        setOffboardingStatus('success');
        setNotInterestedStatus('idle');

        // Refresh user status data
        await checkUserStatus();
      } else {
        toast.error(response.data.error || "Failed to offboard user");
        setOffboardingStatus('error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to offboard user";
      toast.error(errorMessage);
      setOffboardingStatus('error');
      console.error("Failed to offboard user:", error);
    }
  };

  const handleMarkNotInterested = async () => {
    setNotInterestedStatus('loading');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/influencers/mark-not-interested`,
        { userId: userStatusData?.userId || chatId },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "User marked as not interested");

        // Update local state
        setIsVerificationCompleted(false);
        setOnboardingStatus('idle');
        setOffboardingStatus('idle');
        setNotInterestedStatus('success');

        // Refresh user status data
        await checkUserStatus();
      } else {
        toast.error(response.data.error || "Failed to mark user as not interested");
        setNotInterestedStatus('error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to mark user as not interested";
      toast.error(errorMessage);
      setNotInterestedStatus('error');
      console.error("Failed to mark user as not interested:", error);
    }
  };

  const handleReconsider = async () => {
    setReconsiderStatus('loading');

    try {
      // Update user status back to "contacted"
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/influencers/user-status/contacted`,
        {
          userId: userStatusData?.userId || chatId,
          username: userStatusData?.username,
          name: userStatusData?.name,
          profilePicture: userStatusData?.profilePicture,
          profilePictureData: userStatusData?.profilePictureData,
          followersCount: userStatusData?.followersCount,
          followingCount: userStatusData?.followingCount,
          provider: 'INSTAGRAM',
          providerId: userStatusData?.providerId || chatId,
          providerMessagingId: userStatusData?.providerMessagingId,
          source: userStatusData?.source,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("User status updated to contacted");

        // Reset all local states to allow onboarding/offboarding/not interested again
        setIsVerificationCompleted(false);
        setOnboardingStatus('idle');
        setOffboardingStatus('idle');
        setNotInterestedStatus('idle');
        setReconsiderStatus('success');
        setIsOffboarded(false);

        // Refresh user status data
        await checkUserStatus();
      } else {
        toast.error(response.data.error || "Failed to update user status");
        setReconsiderStatus('error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to update user status";
      toast.error(errorMessage);
      setReconsiderStatus('error');
      console.error("Failed to reconsider user:", error);
    } finally {
      // Reset reconsider status after a short delay
      setTimeout(() => setReconsiderStatus('idle'), 2000);
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

      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return timestamp;
    }
  };

  const renderMessageWithLinks = (message) => {
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

    if (!text) return "(No text content)";
    
    // URL regex pattern - matches http, https, and www URLs
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      
      // Add the URL as a link
      let url = match[0];
      // Add https:// if it starts with www.
      if (url.startsWith('www.')) {
        url = 'https://' + url;
      }
      parts.push({ type: 'link', content: match[0], url: url });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last URL
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    // If no URLs found, return the text as is
    if (parts.length === 0) {
      return <span>{text}</span>;
    }
    
    // Render parts with links
    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'link') {
            return (
              <a
                key={index}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-200 underline break-all"
              >
                {part.content}
              </a>
            );
          }
          return <span key={index}>{part.content}</span>;
        })}
      </>
    );
  };

  return (
    <div className="h-screen bg-secondary-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="content-container section-spacing lg:pt-4 pt-16">
        <div className="mb-2">
          <button
            onClick={() => navigate("/chat-list")}
            className="btn-secondary mb-1"
          >
            ← Back to Chat List
          </button>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-3">
              {/* Profile Picture */}
              <div className="relative w-12 h-12 flex-shrink-0">
                {userStatusData?.profilePictureData ? (
                  <img
                    src={userStatusData.profilePictureData}
                    alt={chatName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : userStatusData?.profilePicture ? (
                  <img
                    src={userStatusData.profilePicture}
                    alt={chatName}
                    className="w-12 h-12 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-lg">
                      {chatName?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                {userStatusData?.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

            <div className="flex-1">
                <h1 className="text-2xl font-bold text-secondary-900 mb-1">{chatName}</h1>
              {/* Offboarded User Indicator */}
              {isOffboarded && (
                <div className="flex items-center space-x-2 mt-2">
                    <svg className="w-4 h-4 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                    <span className="text-sm text-error-700 font-medium">This user is currently offboarded</span>
                </div>
              )}
              </div>
            </div>
          </div>
          {!accountId && (
            <p className="text-sm text-error-600 mt-2">
              Account ID is required to send messages
            </p>
          )}
        </div>

        {/* User Status Management */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Status Indicator */}
              <div className="flex items-center space-x-3 mb-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isRegistered
                    ? 'bg-purple-100 text-purple-800'
                    :
                  onboardingStatus === 'success'
                    ? 'bg-success-100 text-success-800'
                    : notInterestedStatus === 'success'
                    ? 'bg-error-100 text-error-800'
                    : isVerificationCompleted
                    ? 'bg-gray-100 text-black'
                    : 'bg-secondary-100 text-secondary-800'
                }`}>
                  {isRegistered ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Registered
                    </>
                  ) : onboardingStatus === 'success' ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Onboarded
                    </>
                  ) : notInterestedStatus === 'success' ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Not Interested
                    </>
                  ) : isVerificationCompleted ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Not Verified
                    </>
                  )}
                </div>
              </div>

              {/* Action Section */}
              <div className="space-y-3">
                {isRegistered && (
                  <div className="text-sm text-secondary-600">
                    {chatName || "User"} is registered on Influencer Store
                  </div>
                )}

                {!isRegistered && (
                  <>
                {onboardingStatus !== 'success' && notInterestedStatus !== 'success' && (
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVerificationCompleted}
                        onChange={(e) => setIsVerificationCompleted(e.target.checked)}
                        className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black"
                      />
                      <span className="text-sm text-secondary-700 font-medium">Mark user as verified</span>
                    </label>

                    {isVerificationCompleted && (
                      <button
                        onClick={handleOnboard}
                        disabled={onboardingStatus === 'loading'}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          onboardingStatus === 'loading'
                            ? 'bg-gray-500 text-white cursor-not-allowed'
                            : 'bg-black text-white hover:bg-gray-800'
                        }`}
                      >
                        {onboardingStatus === 'loading' && (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Onboarding...
                          </span>
                        )}
                        {onboardingStatus !== 'loading' && 'Onboard User'}
                      </button>
                    )}
                  </div>
                )}

                {onboardingStatus === 'success' && (
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      This user has been successfully onboarded.
                    </div>
                    <button
                      onClick={handleOffboard}
                      disabled={offboardingStatus === 'loading'}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        offboardingStatus === 'loading'
                          ? 'bg-secondary-500 text-white cursor-not-allowed'
                          : 'bg-error-600 text-white hover:bg-error-700'
                      }`}
                    >
                      {offboardingStatus === 'loading' && (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Offboarding...
                        </span>
                      )}
                      {offboardingStatus !== 'loading' && 'Offboard User'}
                    </button>
                  </div>
                )}

                {notInterestedStatus === 'success' && (
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      This user has been marked as not interested.
                    </div>
                    <button
                      onClick={handleReconsider}
                      disabled={reconsiderStatus === 'loading'}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        reconsiderStatus === 'loading'
                          ? 'bg-secondary-500 text-white cursor-not-allowed'
                          : 'bg-warning-600 text-white hover:bg-warning-700'
                      }`}
                    >
                      {reconsiderStatus === 'loading' && (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </span>
                      )}
                      {reconsiderStatus !== 'loading' && 'Reconsider'}
                    </button>
                  </div>
                )}

                {/* Quick Actions - Available when not onboarded and not marked as not interested */}
                {onboardingStatus !== 'success' && notInterestedStatus !== 'success' && (
                  <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Quick Actions:</span>
                    <button
                      onClick={handleMarkNotInterested}
                      disabled={notInterestedStatus === 'loading'}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                        notInterestedStatus === 'loading'
                          ? 'bg-secondary-500 text-white cursor-not-allowed'
                          : 'bg-warning-600 text-white hover:bg-warning-700'
                      }`}
                    >
                      {notInterestedStatus === 'loading' && (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Processing...
                        </span>
                      )}
                      {notInterestedStatus !== 'loading' && 'Not Interested'}
                    </button>
                  </div>
                )}
                  </>
                )}
              </div>

              {/* Error Messages */}
              {(onboardingStatus === 'error' || offboardingStatus === 'error' || notInterestedStatus === 'error' || reconsiderStatus === 'error') && (
                <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-error-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-error-600 font-medium">
                      {onboardingStatus === 'error'
                        ? 'Failed to onboard user. Please try again.'
                        : offboardingStatus === 'error'
                        ? 'Failed to offboard user. Please try again.'
                        : notInterestedStatus === 'error'
                        ? 'Failed to mark user as not interested. Please try again.'
                        : 'Failed to reconsider user. Please try again.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : messages.length === 0 ? (
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
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No Messages Found
            </h3>
            <p className="text-secondary-500">This chat has no messages yet.</p>
          </motion.div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-secondary-600">
                Showing <span className="font-semibold">{messages.length}</span> message{messages.length !== 1 ? 's' : ''}
                {pagination.hasMore && " (more available)"}
              </p>
            </div>

            {/* Chat Messages Container */}
            <div className="bg-white rounded-lg border border-gray-200 min-h-[360px] max-h-[450px] overflow-y-auto p-4 mb-2">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id || index}
                    initial={{ opacity: 0, x: message.isSender === 1 ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex ${message.isSender === 1 ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${message.isSender === 1 ? 'order-2' : 'order-1'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-2 rounded-2xl shadow-sm ${
                          message.isSender === 1
                            ? 'bg-black text-white rounded-br-md'
                            : 'bg-secondary-100 text-secondary-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {renderMessageWithLinks(message)}
                        </p>
                      </div>

                      {/* Message Metadata */}
                      <div className={`flex items-center space-x-2 mt-1 text-xs text-secondary-500 ${
                        message.isSender === 1 ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{formatDate(message.timestamp)}</span>
                        {message.isSender === 1 && (
                          <>
                            {message.seen === 1 && (
                              <span className="text-blue-400" title="Seen">
                                ✓✓
                              </span>
                            )}
                            {message.delivered === 1 && message.seen === 0 && (
                              <span className="text-gray-400" title="Delivered">
                                ✓
                              </span>
                            )}
                          </>
                        )}
                        {message.edited === 1 && (
                          <span className="italic">(edited)</span>
                        )}
                      </div>

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className={`mt-1 text-xs text-secondary-500 ${
                          message.isSender === 1 ? 'text-right' : 'text-left'
                        }`}>
                          {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className={`mt-1 flex ${message.isSender === 1 ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex items-center space-x-1 bg-white rounded-full px-2 py-1 shadow-sm border">
                            {message.reactions.map((reaction, idx) => (
                              <span key={idx} className="text-sm">
                                {reaction}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Debug Info (only in development) */}
                      {/* {process.env.NODE_ENV === 'development' && (
                        <div className={`mt-1 text-xs text-gray-400 ${
                          message.isSender === 1 ? 'text-right' : 'text-left'
                        }`}>
                          {message.id && <span>ID: {message.id}</span>}
                          {message.senderId && <span> • Sender: {message.senderId}</span>}
                        </div>
                      )} */}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                    rows="1"
                    disabled={sendingMessage}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 h-10 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  disabled={sendingMessage || !messageText.trim() || !accountId}
                >
                  {sendingMessage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
              {!accountId && (
              <p className="text-sm text-error-600 mt-2">
                  Account ID is required to send messages
                </p>
              )}
            </div>

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="text-center mt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-secondary"
                >
                  {loadingMore ? "Loading..." : "Load More Messages"}
                </button>
              </div>
            )}
          </>
        )}

      </div>
      </div>
    </div>
  );
};

export default ChatMessages;

