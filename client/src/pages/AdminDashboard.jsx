import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth.js";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInfluencers: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // TODO: Implement admin stats endpoint when backend route is ready
      // const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stats`, {
      //   withCredentials: true,
      // });
      // if (response.data.success) {
      //   setStats(response.data.data);
      // }
      
      // Placeholder data for now
      setStats({
        totalUsers: 0,
        totalInfluencers: 0,
        activeUsers: 0,
      });
    } catch (error) {
      toast.error("Failed to fetch admin statistics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="src_pages_AdminDashboard_am1c" className="min-h-screen bg-gray-50">
      <Navbar />
      <div id="src_pages_AdminDashboard_bas8" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div id="src_pages_AdminDashboard_3hur" className="mb-8">
          <h1 id="src_pages_AdminDashboard_bkv9" className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p id="src_pages_AdminDashboard_0jno" className="text-gray-600">
            Welcome back, {user?.name}
          </p>
        </div>

        {loading ? (
          <div id="src_pages_AdminDashboard_hz2q" className="flex justify-center items-center py-12">
            <div id="src_pages_AdminDashboard_2uoj" className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div id="src_pages_AdminDashboard_stats" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div id="src_pages_AdminDashboard_card1" className="bg-white rounded-lg shadow p-6">
              <h3 id="src_pages_AdminDashboard_h1" className="text-gray-500 text-sm font-medium mb-2">
                Total Users
              </h3>
              <p id="src_pages_AdminDashboard_p1" className="text-3xl font-bold text-gray-900">
                {stats.totalUsers}
              </p>
            </div>
            
            <div id="src_pages_AdminDashboard_card2" className="bg-white rounded-lg shadow p-6">
              <h3 id="src_pages_AdminDashboard_h2" className="text-gray-500 text-sm font-medium mb-2">
                Total Influencers
              </h3>
              <p id="src_pages_AdminDashboard_p2" className="text-3xl font-bold text-gray-900">
                {stats.totalInfluencers}
              </p>
            </div>
            
            <div id="src_pages_AdminDashboard_card3" className="bg-white rounded-lg shadow p-6">
              <h3 id="src_pages_AdminDashboard_h3" className="text-gray-500 text-sm font-medium mb-2">
                Active Users
              </h3>
              <p id="src_pages_AdminDashboard_p3" className="text-3xl font-bold text-gray-900">
                {stats.activeUsers}
              </p>
            </div>
          </div>
        )}

        <div id="src_pages_AdminDashboard_info" className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 id="src_pages_AdminDashboard_infoh" className="text-lg font-semibold text-blue-900 mb-2">
            Admin Access Granted
          </h2>
          <p id="src_pages_AdminDashboard_infop" className="text-blue-700">
            You have full administrative privileges. Additional admin features will be available here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
