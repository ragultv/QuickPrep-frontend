import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { users } from '../utils/api';

export default function UpdateProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await users.getMe();
        setName(res.data.name);
        setEmail(res.data.email);
      } catch (err) {
        console.error(err);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await users.updateProfile({ name, email });
      navigate('/settings', { state: { message: 'Profile updated successfully!' } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
      setIsLoading(false);
    }
  };

  if (isLoading && !name) return <div className="text-center py-20">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 sm:p-8">
        <div className="mb-6 flex items-center">
          <Link to="/settings" className="flex items-center text-gray-600 hover:text-indigo-600">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back 
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Update Your Profile</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Your name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Your email"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {isLoading ? (
              'Updating...'
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}