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
  const [showSendModal, setShowSendModal] = useState(false);
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
          // Append to existing data for pagination
          setMessages((prev) => [...prev, ...messagesData]);
        } else {
          // Replace data for new fetch
          setMessages(messagesData);
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
        setShowSendModal(false);
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
                className="text-purple-600 hover:text-purple-700 underline break-all"
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/chat-list")}
            className="btn-secondary mb-4"
          >
            ← Back to Chat List
          </button>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{chatName}</h1>
              <p className="text-gray-600">Chat ID: {chatId}</p>
            </div>
            <button
              onClick={() => setShowSendModal(true)}
              className="btn-primary"
              disabled={!accountId}
            >
              Send Message
            </button>
          </div>
          {!accountId && (
            <p className="text-sm text-red-600 mt-2">
              Account ID is required to send messages
            </p>
          )}
        </div>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center py-12">
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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{messages.length}</span> message{messages.length !== 1 ? 's' : ''}
                {pagination.hasMore && " (more available)"}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`card ${message.isSender === 1 ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.isSender === 1 ? 'bg-purple-600' : 'bg-gray-300'
                    }`}>
                      <span className={`font-bold text-sm ${
                        message.isSender === 1 ? 'text-white' : 'text-gray-700'
                      }`}>
                        {message.isSender === 1 ? 'You' : chatName?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-semibold ${
                          message.isSender === 1 ? 'text-purple-700' : 'text-gray-700'
                        }`}>
                          {message.isSender === 1 ? 'You' : chatName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.timestamp)}
                        </span>
                        {message.seen === 1 && message.isSender === 1 && (
                          <span className="text-blue-500 text-xs" title="Seen">
                            ✓✓
                          </span>
                        )}
                        {message.delivered === 1 && message.seen === 0 && message.isSender === 1 && (
                          <span className="text-gray-400 text-xs" title="Delivered">
                            ✓
                          </span>
                        )}
                        {message.edited === 1 && (
                          <span className="text-xs text-gray-400 italic">(edited)</span>
                        )}
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap break-words">
                        {renderMessageWithLinks(message.text)}
                      </p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="mt-2 flex items-center space-x-1">
                          {message.reactions.map((reaction, idx) => (
                            <span key={idx} className="text-sm">
                              {reaction}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-400 space-x-2">
                        {message.id && <span>ID: {message.id}</span>}
                        {message.senderId && <span>• Sender: {message.senderId}</span>}
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
                  {loadingMore ? "Loading..." : "Load More Messages"}
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
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Send Message</h2>
              <form onSubmit={handleSendMessage} className="space-y-4">
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
                    disabled={sendingMessage}
                  />
                </div>
                {!accountId && (
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
                    }}
                    className="btn-secondary flex-1"
                    disabled={sendingMessage}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={sendingMessage || !accountId}
                  >
                    {sendingMessage ? "Sending..." : "Send"}
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

export default ChatMessages;

