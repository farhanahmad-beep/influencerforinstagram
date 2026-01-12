import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { motion } from "framer-motion";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.company
    );
    setLoading(false);
    if (result.success) {
      navigate("/dashboard");
    }
  };

  return (
    <div id="src_pages_Register_x9zj" className="min-h-screen flex items-center justify-center">
      <motion.div
        id="src_pages_Register_vrn8" initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card max-w-md w-full mx-4 hover-lift"
      >
        <h1 id="src_pages_Register_hp4a" className="text-3xl font-bold text-center mb-2 text-primary-600">
          InfluencerHub
        </h1>
        <p id="src_pages_Register_uk9w" className="text-center text-secondary-600 mb-6">
          Create your account
        </p>

        <form id="src_pages_Register_eeo6" onSubmit={handleSubmit}>
          <div id="src_pages_Register_ho2q" className="mb-4">
            <label id="src_pages_Register_o5tg" className="form-label">
              Full Name
            </label>
            <input
              id="src_pages_Register_7deh" type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="John Doe"
            />
          </div>

          <div id="src_pages_Register_ul8t" className="mb-4">
            <label id="src_pages_Register_apv2" className="form-label">
              Email
            </label>
            <input
              id="src_pages_Register_vf5s" type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="your@email.com"
            />
          </div>

          <div id="src_pages_Register_mh0b" className="mb-4">
            <label id="src_pages_Register_ja3y" className="form-label">
              Password
            </label>
            <input
              id="src_pages_Register_s7on" type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <div id="src_pages_Register_ekl8" className="mb-6">
            <label id="src_pages_Register_kv9f" className="form-label">
              Company (Optional)
            </label>
            <input
              id="src_pages_Register_ggf1" type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="input-field"
              placeholder="Your Company"
            />
          </div>

          <button
            id="src_pages_Register_pps3" type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p id="src_pages_Register_kv1p" className="text-center text-sm text-secondary-600 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 hover:underline transition-colors duration-200" id="client_src_pages_Register_link_login">
            Sign in here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
