/* ════════════════════════════════════════════════════════════════════════════════
 API COMMUNICATION - api.js
 
 PURPOSE:
 - Handle all HTTP requests to Node.js backend
 - Centralized API calls for all endpoints
 - Error handling and response management
 ════════════════════════════════════════════════════════════════════════════════ */

const API_URL = "http://localhost:3000/api";
const API_TIMEOUT = 10000; // 10 seconds

/**
 * Generic fetch wrapper with error handling
 */
async function apiCall(endpoint, method = "GET", data = null) {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : ""
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    const result = await response.json();
    hideLoading(true);
    return result;
  } catch (error) {
    console.error("API Error:", error);
    hideLoading(false);
    toast("خطأ في الاتصال: " + error.message, "error");
    throw error;
  }
}

/**
 * Authentication API
 */
async function loginUser(username, password) {
  return await apiCall("/auth/login", "POST", { username, password });
}

async function signupUser(name, username, password) {
  return await apiCall("/auth/signup", "POST", { name, username, password });
}

/**
 * Families API
 */
async function getFamilies(zone = null, search = null) {
  let endpoint = "/families";
  const params = new URLSearchParams();
  if (zone && zone !== "all") params.append("zone", zone);
  if (search) params.append("q", search);
  if (params.toString()) endpoint += "?" + params.toString();
  return await apiCall(endpoint);
}

async function createFamily(data) {
  return await apiCall("/families", "POST", data);
}

async function updateFamily(id, data) {
  return await apiCall(`/families/${id}`, "PUT", data);
}

async function deleteFamily(id) {
  return await apiCall(`/families/${id}`, "DELETE");
}

/**
 * Medicines API
 */
async function getMedicines() {
  return await apiCall("/medicines");
}

async function createMedicine(data) {
  return await apiCall("/medicines", "POST", data);
}

async function updateMedicine(id, data) {
  return await apiCall(`/medicines/${id}`, "PUT", data);
}

async function deleteMedicine(id) {
  return await apiCall(`/medicines/${id}`, "DELETE");
}

/**
 * Distributions API
 */
async function getDistributions(month = null) {
  let endpoint = "/distributions";
  if (month) endpoint = `/distributions/monthly/${month}`;
  return await apiCall(endpoint);
}

async function createDistribution(data) {
  return await apiCall("/distributions", "POST", data);
}

async function updateDistribution(id, data) {
  return await apiCall(`/distributions/${id}`, "PUT", data);
}

async function deleteDistribution(id) {
  return await apiCall(`/distributions/${id}`, "DELETE");
}

/**
 * Pharmacies API
 */
async function getPharmacies() {
  return await apiCall("/pharmacies");
}

async function getPharmacyById(id) {
  return await apiCall(`/pharmacies/${id}`);
}

async function createPharmacy(data) {
  return await apiCall("/pharmacies", "POST", data);
}

async function updatePharmacy(id, data) {
  return await apiCall(`/pharmacies/${id}`, "PUT", data);
}

async function deletePharmacy(id) {
  return await apiCall(`/pharmacies/${id}`, "DELETE");
}

/**
 * Statistics API
 */
async function getStats() {
  return await apiCall("/stats/dashboard");
}

async function getStatsMonthly(month) {
  return await apiCall(`/stats/monthly/${month}`);
}

async function getStatsZone(zone) {
  return await apiCall(`/stats/zone/${zone}`);
}
