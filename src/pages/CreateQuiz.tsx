import { useState, useRef } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { quiz, promptEnhancer } from '../utils/api';

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState('');
  const isSubmitting = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current || !prompt.trim()) return;

    isSubmitting.current = true;
    setIsLoading(true);
    setError('');

    try {
      const response = await quiz.generateQuestions(prompt);
      const { ids, topics, difficulties, companies } = response.data;
      if (ids?.length > 0) {
        navigate(
          `/quiz?ids=${ids.join(',')}&prompt=${prompt}&topic=${topics[0]}&difficulty=${difficulties[0]}&company=${companies[0]}`,
          { replace: true }
        );
      } else {
        setError('No questions were generated. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate quiz.');
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  const typeEffect = (fullText: string) => {
    let i = 0;
    const typingSpeed = 10; // ms
    setPrompt(''); // Clear first
  
    const interval = setInterval(() => {
      setPrompt(fullText.slice(0, i + 1)); // Take full slice up to i
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a New Quiz</h1>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              What kind of quiz would you like to create?
            </label>
            <div className="relative">
              <textarea
                id="prompt"
                rows={4}
                className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-all pr-10 ${
                  isEnhancing ? 'animate-pulse blur-sm' : ''
                }`}
                placeholder="e.g., '20 advanced Python MCQs' or 'Create a quiz about JavaScript promises'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isEnhancing}
                required
              />
              {/* Enhance Button positioned inside textarea */}
              <div className="absolute right-2 bottom-2">
                <button
                  type="button"
                  onClick={enhancePrompt}
                  disabled={isEnhancing || !prompt.trim()}
                  className={`flex items-center gap-1 px-2.5 py-1.5 bg-yellow-100 text-yellow-800 rounded-md
                    border border-yellow-200 hover:bg-yellow-200 transition-colors
                    ${isEnhancing || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : 'shadow-sm'}`}
                  title="Enhance prompt"
                >
                  {isEnhancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error and Submit Button remain the same */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isSubmitting.current}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Generating Quiz...
              </>
            ) : (
              'Generate Quiz'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}