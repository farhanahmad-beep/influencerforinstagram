import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      if (result.isAdmin) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div id="src_pages_Login_gbe7" className="min-h-screen flex items-center justify-center">
      <motion.div
        id="src_pages_Login_aq7j" initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card max-w-md w-full mx-4 hover-lift"
      >
        <h1 id="src_pages_Login_sxf5" className="text-3xl font-bold text-center mb-2 text-primary-600">
          InfluencerHub
        </h1>
        <p id="src_pages_Login_b2og" className="text-center text-secondary-600 mb-6">
          Sign in to discover influencers
        </p>

        <form id="src_pages_Login_yv5x" onSubmit={handleSubmit}>
          <div id="src_pages_Login_lpt5" className="mb-4">
            <label id="src_pages_Login_tu5l" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="src_pages_Login_w0hf" type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="your@email.com"
            />
          </div>

          <div id="src_pages_Login_wyi9" className="mb-6">
            <label id="src_pages_Login_rqf0" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="src_pages_Login_ws3f" type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button
            id="src_pages_Login_rja4" type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p id="src_pages_Login_2zvw" className="text-center text-sm text-secondary-600 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 hover:underline transition-colors duration-200" id="client_src_pages_Login_link_reg">
            Register here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
