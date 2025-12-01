import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const InfluencerCard = ({ influencer }) => {
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <motion.div
      id="src_components_InfluencerCard_2srm" initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card hover:shadow-lg transition-shadow duration-200"
    >
      <Link to={`/influencer/${influencer._id}`} id={`client_src_components_InfluencerCard_${influencer._id}_link`}>
        <div id="src_components_InfluencerCard_lfq6" className="flex flex-col items-center">
          <img
            id="src_components_InfluencerCard_x3fy" src={influencer.profileImage}
            alt={influencer.fullName}
            className="w-24 h-24 rounded-full object-cover mb-4"
          />
          <h3 id="src_components_InfluencerCard_5sex" className="text-lg font-semibold text-gray-900 mb-1">
            {influencer.fullName}
          </h3>
          <p id="src_components_InfluencerCard_e3zv" className="text-sm text-gray-500 mb-2">@{influencer.username}</p>
          <span id="src_components_InfluencerCard_1anh" className="inline-block px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full mb-3">
            {influencer.category}
          </span>
          <div id="src_components_InfluencerCard_gry0" className="w-full grid grid-cols-3 gap-2 text-center">
            <div id="src_components_InfluencerCard_ral0">
              <p id="src_components_InfluencerCard_nav4" className="text-sm font-semibold text-gray-900">
                {formatNumber(influencer.followers)}
              </p>
              <p id="src_components_InfluencerCard_1rjr" className="text-xs text-gray-500">Followers</p>
            </div>
            <div id="src_components_InfluencerCard_q2lz">
              <p id="src_components_InfluencerCard_4ors" className="text-sm font-semibold text-gray-900">
                {influencer.engagementRate.toFixed(1)}%
              </p>
              <p id="src_components_InfluencerCard_0pln" className="text-xs text-gray-500">Engagement</p>
            </div>
            <div id="src_components_InfluencerCard_bj6m">
              <p id="src_components_InfluencerCard_m9nt" className="text-sm font-semibold text-gray-900">
                {formatNumber(influencer.posts)}
              </p>
              <p id="src_components_InfluencerCard_7vpa" className="text-xs text-gray-500">Posts</p>
            </div>
          </div>
          {influencer.location?.country && (
            <p id="src_components_InfluencerCard_d2yo" className="text-xs text-gray-500 mt-3">
              📍 {influencer.location.city ? `${influencer.location.city}, ` : ''}
              {influencer.location.country}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default InfluencerCard;
