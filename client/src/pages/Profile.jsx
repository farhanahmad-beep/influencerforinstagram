import React from "react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import Navbar from "../components/Navbar.jsx";
import { motion } from "framer-motion";

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
