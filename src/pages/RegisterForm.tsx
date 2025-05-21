import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { users, auth } from '../utils/api';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await users.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    auth.googleLogin();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Gradient panel — hidden on mobile */}
      <div
        className="hidden md:block md:w-1/2"
        style={{
          background:
            'linear-gradient(135deg, #FEF3C7 0%, #FDE8EC 30%, #C4B5FD 60%, #A78BFA 100%)',
        }}
      />

      {/* Form panel — full width on mobile, half on desktop */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center px-6 md:px-10 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          {/* Header + top link */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800">Create an account</h2>
            
          </div>

          {/* Name */}
          <input
            type="text"
            required
            placeholder="User name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

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
          

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 flex items-center space-x-1"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-xs select-none">
                {showConfirm ? 'Hide' : 'Show'}
              </span>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Use 8 or more characters with a mix of letters, numbers &amp; symbols
          </p>

          {/* Terms text */}
          <p className="text-xs text-gray-600">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-indigo-600 hover:underline">
              Terms of use
            </a>{' '}
            and{' '}
            <a href="#" className="text-indigo-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>

          {/* Error */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Creating Account…' : 'Create an account'}
          </button>

          {/* Bottom link */}
          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-indigo-600 hover:underline font-medium"
            >
              Log in
            </button>
          </p>
          <div className="flex items-center justify-between">
            <div className="w-full h-px bg-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="w-full h-px bg-gray-300"></div>
          </div>
          {/* Google OAuth Button */}
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
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
