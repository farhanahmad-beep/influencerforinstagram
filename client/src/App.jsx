import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Profile from "./pages/Profile.jsx";
import InfluencerDetail from "./pages/InfluencerDetail.jsx";
import LinkedAccounts from "./pages/LinkedAccounts.jsx";
import Followers from "./pages/Followers.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import GlobalSearch from "./pages/GlobalSearch.jsx";
import ChatList from "./pages/ChatList.jsx";
import ChatMessages from "./pages/ChatMessages.jsx";
import Onboard from "./pages/Onboard.jsx";
import StatusTracking from "./pages/StatusTracking.jsx";
import InfluencerGrowth from "./pages/InfluencerGrowth.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/influencer/:id"
          element={
            <ProtectedRoute>
              <InfluencerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/linked-accounts"
          element={
            <ProtectedRoute>
              <LinkedAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/global-search"
          element={
            <ProtectedRoute>
              <GlobalSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat-list"
          element={
            <ProtectedRoute>
              <ChatList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat-messages/:chatId"
          element={
            <ProtectedRoute>
              <ChatMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboard"
          element={
            <ProtectedRoute>
              <Onboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/status-tracking"
          element={
            <ProtectedRoute>
              <StatusTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/influencer-growth"
          element={
            <ProtectedRoute>
              <InfluencerGrowth />
            </ProtectedRoute>
          }
        />
              <Route
                path="/followers"
                element={
                  <ProtectedRoute>
                    <Followers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-profile/:userId"
                element={
                  <ProtectedRoute>
                    <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
