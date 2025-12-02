import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const LinkedAccounts = () => {
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/linked-accounts`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setLinkedAccounts(response.data.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch linked accounts");
      console.error("Failed to fetch linked accounts:", error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Linked Accounts</h1>
          <p className="text-gray-600">
            Manage your connected social media accounts from Unipile
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : linkedAccounts.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {linkedAccounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-lg">
                        {account.name?.charAt(0)?.toUpperCase() || "A"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {account.name}
                      </h3>
                      <p className="text-sm text-gray-500">@{account.username}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Platform</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                      {account.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
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
                    <span className="text-sm text-gray-600">Connected</span>
                    <span className="text-sm text-gray-900">
                      {formatDate(account.createdAt)}
                    </span>
                  </div>

                  {account.groups && account.groups.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Groups: </span>
                      <span className="text-sm text-gray-900">
                        {account.groups.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Account ID: <span className="font-mono">{account.id}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {linkedAccounts.length > 0 && (
          <div className="mt-8 card bg-purple-50 border border-purple-200">
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
    </div>
  );
};

export default LinkedAccounts;

