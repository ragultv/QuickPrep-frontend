import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../utils/api';

interface LoginFormProps {
  onLogin?: () => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting login with:', { email: formData.email });
      const res = await auth.login(formData.email, formData.password);
      console.log('Login response:', res);

      if (res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('refresh_token', res.data.refresh_token);
        // Dispatch storage event to notify other components
        window.dispatchEvent(new Event('storage'));
        console.log('✅ Token saved to localStorage');
        onLogin?.();
        
        // Check for stored redirect path
        const redirectPath = localStorage.getItem('redirect_after_login');
        if (redirectPath) {
          localStorage.removeItem('redirect_after_login'); // Clear the stored path
          navigate(redirectPath, { replace: true });
        } else {
          // Redirect to the intended destination or home
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      } else {
        console.error('No access token in response:', res.data);
        setError('Invalid login response. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    auth.googleLogin();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left: Form panel */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center px-6 md:px-10 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          {/* Header + top link */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Log in</h2>
            
          </div>

          

          {/* Email */}
          <input
            type="email"
            required
            placeholder="Email address"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 flex items-center space-x-1"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-xs select-none">
                {showPassword ? 'Hide' : 'Show'}
              </span>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Use 8 or more characters with a mix of letters, numbers &amp; symbols
          </p>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-700">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-indigo-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Error */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>

          {/* Bottom link */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-indigo-600 hover:underline font-medium"
            >
              Sign up
            </button>
          </p>
          {/* <div className="flex items-center justify-between">
            <div className="w-full h-px bg-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="w-full h-px bg-gray-300"></div>
          </div>
          
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-full space-x-2 hover:bg-gray-50 transition"
          >
            <svg 
              width="18" 
              height="18" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 48 48"
              className="flex-shrink-0"
            >
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continue with Google</span>
          </button> */}
        </form>
      </div>

      {/* Right: Gradient panel — hidden on mobile */}
      <div
        className="hidden md:block md:w-1/2"
        style={{
          background:
            'linear-gradient(135deg, #FEF3C7 0%, #FDE8EC 30%, #C4B5FD 60%, #A78BFA 100%)',
        }}
      />
    </div>
  );
};

export default LoginForm;