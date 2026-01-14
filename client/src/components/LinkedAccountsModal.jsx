import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const LinkedAccountsModal = ({ isOpen, onClose }) => {
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [accountProfiles, setAccountProfiles] = useState({});
  const [loadingProfiles, setLoadingProfiles] = useState({});
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Fetch linked accounts when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchLinkedAccounts();
    }
  }, [isOpen]);

  const fetchLinkedAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/linked-accounts`, {
        withCredentials: true,
      });
      if (response.data.success) {
        const accounts = response.data.data || [];
        setLinkedAccounts(accounts);
        // Fetch profile details for each account
        accounts.forEach((account) => {
          fetchAccountProfile(account.id);
        });
      }
    } catch (error) {
      toast.error("Failed to fetch linked accounts");
      console.error("Failed to fetch linked accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchAccountProfile = async (accountId) => {
    setLoadingProfiles((prev) => ({ ...prev, [accountId]: true }));
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/account-profile`, {
        params: { account_id: accountId },
        withCredentials: true,
      });
      if (response.data.success && response.data.data) {
        console.log(`Profile data for ${accountId}:`, response.data.data);
        setAccountProfiles((prev) => ({
          ...prev,
          [accountId]: response.data.data,
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch profile for account ${accountId}:`, error);
    } finally {
      setLoadingProfiles((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    const numericValue = Number(num);
    if (isNaN(numericValue)) return '0';

    if (numericValue >= 1000000) {
      return `${(numericValue / 1000000).toFixed(1)}M`;
    } else if (numericValue >= 1000) {
      return `${(numericValue / 1000).toFixed(1)}K`;
    }
    return numericValue.toString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-secondary-900">Linked Accounts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-secondary-600 mb-6">
            Manage your connected social media accounts
          </p>

          {loadingAccounts ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : linkedAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No Linked Accounts</h3>
              <p className="text-secondary-500">
                You don't have any accounts linked
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className="border border-secondary-200 rounded-lg p-4 hover-lift"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <img
                          src={
                            accountProfiles[account.id]?.profilePictureData ||
                            accountProfiles[account.id]?.profilePictureUrlLarge ||
                            accountProfiles[account.id]?.profilePictureUrl ||
                            ''
                          }
                          alt={accountProfiles[account.id]?.fullName || account.name}
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          style={{
                            display: (
                              accountProfiles[account.id]?.profilePictureData ||
                              accountProfiles[account.id]?.profilePictureUrl ||
                              accountProfiles[account.id]?.profilePictureUrlLarge
                            ) ? 'block' : 'none'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div
                          className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center"
                          style={{
                            display: (
                              accountProfiles[account.id]?.profilePictureData ||
                              accountProfiles[account.id]?.profilePictureUrl ||
                              accountProfiles[account.id]?.profilePictureUrlLarge
                            ) ? 'none' : 'flex'
                          }}
                        >
                            <span className="text-primary-600 font-bold text-sm">
                            {accountProfiles[account.id]?.fullName?.charAt(0)?.toUpperCase() || account.name?.charAt(0)?.toUpperCase() || "A"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <h4 className="text-base font-semibold text-secondary-900">
                            {accountProfiles[account.id]?.fullName || account.name}
                          </h4>
                          {accountProfiles[account.id]?.isVerified && (
                            <span className="text-blue-500 text-sm" title="Verified">
                              ✓
                            </span>
                          )}
                          {accountProfiles[account.id]?.isPrivate && (
                            <span className="text-gray-400 text-sm" title="Private Account">
                              🔒
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-secondary-500">
                          @{accountProfiles[account.id]?.publicIdentifier || account.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {loadingProfiles[account.id] ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    </div>
                  ) : accountProfiles[account.id] ? (
                    <>
                      {accountProfiles[account.id].biography && (
                        <p className="text-sm text-secondary-700 mb-3 line-clamp-2">
                          {accountProfiles[account.id].biography}
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-black">
                            {formatNumber(accountProfiles[account.id].followersCount)}
                          </p>
                          <p className="text-xs text-gray-500">Followers</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-black">
                            {formatNumber(accountProfiles[account.id].followingCount)}
                          </p>
                          <p className="text-xs text-gray-500">Following</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-black">
                            {formatNumber(accountProfiles[account.id].postsCount)}
                          </p>
                          <p className="text-xs text-gray-500">Posts</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="text-xs text-gray-500 space-y-1">
                          <p><span className="font-medium">Provider:</span> {accountProfiles[account.id].provider || 'Unknown'}</p>
                          <p><span className="font-medium">Profile Type:</span> {accountProfiles[account.id].profileType || 'Unknown'}</p>
                          <p><span className="font-medium">Category:</span> {accountProfiles[account.id].category || 'Not set'}</p>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p><span className="font-medium">Account ID:</span> {account.id}</p>
                          <p><span className="font-medium">Provider ID:</span> {accountProfiles[account.id].providerId || 'N/A'}</p>
                          <p><span className="font-medium">Messaging ID:</span> {accountProfiles[account.id].providerMessagingId || 'N/A'}</p>
                          {accountProfiles[account.id].externalLinks && accountProfiles[account.id].externalLinks.length > 0 && (
                            <p><span className="font-medium">External Links:</span> {accountProfiles[account.id].externalLinks.length}</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><span className="font-medium">Account ID:</span> {account.id}</p>
                      <p><span className="font-medium">Username:</span> @{account.username}</p>
                      <p>Unable to load detailed profile information</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
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

export default LinkedAccountsModal;
