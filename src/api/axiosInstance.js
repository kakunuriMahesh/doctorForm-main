import axios from "axios";

// Create an Axios instance
const axiosInstance = axios.create({
  // baseURL: "http://localhost:5000/api", // Base URL for your backend API
  baseURL:"https://doctor-backend-pay.onrender.com/api",
  timeout: 5000, // Request timeout in milliseconds
  headers: {
    "Content-Type": "application/json", // Default headers
  },
});

// Interceptors for request
axiosInstance.interceptors.request.use(
  (config) => {
    // Add authorization token or custom logic before sending the request
    const token = localStorage.getItem("authToken"); // Example: Retrieve token from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// Interceptors for response
axiosInstance.interceptors.response.use(
  (response) => response, // Return response data directly
  (error) => {
    // Handle response errors (e.g., logging out on 401 errors)
    if (error.response?.status === 401) {
      console.error("Unauthorized! Redirecting to login.");
      // Redirect logic here, e.g., window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
