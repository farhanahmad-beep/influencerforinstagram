import React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const InfluencerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [influencer, setInfluencer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInfluencer();
  }, [id]);

  const fetchInfluencer = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/influencers/${id}`,
        { withCredentials: true }
      );
      if (response.data.success) {
        setInfluencer(response.data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch influencer details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div id="src_pages_InfluencerDetail_e8aj" className="min-h-screen bg-gray-50">
        <Navbar />
        <div id="src_pages_InfluencerDetail_m7su" className="flex justify-center items-center py-12">
          <div id="src_pages_InfluencerDetail_0tgp" className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!influencer) {
    return null;
  }

  return (
    <div id="src_pages_InfluencerDetail_luo3" className="min-h-screen bg-gray-50">
      <Navbar />
      <div id="src_pages_InfluencerDetail_k1tl" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          id="src_pages_InfluencerDetail_d3bv" onClick={() => navigate("/dashboard")}
          className="btn-secondary mb-6"
        >
          ← Back to Dashboard
        </button>

        <motion.div
          id="src_pages_InfluencerDetail_7gpq" initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div id="src_pages_InfluencerDetail_ym9g" className="card mb-6">
            <div id="src_pages_InfluencerDetail_ras8" className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <img
                id="src_pages_InfluencerDetail_h0jk" src={influencer.profileImage}
                alt={influencer.fullName}
                className="w-32 h-32 rounded-full object-cover"
              />
              <div id="src_pages_InfluencerDetail_hhm5" className="flex-1 text-center md:text-left">
                <div id="src_pages_InfluencerDetail_4son" className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                  <h1 id="src_pages_InfluencerDetail_lj5p" className="text-3xl font-bold text-gray-900">
                    {influencer.fullName}
                  </h1>
                  {influencer.verified && (
                    <span id="src_pages_InfluencerDetail_9mnd" className="text-blue-500" title="Verified">
                      ✓
                    </span>
                  )}
                </div>
                <p id="src_pages_InfluencerDetail_fs5u" className="text-lg text-gray-600 mb-2">
                  @{influencer.username}
                </p>
                <div id="src_pages_InfluencerDetail_zl0i" className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <span id="src_pages_InfluencerDetail_cty1" className="inline-block px-3 py-1 text-sm font-medium text-purple-600 bg-purple-100 rounded-full">
                    {influencer.category}
                  </span>
                  {influencer.niche.map((n, index) => (
                    <span
                      id="src_pages_InfluencerDetail_auf5" key={index}
                      className="inline-block px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                {influencer.bio && (
                  <p id="src_pages_InfluencerDetail_xp9m" className="text-gray-700 mb-4">{influencer.bio}</p>
                )}
                {influencer.location?.country && (
                  <p id="src_pages_InfluencerDetail_5jnb" className="text-gray-600">
                    📍 {influencer.location.city ? `${influencer.location.city}, ` : ''}
                    {influencer.location.country}
                  </p>
                )}
                {influencer.contactEmail && (
                  <p id="src_pages_InfluencerDetail_0maa" className="text-gray-600 mt-2">
                    ✉️ {influencer.contactEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div id="src_pages_InfluencerDetail_7whw" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div id="src_pages_InfluencerDetail_1tle" className="card text-center">
              <p id="src_pages_InfluencerDetail_k3hz" className="text-3xl font-bold text-purple-600">
                {formatNumber(influencer.followers)}
              </p>
              <p id="src_pages_InfluencerDetail_9oha" className="text-gray-600 mt-1">Followers</p>
            </div>
            <div id="src_pages_InfluencerDetail_zr7q" className="card text-center">
              <p id="src_pages_InfluencerDetail_a6wo" className="text-3xl font-bold text-purple-600">
                {formatNumber(influencer.following)}
              </p>
              <p id="src_pages_InfluencerDetail_vf0t" className="text-gray-600 mt-1">Following</p>
            </div>
            <div id="src_pages_InfluencerDetail_9sac" className="card text-center">
              <p id="src_pages_InfluencerDetail_em2u" className="text-3xl font-bold text-purple-600">
                {formatNumber(influencer.posts)}
              </p>
              <p id="src_pages_InfluencerDetail_ly4v" className="text-gray-600 mt-1">Posts</p>
            </div>
            <div id="src_pages_InfluencerDetail_3xhz" className="card text-center">
              <p id="src_pages_InfluencerDetail_8uvh" className="text-3xl font-bold text-purple-600">
                {influencer.engagementRate.toFixed(2)}%
              </p>
              <p id="src_pages_InfluencerDetail_s2do" className="text-gray-600 mt-1">Engagement Rate</p>
            </div>
          </div>

          <div id="src_pages_InfluencerDetail_dqu5" className="card mb-6">
            <h2 id="src_pages_InfluencerDetail_3iya" className="text-2xl font-bold text-gray-900 mb-4">
              Engagement Metrics
            </h2>
            <div id="src_pages_InfluencerDetail_gq8p" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div id="src_pages_InfluencerDetail_kc2h">
                <p id="src_pages_InfluencerDetail_2wbp" className="text-gray-600">Average Likes</p>
                <p id="src_pages_InfluencerDetail_sjn0" className="text-xl font-semibold text-gray-900">
                  {formatNumber(influencer.averageLikes)}
                </p>
              </div>
              <div id="src_pages_InfluencerDetail_0jui">
                <p id="src_pages_InfluencerDetail_0zjj" className="text-gray-600">Average Comments</p>
                <p id="src_pages_InfluencerDetail_6zxf" className="text-xl font-semibold text-gray-900">
                  {formatNumber(influencer.averageComments)}
                </p>
              </div>
            </div>
          </div>

          {influencer.recentPosts && influencer.recentPosts.length > 0 && (
            <div id="src_pages_InfluencerDetail_htb8" className="card">
              <h2 id="src_pages_InfluencerDetail_dk7p" className="text-2xl font-bold text-gray-900 mb-4">
                Recent Posts
              </h2>
              <div id="src_pages_InfluencerDetail_hx6i" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {influencer.recentPosts.map((post, index) => (
                  <div id="src_pages_InfluencerDetail_ra1d" key={index} className="border rounded-lg overflow-hidden">
                    <img
                      id="src_pages_InfluencerDetail_1vrl" src={post.imageUrl}
                      alt={`Post ${index + 1}`}
                      className="w-full h-64 object-cover"
                    />
                    <div id="src_pages_InfluencerDetail_cn6i" className="p-4">
                      {post.caption && (
                        <p id="src_pages_InfluencerDetail_fe7p" className="text-sm text-gray-700 mb-2 line-clamp-2">
                          {post.caption}
                        </p>
                      )}
                      <div id="src_pages_InfluencerDetail_yzp5" className="flex justify-between text-sm text-gray-600">
                        <span id="src_pages_InfluencerDetail_cj2h">❤️ {formatNumber(post.likes)}</span>
                        <span id="src_pages_InfluencerDetail_yhd4">💬 {formatNumber(post.comments)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default InfluencerDetail;
