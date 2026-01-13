import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import LinkedAccountsModal from "../components/LinkedAccountsModal.jsx";
import ChatListModal from "../components/ChatListModal.jsx";
import OnboardedUsersModal from "../components/OnboardedUsersModal.jsx";
import CampaignsModal from "../components/CampaignsModal.jsx";
import PlatformGrowthModal from "../components/PlatformGrowthModal.jsx";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    linkedAccounts: 0,
    messagesSent: 0,
    onboardedUsers: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    trackingRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState([]);
  const [chartData, setChartData] = useState([]);

  // Linked Accounts Modal state
  const [showLinkedAccountsModal, setShowLinkedAccountsModal] = useState(false);

  // Chat List Modal state
  const [showChatListModal, setShowChatListModal] = useState(false);

  // Onboarded Users Modal state
  const [showOnboardedUsersModal, setShowOnboardedUsersModal] = useState(false);

  // Campaigns Modal state
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [campaignsModalTab, setCampaignsModalTab] = useState('active'); // 'active' or 'completed'

  // Platform Growth Modal state
  const [showPlatformGrowthModal, setShowPlatformGrowthModal] = useState(false);

  // Generate mini chart data based on current stats
  const generateMiniChartData = (currentValue, maxPoints = 8) => {
    const data = [];
    const baseValue = Math.max(currentValue * 0.7, 0); // Start from 70% of current value

    for (let i = 0; i < maxPoints; i++) {
      const variation = (Math.random() - 0.5) * 0.3; // Random variation ±15%
      const value = Math.max(baseValue + (currentValue - baseValue) * (i / (maxPoints - 1)) * (1 + variation), 0);
      data.push({
        index: i,
        value: Math.round(value)
      });
      }

    // Ensure the last point matches current value
    data[data.length - 1].value = currentValue;
    return data;
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/stats`, {
        withCredentials: true,
      });
      if (response.data.success && response.data.data) {
        const newStats = response.data.data;
        setStats(newStats);

        // Add to historical data for charts
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newDataPoint = {
          time: timestamp,
          linkedAccounts: newStats.linkedAccounts,
          messagesSent: newStats.messagesSent,
          onboardedUsers: newStats.onboardedUsers,
          activeCampaigns: newStats.activeCampaigns,
          completedCampaigns: newStats.completedCampaigns,
        };

        setHistoricalData(prev => {
          const updated = [...prev, newDataPoint];
          // Keep only last 20 data points for better performance
          return updated.length > 20 ? updated.slice(-20) : updated;
        });

        // Prepare current stats for bar chart
        setChartData([
          { name: 'Linked Accounts', value: newStats.linkedAccounts, color: '#8b5cf6' },
          { name: 'Messages Sent', value: newStats.messagesSent, color: '#06b6d4' },
          { name: 'Onboarded Users', value: newStats.onboardedUsers, color: '#10b981' },
          { name: 'Active Campaigns', value: newStats.activeCampaigns, color: '#f59e0b' },
          { name: 'Completed Campaigns', value: newStats.completedCampaigns, color: '#ef4444' },
          { name: 'Dynamite Registrations', value: newStats.trackingRegistrations, color: '#7c3aed' },
        ]);
      } else {
        toast.error(response.data.error || "Failed to fetch stats");
      }
    } catch (error) {
      toast.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedAccountsClick = () => {
    setShowLinkedAccountsModal(true);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 1800000); // refresh every 30 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen bg-secondary-50 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="content-container section-spacing lg:pt-4 pt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Dashboard
          </h1>
          <p className="text-secondary-600">
            Real-time stats for your account activity
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            <div
              className="card flex items-center justify-between cursor-pointer hover-lift"
              onClick={handleLinkedAccountsClick}
            >
              <div className="flex-1">
                <p className="text-sm text-secondary-500">Total Linked Accounts</p>
                <p className="text-3xl font-bold text-secondary-600 mt-2">{stats.linkedAccounts}</p>
                <p className="text-xs text-secondary-400 mt-1">Updated every 30 minutes</p>
              </div>
              <div className="w-20 h-12 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateMiniChartData(stats.linkedAccounts)}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              className="card flex items-center justify-between cursor-pointer hover-lift"
              onClick={() => setShowChatListModal(true)}
            >
              <div className="flex-1">
                <p className="text-sm text-secondary-500">Messages Sent</p>
                <p className="text-3xl font-bold text-secondary-600 mt-2">{stats.messagesSent}</p>
                <p className="text-xs text-secondary-400 mt-1">Total messages sent</p>
              </div>
              <div className="w-20 h-12 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={generateMiniChartData(stats.messagesSent)}>
                    <defs>
                      <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#06b6d4"
                      fill="url(#messagesGradient)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
              fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              className="card flex items-center justify-between cursor-pointer hover-lift"
              onClick={() => setShowOnboardedUsersModal(true)}
            >
              <div className="flex-1">
                {/* onboarded user details */}
                <p className="text-sm text-secondary-500">User who show interest</p>
                <p className="text-3xl font-bold text-secondary-600 mt-2">{stats.onboardedUsers}</p>
                <p className="text-xs text-secondary-400 mt-1">Total users who show interest</p>
              </div>
              <div className="w-20 h-12 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateMiniChartData(stats.onboardedUsers)}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              className="card flex items-center justify-between cursor-pointer hover-lift"
              onClick={() => {
                setCampaignsModalTab('active');
                setShowCampaignsModal(true);
              }}
            >
              <div className="flex-1">
                <p className="text-sm text-secondary-500">Active Campaigns</p>
                <p className="text-3xl font-bold text-secondary-600 mt-2">{stats.activeCampaigns}</p>
                <p className="text-xs text-secondary-400 mt-1">Currently running</p>
              </div>
              <div className="w-20 h-12 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateMiniChartData(stats.activeCampaigns, 8)}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              className="card flex items-center justify-between cursor-pointer hover-lift"
              onClick={() => {
                setCampaignsModalTab('completed');
                setShowCampaignsModal(true);
              }}
            >
              <div className="flex-1">
                <p className="text-sm text-secondary-500">Completed Campaigns</p>
                <p className="text-3xl font-bold text-secondary-600 mt-2">{stats.completedCampaigns}</p>
                <p className="text-xs text-secondary-400 mt-1">Successfully completed</p>
              </div>
              <div className="w-20 h-12 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateMiniChartData(stats.completedCampaigns, 8)}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#ef4444"
                strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              className="card flex items-center justify-between cursor-pointer hover-lift"
              onClick={() => navigate('/registration-details')}
            >
              <div className="flex-1">
                <p className="text-sm text-secondary-500">Total Registrations on Dynamite Influencer Store</p>
                <p className="text-3xl font-bold text-secondary-600 mt-2">{stats.trackingRegistrations || 0}</p>
                <p className="text-xs text-secondary-400 mt-1">Users who Register Through Campaign</p>
              </div>
              <div className="w-20 h-12 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateMiniChartData(stats.trackingRegistrations || 0)}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                    </div>
                  </div>
            <div
              className="card flex items-center justify-between cursor-pointer hover-lift"
              onClick={() => setShowPlatformGrowthModal(true)}
            >
              <div className="flex-1">
                <p className="text-sm text-secondary-500">Top Performing Platform</p>
                <div className="mt-2">
                  <p className="text-xl font-bold text-gray-900">Instagram</p>
                  <p className="text-sm text-green-600">68% Growth</p>
                </div>
                <p className="text-xs text-secondary-400 mt-1">Highest engagement platform</p>
                </div>
              <div className="w-20 h-12 ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'IG', value: 68 },
                    { name: 'YT', value: 42 },
                    { name: 'TT', value: 35 }
                  ]}>
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      <Cell fill="#E4405F" />
                      <Cell fill="#FF0000" />
                      <Cell fill="#000000" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Charts Section */}
        <div className="mt-12 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Real-time Analytics</h2>
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm text-green-600 font-medium">Live Updates</span>
            </div>
          </div>

          {/* Trends Over Time - Line Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Trends Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="linkedAccounts"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Linked Accounts"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="messagesSent"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    name="Messages Sent"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="onboardedUsers"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Onboarded Users"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeCampaigns"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Active Campaigns"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completedCampaigns"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Completed Campaigns"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Current Stats Comparison - Bar Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Metrics Overview</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </div>

          {/* Campaign Distribution - Pie Chart */}
          {(stats.activeCampaigns > 0 || stats.completedCampaigns > 0) && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active Campaigns', value: stats.activeCampaigns, color: '#f59e0b' },
                        { name: 'Completed Campaigns', value: stats.completedCampaigns, color: '#10b981' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              </div>
            )}

          {/* Growth Metrics - Area Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Metrics Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis
                    fontSize={12}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="messagesSent"
                    stackId="1"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorMessages)"
                    name="Messages Sent"
                  />
                  <Area
                    type="monotone"
                    dataKey="onboardedUsers"
                    stackId="2"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    name="Onboarded Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Linked Accounts Modal */}
      <LinkedAccountsModal
        isOpen={showLinkedAccountsModal}
        onClose={() => setShowLinkedAccountsModal(false)}
      />

      {/* Chat List Modal */}
      <ChatListModal
        isOpen={showChatListModal}
        onClose={() => setShowChatListModal(false)}
      />

      {/* Onboarded Users Modal */}
      <OnboardedUsersModal
        isOpen={showOnboardedUsersModal}
        onClose={() => setShowOnboardedUsersModal(false)}
      />

      {/* Campaigns Modal */}
      <CampaignsModal
        isOpen={showCampaignsModal}
        onClose={() => setShowCampaignsModal(false)}
        initialTab={campaignsModalTab}
      />

      {/* Platform Growth Modal */}
      <PlatformGrowthModal
        isOpen={showPlatformGrowthModal}
        onClose={() => setShowPlatformGrowthModal(false)}
      />
    </div>
  );
};

export default Dashboard;
