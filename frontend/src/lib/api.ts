import axios from 'axios';

const isDevelopment = import.meta.env.DEV;
const baseURL = isDevelopment 
  ? 'http://localhost:5000' 
  : 'https://quicksend-backend-service-627959729856.us-central1.run.app';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  async (config) => {
    // Get the current user's ID token
    const user = (window as any).firebase?.auth()?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api; 