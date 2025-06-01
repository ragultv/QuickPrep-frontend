import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, BrainCircuit, Check, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, resumeQuiz, promptEnhancer, quiz } from '../utils/api';
import SessionLimitMessage from '../components/SessionLimitMessage';

export default function UploadAndGenerateQuiz() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const isSubmitting = useRef(false);
  const navigate = useNavigate();
  const [sessionLimit, setSessionLimit] = useState<{
    limit_reached: boolean;
    reset_time: string;
  } | null>(null);

  useEffect(() => {
    const checkSessionLimit = async () => {
      try {
        const response = await quiz.checkResumeSessionLimit();
        setSessionLimit(response.data);
      } catch (err) {
        console.error("Failed to check session limit:", err);
      }
    };
    checkSessionLimit();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await resumeQuiz.uploadFile(formData);
      setResumeId(response.data.resume_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload resume.');
    } finally {
      setIsUploading(false);
    }
  };
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
  
      if (!token && refreshToken) {
        try {
          const response = await auth.refreshToken(refreshToken);
          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);
          console.log('✅ Token refreshed');
        } catch (err) {
          console.error('❌ Failed to refresh token', err);
          console.log('❌ Token expired, clearing localStorage');
          localStorage.clear();
          navigate('/login');
        }
      }
    };
    checkToken();
  }, [navigate]);

  const typeEffect = (fullText: string) => {
    let i = 0;
    const typingSpeed = 10;
    setPrompt('');
  
    const interval = setInterval(() => {
      setPrompt(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, typingSpeed);
  };

  const enhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    setError('');

    try {
      const response = await promptEnhancer.enhance(prompt);
      if (response.data.enhanced_prompt) {
        typeEffect(response.data.enhanced_prompt);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (isSubmitting.current || !resumeId || !prompt.trim()) return;
    isSubmitting.current = true;

    setIsGenerating(true);
    setError('');

    try {
      const response = await resumeQuiz.generateFromResume({
        resume_id: resumeId,
        user_prompt: prompt.trim()
      });

      if (response.data.session_id) {
        setIsCompleted(true);
      } else {
        setError('Failed to create quiz session.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate quiz. Please try again.');
    } finally {
      isSubmitting.current = false;
      setIsGenerating(false);
    }
  };

  const navigateHome = () => {
    setIsCompleted(false);
    setPrompt('');
    setFile(null);
    setResumeId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-3 text-center sm:text-left"></h1>
        <p className="text-gray-600 mb-8 text-center sm:text-left">
          Upload your resume and let AI create personalized questions
        </p>
        
        {isCompleted ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center animate-slideUp">
            <div className="mb-8">
              <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Quiz Created Successfully!</h2>
              
              <div className="flex justify-center space-x-1 mb-6">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Your personalized quiz has been generated based on your resume. You can find it in your session dashboard.
              </p>
              
              <button
                onClick={navigateHome}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
            </div>
            
            <div className="text-xs text-gray-400 italic mt-6">
              You can edit or share your quiz from the dashboard
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 transform hover:shadow-xl">
            {sessionLimit?.limit_reached && (
              <SessionLimitMessage resetTime={sessionLimit.reset_time} type="resume" />
            )}

            <div className={`space-y-6 ${sessionLimit?.limit_reached ? 'blur-sm pointer-events-none' : ''}`}>
              <div className="space-y-3">
                <div className="relative group">
                  <div></div>
                  
                  <div className="relative">
                    <label className="block text-base font-medium text-gray-800 mb-2">
                      Upload Your Resume
                    </label>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
                        disabled={sessionLimit?.limit_reached}
                      />
                      {file && (
                        <span className="text-sm text-gray-500 truncate">
                          {file.name}
                        </span>
                      )}
                    </div>
                    
                    {isUploading && (
                      <div className="mt-3 flex items-center text-sm text-indigo-600">
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Processing Resume...
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-base font-medium text-gray-800">
                      What kind of questions would you like?
                    </label>
                    <div className="text-xs text-gray-500">{prompt.length} chars</div>
                  </div>
                  
                  <div className="relative group">
                    <div ></div>
                    
                    <div className="relative">
                      <textarea
                        rows={5}
                        className={`w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 pr-12 resize-none ${
                          isEnhancing ? 'bg-indigo-50 animate-pulse' : ''
                        }`}
                        placeholder="e.g., 'Create 10 technical MCQs based on my experience' or 'Generate interview questions about my skills'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isEnhancing || !resumeId}
                        required
                      />
                      
                      <div className="absolute right-3 bottom-3">
                        <button
                          type="button"
                          onClick={enhancePrompt}
                          disabled={isEnhancing || !prompt.trim() || !resumeId}
                          className={`flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md
                            border border-indigo-100 hover:bg-indigo-100 transition-all duration-200
                            ${isEnhancing || !prompt.trim() || !resumeId ? 'opacity-50 cursor-not-allowed' : 'shadow-sm hover:shadow'}`}
                          title="Enhance prompt with AI"
                        >
                          {isEnhancing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-xs font-medium">Enhancing...</span>
                            </>
                          ) : (
                            <>
                              <BrainCircuit className="h-4 w-4" />
                              <span className="text-xs font-medium">Enhance</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 italic">
                    Describe the type of questions you want based on your resume. Use AI enhancement for better results.
                  </p>
                </div>

                {error && (
                  <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100 animate-appear">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerateQuiz}
                  disabled={isGenerating || !resumeId || !prompt.trim()}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow transform hover:-translate-y-0.5"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                      Generating Quiz...
                    </>
                  ) : (
                    'Generate Quiz'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

