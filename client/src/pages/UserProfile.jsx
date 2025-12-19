import React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Predefined message template
  const PREDEFINED_MESSAGE = `✨ Hey! Hope you're doing well!

I wanted to share something super useful for creators — Dynamite Influencer Store just launched! 🚀

It's a platform made specifically for influencers to create their own store, add products, and start selling directly to their audience — all in a few clicks.

You can check it out here 

🔗 https://dynamiteinfluencerstore.icod.ai/

If you've ever wanted to launch your own store, earn more, and manage everything in one place, this is the perfect tool for you.

Let me know if you want help getting started! 😊`;

  // Get account_id from location state or query params
  const accountId = location.state?.accountId || new URLSearchParams(location.search).get("account_id");
  const fromPage = location.state?.from || null;

  useEffect(() => {
    if (userId && accountId) {
      fetchUserProfile();
    } else {
      toast.error("Missing required parameters");
      navigate("/followers");
    }
  }, [userId, accountId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/user-profile`, {
        params: {
          identifier: userId,
          account_id: accountId,
        },
        withCredentials: true,
      });

      if (response.data.success && response.data.data) {
        setProfile(response.data.data);
      } else {
        toast.error("Failed to fetch user profile");
        navigate("/followers");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Failed to fetch user profile";
      toast.error(errorMessage);
      console.error("Failed to fetch user profile:", error);
      navigate("/followers");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!accountId) {
      toast.error("Account ID is required to send message");
      return;
    }

    if (!profile?.providerMessagingId) {
      toast.error("User messaging ID not available");
      return;
    }

    if (!messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSendingMessage(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/influencers/start-chat`,
        {
          account_id: accountId,
          text: messageText.trim(),
          attendees_ids: [profile.providerMessagingId],
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Message sent successfully!");
        setMessageText(PREDEFINED_MESSAGE);
        setShowMessageModal(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col justify-center items-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600 mb-4">The user profile you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate("/followers")} className="btn-primary">
            Back to Followers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (fromPage === "global-search") {
                navigate("/global-search?account_id=${accountId}");
              } else {
                navigate(`/followers${accountId ? `?account_id=${accountId}` : ""}`);
              }
            }}
            className="btn-secondary"
          >
            ← Back
          </button>
          {profile.providerMessagingId && (
            <button
              onClick={() => {
                setMessageText(PREDEFINED_MESSAGE);
                setShowMessageModal(true);
              }}
              className="btn-primary"
            >
              Send Message
            </button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="card mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative w-32 h-32">
                {(profile.profilePictureData || profile.profilePictureUrlLarge || profile.profilePictureUrl) ? (
                  <img
                    src={profile.profilePictureData || profile.profilePictureUrlLarge || profile.profilePictureUrl}
                    alt={profile.fullName}
                    referrerPolicy="no-referrer"
                    className="w-32 h-32 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`w-32 h-32 bg-purple-100 rounded-full flex items-center justify-center ${(profile.profilePictureData || profile.profilePictureUrlLarge || profile.profilePictureUrl) ? 'hidden' : 'flex'}`}
                >
                  <span className="text-purple-600 font-bold text-4xl">
                    {profile.fullName?.charAt(0)?.toUpperCase() || profile.publicIdentifier?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.fullName || 'Unknown'}
                  </h1>
                  {profile.isVerified && (
                    <span className="text-blue-500" title="Verified">
                      ✓
                    </span>
                  )}
                  {profile.isPrivate && (
                    <span className="text-gray-400" title="Private Account">
                      🔒
                    </span>
                  )}
                </div>
                {profile.publicIdentifier && (
                  <p className="text-lg text-gray-600 mb-2">@{profile.publicIdentifier}</p>
                )}
                {profile.profileType && (
                  <span className="inline-block px-3 py-1 text-sm font-medium text-purple-600 bg-purple-100 rounded-full">
                    {profile.profileType}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">
                {formatNumber(profile.followersCount || 0)}
              </p>
              <p className="text-gray-600 mt-1">Followers</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">
                {formatNumber(profile.followingCount || 0)}
              </p>
              <p className="text-gray-600 mt-1">Following</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">
                {formatNumber(profile.postsCount || 0)}
              </p>
              <p className="text-gray-600 mt-1">Posts</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">
                {formatNumber(profile.mutualFollowersCount || 0)}
              </p>
              <p className="text-gray-600 mt-1">Mutual Followers</p>
            </div>
          </div>

          {profile.relationshipStatus && (
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Relationship Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <span className={`text-2xl ${profile.relationshipStatus.following ? "text-green-600" : "text-gray-400"}`}>
                    {profile.relationshipStatus.following ? "✓" : "✗"}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">You follow them</p>
                    <p className="text-sm text-gray-600">
                      {profile.relationshipStatus.following ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <span className={`text-2xl ${profile.relationshipStatus.followed_by ? "text-green-600" : "text-gray-400"}`}>
                    {profile.relationshipStatus.followed_by ? "✓" : "✗"}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">They follow you</p>
                    <p className="text-sm text-gray-600">
                      {profile.relationshipStatus.followed_by ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                {profile.relationshipStatus.has_received_invitation !== undefined && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <span className={`text-2xl ${profile.relationshipStatus.has_received_invitation ? "text-yellow-600" : "text-gray-400"}`}>
                      {profile.relationshipStatus.has_received_invitation ? "✓" : "✗"}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">Received invitation</p>
                      <p className="text-sm text-gray-600">
                        {profile.relationshipStatus.has_received_invitation ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                )}
                {profile.relationshipStatus.has_sent_invitation !== undefined && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <span className={`text-2xl ${profile.relationshipStatus.has_sent_invitation ? "text-yellow-600" : "text-gray-400"}`}>
                      {profile.relationshipStatus.has_sent_invitation ? "✓" : "✗"}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">Sent invitation</p>
                      <p className="text-sm text-gray-600">
                        {profile.relationshipStatus.has_sent_invitation ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Biography Section */}
          {profile.biography && (
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Biography</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{profile.biography}</p>
            </div>
          )}

          {/* Business Information */}
          {profile.relationshipStatus?.business && (
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Business Information</h2>
              <div className="space-y-3">
                {profile.relationshipStatus.business.category && (
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Business Category:</span>
                    <span className="text-gray-900">{profile.relationshipStatus.business.category}</span>
                  </div>
                )}
                {profile.relationshipStatus.business.is_business_account !== undefined && (
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Business Account:</span>
                    <span className={`font-semibold ${profile.relationshipStatus.business.is_business_account ? "text-green-600" : "text-gray-400"}`}>
                      {profile.relationshipStatus.business.is_business_account ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Information</h2>
            <div className="space-y-3">
              {profile.providerId && (
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Provider ID:</span>
                  <span className="font-mono text-gray-900">{profile.providerId}</span>
                </div>
              )}
              {profile.providerMessagingId && (
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Messaging ID:</span>
                  <span className="font-mono text-gray-900">{profile.providerMessagingId}</span>
                </div>
              )}
              {profile.provider && (
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Provider:</span>
                  <span className="text-gray-900">{profile.provider}</span>
                </div>
              )}
              {profile.category && (
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Category:</span>
                  <span className="text-gray-900">{profile.category}</span>
                </div>
              )}
              {profile.profileType && (
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Profile Type:</span>
                  <span className="text-gray-900">{profile.profileType}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Verified:</span>
                <span className={`font-semibold ${profile.isVerified ? "text-green-600" : "text-gray-400"}`}>
                  {profile.isVerified ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Private Account:</span>
                <span className={`font-semibold ${profile.isPrivate ? "text-red-600" : "text-green-600"}`}>
                  {profile.isPrivate ? "Yes" : "No"}
                </span>
              </div>
              {profile.externalLinks && profile.externalLinks.length > 0 && (
                <div className="py-3">
                  <span className="text-gray-600 font-medium block mb-2">External Links:</span>
                  <div className="space-y-1">
                    {profile.externalLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 underline block"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Send Message</h2>
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setMessageText(PREDEFINED_MESSAGE);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={sendingMessage}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Enter your message here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows="4"
                    disabled={sendingMessage}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sending to: {profile.fullName || profile.publicIdentifier}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMessageModal(false);
                      setMessageText(PREDEFINED_MESSAGE);
                    }}
                    className="flex-1 btn-secondary"
                    disabled={sendingMessage}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                    disabled={sendingMessage || !messageText.trim()}
                  >
                    {sendingMessage ? "Sending..." : "Send Message"}
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

export default UserProfile;

