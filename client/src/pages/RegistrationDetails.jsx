import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const RegistrationDetails = () => {
  const navigate = useNavigate();
  const [trackingDetails, setTrackingDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTrackingRegistrations();
  }, []);

  const fetchTrackingRegistrations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/tracking/registrations`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setTrackingDetails(response.data.data?.registrations || []);
      } else {
        toast.error(response.data.error || 'Failed to fetch tracking registrations');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch tracking registrations');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:pt-4 pt-16">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Total Dynamite Registrations 
                </h1>
                <p className="text-gray-600">
                  Users who Registered Through Campaign
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="card mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-600">
                  Total registrations: <span className="font-semibold text-purple-700">{trackingDetails.length}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchTrackingRegistrations}
                  className="btn-secondary text-sm"
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : trackingDetails.length === 0 ? (
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No registrations found
              </h3>
              <p className="text-gray-500">
                Registrations will appear here when users sign up via campaign links
              </p>
            </motion.div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username (Tracking)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registered
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trackingDetails.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(item)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {(item.statusInfo?.profilePictureData || item.statusInfo?.profilePicture) ? (
                              <img
                                src={item.statusInfo?.profilePictureData || item.statusInfo?.profilePicture}
                                alt={item.statusInfo?.name || item.name}
                                className="w-16 h-16 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-5.5 h-5.5 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-bold text-xs">
                                  {(item.statusInfo?.name || item.name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.statusInfo?.name || item.name || '—'}
                          </div>
                          {item.statusInfo?.followersCount && (
                            <div className="text-xs text-gray-500">
                              {formatNumber(item.statusInfo.followersCount)} followers
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.email || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                @{item.trackingId || item.username || 'N/A'}
                              </div>
                              {item.trackingId && (
                                <div className="text-xs text-gray-500">Tracking ID</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(item.influencerData?.storeName || item.storeData?.storeName) ? (
                            <div>
                              <a
                                href={`https://dynamiteinfluencerstore.icod.ai/?store=${encodeURIComponent(item.influencerData?.storeUrl || item.storeData?.storeUrl || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-purple-600 hover:text-purple-800 hover:underline font-medium"
                              >
                                {item.influencerData?.storeName || item.storeData?.storeName}
                              </a>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.influencerData?.storeUrl || item.storeData?.storeUrl}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${item.influencerData?.totalEarnings || 0}
                          </div>
                          {item.influencerData?.pendingPayouts > 0 && (
                            <div className="text-xs text-orange-600">
                              Pending: ${item.influencerData.pendingPayouts}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-700">
                            registered
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.createdAt)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                User Details - {selectedUser.name || selectedUser.username}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">User Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Name:</span>
                    <span className="text-sm text-gray-900">{selectedUser.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Username:</span>
                    <span className="text-sm text-gray-900">@{selectedUser.username || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <span className="text-sm text-gray-900">{selectedUser.email || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Tracking ID:</span>
                    <span className="text-sm text-gray-900">{selectedUser.trackingId || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Role:</span>
                    <span className="text-sm text-gray-900">{selectedUser.role || 'user'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <span className="text-sm text-gray-900">{selectedUser.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Registered:</span>
                    <span className="text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Influencer Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">Influencer Information</h4>
                {selectedUser.influencerData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Store Name:</span>
                      {selectedUser.influencerData.storeName ? (
                        <a
                          href={`https://dynamiteinfluencerstore.icod.ai/?store=${encodeURIComponent(selectedUser.influencerData.storeUrl || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          {selectedUser.influencerData.storeName}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-900">—</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Store URL:</span>
                      {selectedUser.influencerData.storeUrl ? (
                        <a
                          href={`https://dynamiteinfluencerstore.icod.ai/?store=${encodeURIComponent(selectedUser.influencerData.storeUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          {selectedUser.influencerData.storeUrl}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-900">—</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Total Earnings:</span>
                      <span className="text-sm text-green-600">${selectedUser.influencerData.totalEarnings || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Pending Payouts:</span>
                      <span className="text-sm text-orange-600">${selectedUser.influencerData.pendingPayouts || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Store Active:</span>
                      <span className="text-sm text-gray-900">{selectedUser.influencerData.isStoreActive ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Onboarding:</span>
                      <span className="text-sm text-gray-900">
                        Step {selectedUser.influencerData.onboardingStep || 1} - {selectedUser.influencerData.onboardingCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No influencer data available</p>
                )}
              </div>

              {/* Store Information */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="text-md font-medium text-gray-900 border-b pb-2">Store Information</h4>
                {selectedUser.storeData ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Products:</span>
                        <span className="text-sm text-gray-900">{selectedUser.storeData.products?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Collections:</span>
                        <span className="text-sm text-gray-900">{selectedUser.storeData.collections?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Campaigns:</span>
                        <span className="text-sm text-gray-900">{selectedUser.storeData.campaigns?.length || 0}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Active Products:</h5>
                      {selectedUser.storeData.products?.filter(p => p.isActive).length > 0 ? (
                        <ul className="text-xs text-gray-600 space-y-1">
                          {selectedUser.storeData.products.filter(p => p.isActive).slice(0, 3).map((product, idx) => (
                            <li key={idx}>• Product {product.productId?.slice(-6) || idx + 1}</li>
                          ))}
                          {selectedUser.storeData.products.filter(p => p.isActive).length > 3 && (
                            <li className="text-gray-500">... and {selectedUser.storeData.products.filter(p => p.isActive).length - 3} more</li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500">No active products</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Store Created:</h5>
                      <p className="text-sm text-gray-900">{formatDate(selectedUser.storeData.createdAt)}</p>
                      <h5 className="text-sm font-medium text-gray-700">Last Updated:</h5>
                      <p className="text-sm text-gray-900">{formatDate(selectedUser.storeData.updatedAt)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No store data available</p>
                )}
              </div>

              {/* Status Information */}
              {selectedUser.statusInfo && (
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">Social Media Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <span className="text-sm text-gray-900">{selectedUser.statusInfo.status || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Followers:</span>
                      <span className="text-sm text-gray-900">{formatNumber(selectedUser.statusInfo.followersCount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Following:</span>
                      <span className="text-sm text-gray-900">{formatNumber(selectedUser.statusInfo.followingCount || 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeModal}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationDetails;

