/**
 * Utility functions untuk pagination
 */

/**
 * Membuat response pagination yang konsisten
 * @param {Array} data - Array data hasil query
 * @param {number} page - Halaman saat ini
 * @param {number} limit - Jumlah item per halaman
 * @param {number} total - Total jumlah data keseluruhan
 * @returns {Object} Response dengan data dan metadata pagination
 */
export const createPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    }
  };
};

/**
 * Validasi dan normalisasi parameter pagination
 * @param {Object} query - Query parameters dari request
 * @returns {Object} Parameter pagination yang sudah divalidasi
 */
export const validatePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

/**
 * Membuat metadata pagination untuk response
 * @param {number} page - Halaman saat ini
 * @param {number} limit - Jumlah item per halaman
 * @param {number} total - Total jumlah data
 * @returns {Object} Metadata pagination
 */
export const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
};