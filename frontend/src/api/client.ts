import axios from "axios";

const client = axios.create({
  baseURL: "/api"
});

// Add JWT token to requests if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
