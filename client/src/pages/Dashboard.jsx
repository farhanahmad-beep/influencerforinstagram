import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import SearchFilters from "../components/SearchFilters.jsx";
import InfluencerCard from "../components/InfluencerCard.jsx";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    keyword: "",
    category: "",
    minFollowers: "",
    maxFollowers: "",
    minEngagement: "",
    maxEngagement: "",
    country: "",
    city: "",
  });

  useEffect(() => {
    searchInfluencers();
  }, [pagination.page]);

  const searchInfluencers = async () => {
    setLoading(true);
    try {
      // Build params object with all filter values
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      // Add each filter only if it has a value
      if (filters.keyword && filters.keyword.trim() !== "") {
        params.keyword = filters.keyword.trim();
      }
      if (filters.category && filters.category !== "") {
        params.category = filters.category;
      }
      if (filters.minFollowers && filters.minFollowers !== "") {
        params.minFollowers = filters.minFollowers;
      }
      if (filters.maxFollowers && filters.maxFollowers !== "") {
        params.maxFollowers = filters.maxFollowers;
      }
      if (filters.minEngagement && filters.minEngagement !== "") {
        params.minEngagement = filters.minEngagement;
      }
      if (filters.maxEngagement && filters.maxEngagement !== "") {
        params.maxEngagement = filters.maxEngagement;
      }
      if (filters.country && filters.country.trim() !== "") {
        params.country = filters.country.trim();
      }
      if (filters.city && filters.city.trim() !== "") {
        params.city = filters.city.trim();
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/search`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setInfluencers(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to fetch influencers");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    // Reset to page 1 and trigger search
    setPagination((prev) => ({ ...prev, page: 1 }));
    
    setLoading(true);
    try {
      // Build params object with all filter values
      const params = {
        page: 1, // Always start from page 1 on new search
        limit: pagination.limit,
      };

      // Add each filter only if it has a value
      if (filters.keyword && filters.keyword.trim() !== "") {
        params.keyword = filters.keyword.trim();
      }
      if (filters.category && filters.category !== "") {
        params.category = filters.category;
      }
      if (filters.minFollowers && filters.minFollowers !== "") {
        params.minFollowers = filters.minFollowers;
      }
      if (filters.maxFollowers && filters.maxFollowers !== "") {
        params.maxFollowers = filters.maxFollowers;
      }
      if (filters.minEngagement && filters.minEngagement !== "") {
        params.minEngagement = filters.minEngagement;
      }
      if (filters.maxEngagement && filters.maxEngagement !== "") {
        params.maxEngagement = filters.maxEngagement;
      }
      if (filters.country && filters.country.trim() !== "") {
        params.country = filters.country.trim();
      }
      if (filters.city && filters.city.trim() !== "") {
        params.city = filters.city.trim();
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/search`, {
        params,
        withCredentials: true,
      });

      if (response.data.success) {
        setInfluencers(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to fetch influencers");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div id="src_pages_Dashboard_bm1c" className="min-h-screen bg-gray-50">
      <Navbar />
      <div id="src_pages_Dashboard_bas8" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div id="src_pages_Dashboard_3hur" className="mb-8">
          <h1 id="src_pages_Dashboard_bkv9" className="text-3xl font-bold text-gray-900 mb-2">
            Discover Influencers
          </h1>
          <p id="src_pages_Dashboard_0jno" className="text-gray-600">
            Find the perfect influencers for your marketing campaigns
          </p>
          <div id="src_pages_Dashboard_live" className="mt-2 flex items-center space-x-2">
            <span id="src_pages_Dashboard_dot" className="relative flex h-3 w-3">
              <span id="src_pages_Dashboard_v0cl" className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span id="src_pages_Dashboard_1deu" className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span id="src_pages_Dashboard_text" className="text-sm text-green-600 font-medium">
              Live data from Instagram via Unipile API
            </span>
          </div>
        </div>

        <SearchFilters
          filters={filters}
          setFilters={setFilters}
          onSearch={handleSearch}
        />

        {loading ? (
          <div id="src_pages_Dashboard_hz2q" className="flex justify-center items-center py-12">
            <div id="src_pages_Dashboard_2uoj" className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : influencers.length === 0 ? (
          <div id="src_pages_Dashboard_ht1u" className="text-center py-12 bg-white rounded-lg shadow-sm p-8">
            <svg
              id="src_pages_Dashboard_icon"
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                id="src_pages_Dashboard_unp1" strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 id="src_pages_Dashboard_empty_title" className="text-lg font-medium text-gray-900 mb-2">
              No influencers found
            </h3>
            <p id="src_pages_Dashboard_oz1m" className="text-gray-500 mb-4">
              {filters.keyword ? `No results found for "${filters.keyword}". ` : ''}
              Try adjusting your search filters or search for a different Instagram username.
            </p>
            <button
              id="src_pages_Dashboard_reset_btn"
              onClick={() => {
                setFilters({
                  keyword: "",
                  category: "",
                  minFollowers: "",
                  maxFollowers: "",
                  minEngagement: "",
                  maxEngagement: "",
                  country: "",
                  city: "",
                });
                handleSearch();
              }}
              className="btn-secondary"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div id="src_pages_Dashboard_aya4" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {influencers.map((influencer) => (
                <InfluencerCard key={influencer._id} influencer={influencer} />
              ))}
            </div>

            {pagination.pages > 1 && (
              <div id="src_pages_Dashboard_e5we" className="flex justify-center items-center space-x-2">
                <button
                  id="src_pages_Dashboard_yaw8" onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span id="src_pages_Dashboard_4xdy" className="text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  id="src_pages_Dashboard_hmt7" onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
