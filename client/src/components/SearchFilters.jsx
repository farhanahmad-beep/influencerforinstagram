import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";

const SearchFilters = ({ filters, setFilters, onSearch, hideEngagement = false }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/influencers/categories`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  const handleReset = () => {
    const resetFilters = {
      keyword: "",
      category: "",
      minFollowers: "",
      maxFollowers: "",
      minEngagement: "",
      maxEngagement: "",
      country: "",
      city: "",
    };
    setFilters(resetFilters);
    // Trigger search with reset filters
    setTimeout(() => {
      onSearch();
    }, 0);
  };

  return (
    <div id="src_components_SearchFilters_q5ds" className="card mb-6">
      <h2 id="src_components_SearchFilters_nse2" className="text-xl font-semibold mb-4">Search and Filter</h2>
      <form id="src_components_SearchFilters_h6lg" onSubmit={handleSubmit}>
        <div id="src_components_SearchFilters_t6ni" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div id="src_components_SearchFilters_zs9r">
            <label id="src_components_SearchFilters_m1cy" className="block text-sm font-medium text-gray-700 mb-1">
              Keyword
            </label>
            <input
              id="src_components_SearchFilters_7qpu" type="text"
              name="keyword"
              value={filters.keyword}
              onChange={handleInputChange}
              placeholder="Search by name or username"
              className="input-field"
            />
          </div>

          <div id="src_components_SearchFilters_v4iw">
            <label id="src_components_SearchFilters_ui6m" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="src_components_SearchFilters_dn7e" name="category"
              value={filters.category}
              onChange={handleInputChange}
              className="input-field"
            >
              <option id="src_components_SearchFilters_vk4a" value="">All Categories</option>
              {categories.map((cat) => (
                <option id="src_components_SearchFilters_c3lg" key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div id="src_components_SearchFilters_kt8v">
            <label id="src_components_SearchFilters_zns7" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              id="src_components_SearchFilters_wj5c" type="text"
              name="country"
              value={filters.country}
              onChange={handleInputChange}
              placeholder="e.g., United States"
              className="input-field"
            />
          </div>

          <div id="src_components_SearchFilters_iap6">
            <label id="src_components_SearchFilters_0guf" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              id="src_components_SearchFilters_xw2w" type="text"
              name="city"
              value={filters.city}
              onChange={handleInputChange}
              placeholder="e.g., New York"
              className="input-field"
            />
          </div>

          <div id="src_components_SearchFilters_5tie">
            <label id="src_components_SearchFilters_mzn1" className="block text-sm font-medium text-gray-700 mb-1">
              Min Followers
            </label>
            <input
              id="src_components_SearchFilters_io5q" type="number"
              name="minFollowers"
              value={filters.minFollowers}
              onChange={handleInputChange}
              placeholder="e.g., 10000"
              className="input-field"
            />
          </div>

          <div id="src_components_SearchFilters_tk5l">
            <label id="src_components_SearchFilters_2gko" className="block text-sm font-medium text-gray-700 mb-1">
              Max Followers
            </label>
            <input
              id="src_components_SearchFilters_dtd5" type="number"
              name="maxFollowers"
              value={filters.maxFollowers}
              onChange={handleInputChange}
              placeholder="e.g., 1000000"
              className="input-field"
            />
          </div>

          {!hideEngagement && (
            <>
              <div id="src_components_SearchFilters_s0px">
                <label id="src_components_SearchFilters_yyf8" className="block text-sm font-medium text-gray-700 mb-1">
                  Min Engagement Rate (%)
                </label>
                <input
                  id="src_components_SearchFilters_sz1p" type="number"
                  step="0.1"
                  name="minEngagement"
                  value={filters.minEngagement}
                  onChange={handleInputChange}
                  placeholder="e.g., 2.0"
                  className="input-field"
                />
              </div>

              <div id="src_components_SearchFilters_ezk3">
                <label id="src_components_SearchFilters_3eqc" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Engagement Rate (%)
                </label>
                <input
                  id="src_components_SearchFilters_pi9a" type="number"
                  step="0.1"
                  name="maxEngagement"
                  value={filters.maxEngagement}
                  onChange={handleInputChange}
                  placeholder="e.g., 10.0"
                  className="input-field"
                />
              </div>
            </>
          )}
        </div>

        <div id="src_components_SearchFilters_4clp" className="flex space-x-3">
          <button id="src_components_SearchFilters_yi8q" type="submit" className="btn-primary">
            Search
          </button>
          <button id="src_components_SearchFilters_r5ue" type="button" onClick={handleReset} className="btn-secondary">
            Reset Filters
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchFilters;
