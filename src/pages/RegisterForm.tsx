import { useState, useEffect, useRef } from 'react';
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
  const [usernameStatus, setUsernameStatus] = useState<'available' | 'unavailable' | 'checking' | 'invalid' | null>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validateUsername = (username: string) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{5,}$/;
    return regex.test(username);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Check username availability
  useEffect(() => {
    if (formData.name.trim().length < 3) {
      setUsernameStatus(null);
      return;
    }
    if (!validateUsername(formData.name)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await users.usernameAvailable(formData.name);
        setUsernameStatus(res.data.available ? 'available' : 'unavailable');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
  }, [formData.name]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic required fields
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    // Password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Username validity
    if (!validateUsername(formData.name)) {
      setError('Username must be at least 5 characters, contain letters and numbers, and have no spaces');
      return;
    }

    if (usernameStatus === 'unavailable') {
      setError('Username is already taken');
      return;
    }

    // Email verification
    if (!emailVerified) {
      setError('Please verify your email before registering');
      return;
    }

    setIsLoading(true);
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

  const handleGoogleLogin = () => auth.googleLogin();

  const handleSendVerificationEmail = async () => {
    setError('');
    if (!formData.email || !validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    setIsVerifyingEmail(true);
    try {
      await users.sendOtp(formData.email); // your API call
      setShowEmailVerification(true);
    } catch (error: any) {
      if (error.response && error.response.status === 409) {
        setError('Email already registered');
      } else {
        setError('Failed to send verification email');
      }
    } finally {
      setIsVerifyingEmail(false);
    }

  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmail = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setIsVerifyingEmail(true);
    try {
      await users.verifyOtp({ email: formData.email, otp: code });
      setEmailVerified(true);
      setShowEmailVerification(false);
      setError('');
    } catch {
      setError('Invalid verification code');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div
        className="hidden md:block md:w-1/2"
        style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE8EC 30%, #C4B5FD 60%, #A78BFA 100%)' }}
      />
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center px-6 md:px-10 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center">Create an account</h2>

          <div className="relative">
            <input
              type="text"
              required
              placeholder="User name"
              value={formData.name}
              onChange={handleUsernameChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {usernameStatus === 'checking' && <p className="mt-1 text-xs text-gray-400">Checking username...</p>}
            {usernameStatus === 'unavailable' && <p className="mt-1 text-xs text-red-500">Username is already taken</p>}
            {usernameStatus === 'available' && <p className="mt-1 text-xs text-green-600">Username is available</p>}
            {usernameStatus === 'invalid' && (
              <p className="mt-1 text-xs text-yellow-600">
                Username must be at least 5 characters, contain letters and numbers, and have no spaces.
              </p>
            )}
          </div>

          <div className="relative">
            <input
              type="email"
              required
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {!emailVerified && (
              <button
                type="button"
                onClick={handleSendVerificationEmail}
                disabled={isVerifyingEmail}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {isVerifyingEmail ? 'Sending...' : 'Verify Email'}
              </button>
            )}
            {emailVerified && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          {showEmailVerification && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-800">Verify Your Email</h3>
                <p className="mb-4 text-sm text-gray-600">We've sent a 6-digit code to {formData.email}</p>
                <div className="mb-4 flex gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-12 w-12 rounded-lg border border-gray-300 p-0 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailVerification(false);
                      setOtp(['', '', '', '', '', '']);
                    }}
                    className="flex-1 rounded-lg border border-gray-300 py-2 px-4 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={isVerifyingEmail || otp.join('').length !== 6}
                    className="flex-1 rounded-lg bg-indigo-600 py-2 px-4 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isVerifyingEmail ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-gray-500"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-xs">{showPassword ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-gray-500"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-xs">{showConfirm ? 'Hide' : 'Show'}</span>
            </button>
          </div>
          <p className="text-xs text-gray-500">Use 8 or more characters with a mix of letters, numbers & symbols</p>

          <p className="text-xs text-gray-600">
            By creating an account, you agree to our <a href="#" className="text-indigo-600 hover:underline">Terms of use</a> and <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>.
          </p>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-indigo-600 py-2 px-4 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating Account…' : 'Create an account'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/login')} className="text-indigo-600 hover:underline font-medium">
              Log in
            </button>
          </p>

          <div className="flex items-center justify-between">
            <div className="h-px w-full bg-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="h-px w-full bg-gray-300"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-2 rounded-full border border-gray-300 py-2 px-4 hover:bg-gray-50 transition"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
