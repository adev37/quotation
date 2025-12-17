// src/utils/axiosInstance.js
import axios from "axios";

// Same base selection as RTK Query (keeps Axios helpers consistent)
const fromEnv = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
const onVercelUI =
  typeof window !== "undefined" &&
  /vercel\.app$/i.test(window.location.hostname);

const BASE_URL =
  fromEnv ||
  (onVercelUI ? "https://inventoryapp-api.vercel.app/api" : "/api");

const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
