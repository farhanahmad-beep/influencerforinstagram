import React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.js";
import Navbar from "../components/Navbar.jsx";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    company: user?.company || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  // Linked Accounts state
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [accountProfiles, setAccountProfiles] = useState({});
  const [loadingProfiles, setLoadingProfiles] = useState({});
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

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
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
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

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await updateProfile(profileData.name, profileData.company);
    setLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return;
    }
    setLoading(true);
    const result = await changePassword(
      passwordData.currentPassword,
      passwordData.newPassword
    );
    setLoading(false);
    if (result.success) {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  return (
    <div id="src_pages_Profile_5nll" className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div id="src_pages_Profile_0nta" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
        <h1 id="src_pages_Profile_ggo7" className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <motion.div
          id="src_pages_Profile_xkw8" initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Linked Accounts</h2>
            <p className="text-gray-600 mb-4">
              Manage your connected social media accounts from Unipile
            </p>

            {loadingAccounts ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : linkedAccounts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Linked Accounts</h3>
                <p className="text-gray-500">
                  You don't have any accounts linked to Unipile yet.
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {linkedAccounts.map((account, index) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
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
                            className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"
                            style={{
                              display: (
                                accountProfiles[account.id]?.profilePictureData ||
                                accountProfiles[account.id]?.profilePictureUrl ||
                                accountProfiles[account.id]?.profilePictureUrlLarge
                              ) ? 'none' : 'flex'
                            }}
                          >
                            <span className="text-purple-600 font-bold text-sm">
                              {accountProfiles[account.id]?.fullName?.charAt(0)?.toUpperCase() || account.name?.charAt(0)?.toUpperCase() || "A"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1">
                            <h4 className="text-base font-semibold text-gray-900">
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
                          <p className="text-sm text-gray-500">
                            @{accountProfiles[account.id]?.publicIdentifier || account.username}
                          </p>
                        </div>
                      </div>
                    </div>

                    {loadingProfiles[account.id] ? (
                      <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                      </div>
                    ) : accountProfiles[account.id] ? (
                      <>
                        {accountProfiles[account.id].biography && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {accountProfiles[account.id].biography}
                          </p>
                        )}

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center">
                            <p className="text-sm font-semibold text-purple-600">
                              {formatNumber(accountProfiles[account.id].followersCount)}
                            </p>
                            <p className="text-xs text-gray-500">Followers</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-purple-600">
                              {formatNumber(accountProfiles[account.id].followingCount)}
                            </p>
                            <p className="text-xs text-gray-500">Following</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-purple-600">
                              {formatNumber(accountProfiles[account.id].postsCount)}
                            </p>
                            <p className="text-xs text-gray-500">Posts</p>
                          </div>
                        </div>
                      </>
                    ) : null}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Platform</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                          {account.type}
                        </span>
                      </div>

                      {accountProfiles[account.id]?.category && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Category</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                            {accountProfiles[account.id].category}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status</span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            account.status === "ERROR"
                              ? "bg-red-100 text-red-600"
                              : account.status === "ACTIVE"
                              ? "bg-green-100 text-green-600"
                              : "bg-yellow-100 text-yellow-600"
                          }`}
                        >
                          {account.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Connected</span>
                        <span className="text-gray-900">
                          {formatDate(account.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Account ID: <span className="font-mono">{account.id}</span>
                      </div>
                      {accountProfiles[account.id]?.providerId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Provider ID: <span className="font-mono">{accountProfiles[account.id].providerId}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {linkedAccounts.length > 0 && (
              <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-purple-900">
                      About Linked Accounts
                    </h3>
                    <p className="mt-1 text-sm text-purple-700">
                      These are your social media accounts connected through Unipile.
                      You can manage and monitor these accounts from your Unipile dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div id="src_pages_Profile_xf5c" className="card">
            <h2 id="src_pages_Profile_gns5" className="text-xl font-semibold mb-4">Profile Information</h2>
            <form id="src_pages_Profile_a9or" onSubmit={handleProfileSubmit}>
              <div id="src_pages_Profile_ob4e" className="mb-4">
                <label id="src_pages_Profile_sl8t" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="src_pages_Profile_5ggy" type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  required
                  className="input-field"
                />
              </div>

              <div id="src_pages_Profile_z6mm" className="mb-4">
                <label id="src_pages_Profile_mwo9" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="src_pages_Profile_9odq" type="email"
                  value={user?.email}
                  disabled
                  className="input-field bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div id="src_pages_Profile_s1lz" className="mb-6">
                <label id="src_pages_Profile_mp1k" className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  id="src_pages_Profile_b1ty" type="text"
                  name="company"
                  value={profileData.company}
                  onChange={handleProfileChange}
                  className="input-field"
                />
              </div>

              <button
                id="src_pages_Profile_m8ru" type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </div>

          <div id="src_pages_Profile_p0zn" className="card">
            <h2 id="src_pages_Profile_dir1" className="text-xl font-semibold mb-4">Change Password</h2>
            <form id="src_pages_Profile_vz9g" onSubmit={handlePasswordSubmit}>
              <div id="src_pages_Profile_ev3v" className="mb-4">
                <label id="src_pages_Profile_yp4w" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  id="src_pages_Profile_y0xi" type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  className="input-field"
                />
              </div>

              <div id="src_pages_Profile_htm0" className="mb-4">
                <label id="src_pages_Profile_vq9q" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="src_pages_Profile_7kqm" type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                  className="input-field"
                />
              </div>

              <div id="src_pages_Profile_q4gv" className="mb-6">
                <label id="src_pages_Profile_ork7" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="src_pages_Profile_w6ag" type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                  className="input-field"
                />
              </div>

              <button
                id="src_pages_Profile_ccq5" type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
      </div>
    </div>
  );
};

export default Profile;
