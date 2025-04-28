export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string ; // Ensure correctAnswer can be a string or number
  explanation?: string; // Optional explanation
}

export interface Quiz {
  id: number;
  title: string;
  questions: Question[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  quizzesTaken: number;
  topSubjects: string[];
  averageScore: number;
}