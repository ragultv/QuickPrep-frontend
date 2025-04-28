import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resumeQuiz } from '../utils/api';

export default function UploadAndGenerateQuiz() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const isSubmitting = useRef(false);

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

  const handleGenerateQuiz = async () => {
    if (isSubmitting.current || !resumeId || !prompt.trim()) return;
    isSubmitting.current = true;

    setIsGenerating(true);
    setError('');

    try {
      const response = await resumeQuiz.generateFromResume({
        resume_id: resumeId,
        user_prompt: prompt
      });

      const { ids, prompt: usedPrompt } = response.data;

      if (ids?.length > 0) {
        navigate(
          `/quiz?ids=${ids.join(',')}&prompt=${usedPrompt}&topic=Resume&difficulty=Medium&company=Unknown`,
          { replace: true }
        );
      } else {
        setError('No questions generated from resume.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate quiz from resume.');
    } finally {
      isSubmitting.current = false;
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Upload Resume & Generate Quiz</h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        {/* Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume (PDF/DOC)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="block w-full border border-gray-300 rounded-lg"
            title="Upload your resume file"
            placeholder="Choose a file"
          />
          {isUploading && (
            <div className="text-indigo-600 text-sm mt-2 flex items-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Uploading & Parsing Resume...
            </div>
          )}
        </div>

        {/* Prompt Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Generate 10 Python MCQs based on my resume"
            className="w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!resumeId}
          />
        </div>

        {/* Button */}
        <button
          onClick={handleGenerateQuiz}
          disabled={isGenerating || !resumeId || !prompt.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Generating Quiz...
            </span>
          ) : (
            'Generate Quiz'
          )}
        </button>

        {/* Error */}
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>
    </div>
  );
}