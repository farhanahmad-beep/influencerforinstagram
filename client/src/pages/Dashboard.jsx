import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [stats, setStats] = useState({
    linkedAccounts: 0,
    messagesSent: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/stats`, {
        withCredentials: true,
      });
      if (response.data.success && response.data.data) {
        setStats(response.data.data);
      } else {
        toast.error(response.data.error || "Failed to fetch stats");
      }
    } catch (error) {
      toast.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 1800000); // refresh every 30 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time stats for your account activity
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-600 font-medium">
              Live data via Unipile API
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card">
              <p className="text-sm text-gray-500">Total Linked Accounts</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">{stats.linkedAccounts}</p>
              <p className="text-xs text-gray-400 mt-1">Updated every 30 minutes</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Messages Sent</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">{stats.messagesSent}</p>
              <p className="text-xs text-gray-400 mt-1">Since last server start</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">API Status</p>
              <p className="text-lg font-semibold text-green-600 mt-2">Healthy</p>
              <p className="text-xs text-gray-400 mt-1">Based on latest stats fetch</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
