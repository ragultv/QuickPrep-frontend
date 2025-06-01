import axios from 'axios';

// Create an Axios instance with a base URL from environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
});

// Add a request interceptor to attach the token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await auth.refreshToken(refreshToken);
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
          window.dispatchEvent(new Event('storage'));

          // Update the authorization header and retry the original request
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh token fails, clear everything and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('storage'));
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    // For any other error or if refresh token is not available
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.dispatchEvent(new Event('storage'));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('Auth response:', response);
    return response;
  },
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    // console.log('Refresh token response:', response); 
    return response;
  },
  googleLogin: () => {
    window.location.href = `${api.defaults.baseURL}/auth/google/login`;
  },
};

// User endpoints
export const users = {
  register: (data: { name: string; email: string; password: string }) => api.post('/users/register', data),
  usernameAvailable: (username: string) =>api.get(`/users/check-username`, { params: { username } }),
  sendOtp: (email: string) => api.post('/users/send-otp', { email }),
  verifyOtp: (data: { email: string; otp: string }) => api.post('/users/verify-otp', data),
  getMe: () => api.get('/users/me'),
  getUserById: (userId: string) => api.get(`/users/${userId}`),
  updateProfile: (data: { name: string; email: string }) => api.patch('/users/update', data),
  changePassword: (data: { old_password: string; new_password: string }) => api.post('/users/change-password', data),
};

// Quiz endpoints
export const quiz = {
  generateQuestions: (prompt: string) => api.post('/questions/generate/', { prompt }),
  getQuestions: (ids: string) => api.get(`/questions/${ids}`),
  createSession: (data: { question_ids: string[]; prompt?: string; topic?: string; difficulty?: string; company?: string }) => api.post('/quiz-sessions/create', data),
  createHostSession: (data: { 
    prompt: string;
    topic: string;
    difficulty: string;
    company: string;
    question_ids: string[];
    total_duration: number;
    title: string;
    total_spots: number;
  }) => api.post('/quiz-sessions/create-hosted', data),
  submitAnswers: (data: { quiz_session_id: string; answers: Array<{ question_id: string; selected_option: string }> }) => api.post('/answers/submit', data),
  getResults: (sessionId: string) => api.get(`/quiz-results/${sessionId}`),
  cancelGeneration: (sessionId: string) => api.post(`/questions/cancel-generation/${sessionId}`),
  getSessions: () => api.get('/quiz-sessions'),
  showSessions:()=>api.get('/quiz-sessions/'),
  getSession: (sessionId: string) => api.get(`/quiz-sessions/${sessionId}`),
  startSession: (sessionId: string) => api.post(`/quiz-sessions/${sessionId}/start`),
  getHostedSession: (sessionId: string) =>
    api.get(`/quiz-sessions/hosted/${sessionId}`),
  joinHostedSession: (sessionId: string) =>
    api.post(`/quiz-sessions/hosted/${sessionId}/join`),
  getHostedSessions: () => api.get('/quiz-sessions/hosted'),
  getSessionDetails: (sessionId: string) => 
    api.get(`/quiz-sessions/${sessionId}/details`),
  getHostedSessionIsLive: (sessionId: string) =>
    api.get(`/quiz-sessions/hosted/${sessionId}/is-live`),
  startHostedSession: (hostedQuizSessionId: string) =>
    api.post(`/quiz-sessions/hosted-quiz-sessions/${hostedQuizSessionId}/start`),
  submitHostedAnswers: (data: { quiz_session_id: string; answers: Array<{ question_id: string; selected_option: string }> }) =>
    api.post('/answers/submit-hosted', data),
  startUserHostedSession: (userHostedQuizSessionId: string) =>
    api.post(`/quiz-sessions/user-hosted-quiz-sessions/${userHostedQuizSessionId}/start`),
  checkSessionLimit: async () => {
    const response = await api.get('/questions/check-session-limit', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response;
  },
  checkResumeSessionLimit: async () => {
    const response = await api.get('/quiz-resume/check-session-limit', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response;
  },
};

// User stats endpoints
export const userStats = {
  getRecentSessions: () => api.get('/user_stats/recent_sessions'),
  getMyStats: () => api.get('/user_stats/my_stats'),
  getHistory: () => api.get('/user_stats/history'),
  getUserStats: (userId: string) => api.get(`/user_stats/${userId}/stats`),
  getSessionsByDate: () => api.get('/quiz-sessions/sessions-by-date'),
  getNoOfSessionsToday: () => api.get('/quiz-sessions/no-of-sessions-today'),
};

// Resume quiz endpoints
export const resumeQuiz = {
  uploadFile: (formData: FormData) => api.post('/quiz-resume/upload-file', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  generateFromResume: (data: { resume_id: string; user_prompt: string }) => api.post('/quiz-resume/generate-from-resume', data),
};

// Prompt enhancer endpoint
export const promptEnhancer = {
  enhance: (prompt: string) => api.post('/prompt_enhancer', { prompt }),
};

export default api; 