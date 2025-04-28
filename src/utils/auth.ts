import { useNavigate } from 'react-router-dom';

export const logout = () => {
  // Clear all auth-related data
  localStorage.removeItem('access_token');
  
  // Redirect to login page
  window.location.href = '/login';
}; 