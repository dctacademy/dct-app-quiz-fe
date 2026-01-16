import axios from 'axios';

// const API_URL = 'http://localhost:3040/api';
const API_URL = "https://dct-app-quiz.onrender.com/api"; 

const api = axios.create({
  baseURL: API_URL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.error('Access denied:', error.response.data.message);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getAllStudents: () => api.get('/auth/students'),
  getStudentPerformance: (studentId) => api.get(`/auth/students/${studentId}/performance`),
};

export const quizAPI = {
  createQuiz: (formData) => api.post('/quiz/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getQuizList: () => api.get('/quiz/list'),
  getMyQuizzes: (page = 1, limit = 10) => api.get(`/quiz/my-quizzes?page=${page}&limit=${limit}`),
  getQuizByCode: (code) => api.get(`/quiz/code/${code}`),
  getQuizSubmissions: (quizId) => api.get(`/quiz/${quizId}/submissions`),
  deleteQuiz: (quizId) => api.delete(`/quiz/${quizId}`),
  updateQuiz: (quizId, data) => api.put(`/quiz/${quizId}`, data),
  deleteQuestion: (quizId, questionIndex) => api.delete(`/quiz/${quizId}/questions/${questionIndex}`),
  updateQuestionCorrectAnswer: (quizId, questionId, correctAnswer) => api.patch(`/quiz/${quizId}/questions/${questionId}/correct-answer`, { correctAnswer }),
  shareResults: (quizId) => api.patch(`/quiz/${quizId}/share-results`),
  getQuizLeaderboard: (quizId) => api.get(`/quiz/${quizId}/leaderboard`),
  getOverallLeaderboard: () => api.get('/quiz/leaderboard/overall'),
  duplicateQuiz: (quizId, data) => api.post(`/quiz/${quizId}/duplicate`, data),
  getAllQuestions: (page = 1, limit = 15) => api.get(`/quiz/all-questions?page=${page}&limit=${limit}`),
  getQuestionBank: (params) => api.get(`/quiz/question-bank${params ? '?' + params : ''}`),
  generateCodeDistractors: (data) => api.post('/quiz/generate-code-distractors', data),
  getAllTags: () => api.get('/quiz/tags'),
};

export const submissionAPI = {
  submitQuiz: (data) => api.post('/submission', data),
  getSubmission: (quizId) => api.get(`/submission/quiz/${quizId}`),
  getMySubmissions: (page = 1, limit = 10) => api.get(`/submission/my-submissions?page=${page}&limit=${limit}`),
  flagQuestion: (data) => api.post('/submission/flag-question', data),
  getSubmissionFlags: (submissionId) => api.get(`/submission/submission/${submissionId}/flags`),
  getFlaggedQuestions: (params) => api.get(`/submission/flagged-questions${params ? '?' + params : ''}`),
  updateFlagStatus: (flagId, data) => api.patch(`/submission/flagged-questions/${flagId}`, data),
};

export const groupAPI = {
  createGroup: (data) => api.post('/group/create', data),
  getMyGroups: () => api.get('/group/my-groups'),
  getGroup: (groupId) => api.get(`/group/${groupId}`),
  addStudents: (groupId, studentIds) => api.post(`/group/${groupId}/add-students`, { studentIds }),
  removeStudent: (groupId, studentId) => api.delete(`/group/${groupId}/remove-student/${studentId}`),
  updateGroup: (groupId, data) => api.put(`/group/${groupId}`, data),
  deleteGroup: (groupId) => api.delete(`/group/${groupId}`),
};

export default api;
