import React from "react";
import { useNavigate } from "react-router-dom";

const CampaignMessageModal = ({ isOpen, onClose, campaign, users, selectedAccountId }) => {
  const navigate = useNavigate();

  if (!isOpen || !campaign) return null;

  const handleUserClick = (user) => {
    // Navigate to chat messages for this user
    navigate(`/chat-messages/${user.chatId}`, {
      state: {
        chatName: user.name || user.username,
        accountId: selectedAccountId,
        chatData: {
          id: user.chatId,
          name: user.name || user.chatName,
          username: user.username,
          profilePicture: user.profilePicture,
          profilePictureData: user.profilePictureData,
          attendeeProviderId: user.messagingId,
          providerId: user.messagingId,
          userStatus: user.status,
          userFollowersCount: user.followersCount,
          userFollowingCount: user.followingCount,
        },
        attendeeProviderId: user.messagingId,
        providerId: user.messagingId,
        userStatus: user.status,
        username: user.username,
        profilePicture: user.profilePicture,
        profilePictureData: user.profilePictureData,
        userFollowersCount: user.followersCount,
        userFollowingCount: user.followingCount,
      },
    });
    onClose(); // Close the modal after navigation
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
              <p className="text-sm text-gray-600 mt-1">Campaign Message</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Campaign Message */}
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                    Campaign Message
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    {campaign.userCount || 0} user{campaign.userCount !== 1 ? 's' : ''} in this campaign
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Sent to {campaign.userCount || 0} user{campaign.userCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-purple-100">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                Hey! Check this out: https://dynamiteinfluencerstore.icod.ai/register
              </p>
            </div>

            {campaign.description && (
              <div className="mt-4 pt-4 border-t border-purple-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Campaign Description</h4>
                <p className="text-sm text-gray-600">{campaign.description}</p>
              </div>
            )}
          </div>

          {/* Campaign Details */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Campaign Status</h4>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  campaign.status === 'running' ? 'bg-green-100 text-green-800' :
                  campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  campaign.status === 'expired' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1) || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Created</h4>
              <p className="text-sm text-gray-600">
                {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Users Who Received the Message */}
          {users && users.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Sent to {users.length} User{users.length !== 1 ? 's' : ''}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {users.map((user, index) => (
                  <div
                    key={user.userId || user.chatId || index}
                    onClick={() => handleUserClick(user)}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                  >
                    <div className="relative">
                      {(user.profilePictureData || user.profilePicture) ? (
                        <img
                          src={user.profilePictureData || user.profilePicture}
                          alt={user.name || user.username}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 ${
                          (user.profilePictureData || user.profilePicture) ? 'hidden' : 'flex'
                        }`}
                      >
                        <span className="text-purple-600 font-bold text-sm">
                          {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {user.name || user.username || "Unknown"}
                      </h4>
                      {user.username && user.username !== user.name && (
                        <p className="text-xs text-gray-500 truncate">
                          @{user.username}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center text-xs text-green-600">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Sent
                        </span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Click on any user to view their chat conversation
              </p>
            </div>
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

export default CampaignMessageModal;
