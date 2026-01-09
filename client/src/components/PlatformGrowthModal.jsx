import React from "react";

const PlatformGrowthModal = ({ isOpen, onClose }) => {
  // Static platform growth data
  const platformGrowthData = [
    { platform: 'Instagram', growth: 68, color: '#E4405F' },
    { platform: 'YouTube', growth: 42, color: '#FF0000' },
    { platform: 'TikTok', growth: 35, color: '#000000' },
    { platform: 'Facebook', growth: 28, color: '#1877F2' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Platform Growth Analytics
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Platform Performance by Growth Rate</h4>
          <div className="space-y-4">
            {platformGrowthData.map((platform, index) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{platform.platform}</div>
                  <div className="text-sm text-gray-500">Growth Rate</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{platform.growth}%</div>
                    <div className="text-sm text-gray-500">
                      {index === 0 ? 'Top Performer' :
                       index === 1 ? 'High Growth' :
                       index === 2 ? 'Growing' : 'Moderate'}
                    </div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${platform.growth}%`,
                        backgroundColor: platform.color
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-pink-50 to-red-50 p-4 rounded-lg">
              <div className="mb-2">
                <h5 className="font-medium text-gray-900">Instagram Leader</h5>
              </div>
              <p className="text-sm text-gray-600">
                Instagram shows the highest growth rate at 68%, making it the top performing platform for audience engagement and content reach.
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
              <div className="mb-2">
                <h5 className="font-medium text-gray-900">Growth Insights</h5>
              </div>
              <p className="text-sm text-gray-600">
                Visual platforms dominate growth metrics, with Instagram leading at 68% followed by YouTube at 42%.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlatformGrowthModal;
