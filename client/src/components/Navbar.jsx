import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav id="src_components_Navbar_yce3" className="bg-white shadow-md">
      <div id="src_components_Navbar_jrs1" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="src_components_Navbar_9snp" className="flex justify-between h-16">
          <div id="src_components_Navbar_sq8k" className="flex items-center">
            <Link to="/dashboard" className="flex items-center" id="client_src_components_Navbar_a1b2">
              <span id="src_components_Navbar_all8" className="text-2xl font-bold text-black">InfluencerHub</span>
            </Link>
          </div>
          <div id="src_components_Navbar_u9qx" className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_c3d4">
              Dashboard
            </Link>
            <Link to="/linked-accounts" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_linked">
              Linked Accounts
            </Link>
            <Link to="/global-search" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_global">
              Global Search
            </Link>
            <Link to="/chat-list" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_chatlist">
              Chat List
            </Link>
            <Link to="/onboard" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_onboard">
              Onboard
            </Link>
            <Link to="/followers" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_followers">
              Followers
            </Link>
            <Link to="/status-tracking" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_status">
              Status Tracking
            </Link>
            <Link to="/profile" className="text-gray-700 hover:text-purple-600 transition-colors" id="client_src_components_Navbar_e5f6">
              Profile
            </Link>
            <div id="src_components_Navbar_1kup" className="flex items-center space-x-2">
              <span id="src_components_Navbar_e5gl" className="text-sm text-gray-600">{user?.name}</span>
              <button
                id="src_components_Navbar_3vcu" onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
