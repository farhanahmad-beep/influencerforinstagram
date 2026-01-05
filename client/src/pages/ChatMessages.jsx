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

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    } else {
      toast.error("Chat ID is required");
      navigate("/chat-list");
    }
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

  const renderMessageWithLinks = (text) => {
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
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
        <div className="mb-2">
          <button
            onClick={() => navigate("/chat-list")}
            className="btn-secondary mb-1"
          >
            ← Back to Chat List
          </button>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{chatName}</h1>
              <p className="text-gray-600">Chat ID: {chatId}</p>
            </div>
          </div>
          {!accountId && (
            <p className="text-sm text-red-600 mt-2">
              Account ID is required to send messages
            </p>
          )}
        </div>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Messages Found
            </h3>
            <p className="text-gray-500">This chat has no messages yet.</p>
          </motion.div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{messages.length}</span> message{messages.length !== 1 ? 's' : ''}
                {pagination.hasMore && " (more available)"}
              </p>
            </div>

            {/* Chat Messages Container */}
            <div className="bg-white rounded-lg border border-gray-200 min-h-[400px] max-h-[450px] overflow-y-auto p-4 mb-2">
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
                            ? 'bg-purple-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {renderMessageWithLinks(message.text)}
                        </p>
                      </div>

                      {/* Message Metadata */}
                      <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${
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
                        <div className={`mt-1 text-xs text-gray-500 ${
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
                      {process.env.NODE_ENV === 'development' && (
                        <div className={`mt-1 text-xs text-gray-400 ${
                          message.isSender === 1 ? 'text-right' : 'text-left'
                        }`}>
                          {message.id && <span>ID: {message.id}</span>}
                          {message.senderId && <span> • Sender: {message.senderId}</span>}
                        </div>
                      )}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
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
                  className="px-4 py-2 h-10 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
                <p className="text-sm text-red-600 mt-2">
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

