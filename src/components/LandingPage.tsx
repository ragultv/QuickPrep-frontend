import React, { useState, useEffect } from 'react';
import { Menu, X, BookOpen, LayoutDashboard, Check, BarChart2, FileText, Users, Zap, Settings, Sparkles, Mail, Phone, MapPin, Twitter, Facebook, Linkedin } from 'lucide-react';

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const useCases = [
    'Job Interview Prep',
    'Candidate Screening',
    'Class or Group Tests',
    'Skill-Based Practice'
  ];

  const features = [
    {
      icon: <Sparkles className="h-10 w-10 text-indigo-500" />,
      title: 'AI-Powered Generation',
      description: 'Generate quiz questions from any topic instantly with our advanced AI.'
    },
    {
      icon: <FileText className="h-10 w-10 text-indigo-500" />,
      title: 'Resume-Based Quizzes',
      description: 'Create personalized interview prep quizzes from your resume.'
    },
    {
      icon: <Users className="h-10 w-10 text-indigo-500" />,
      title: 'Collaborative Learning',
      description: 'Share quizzes with peers and track group progress.'
    },
    {
      icon: <Zap className="h-10 w-10 text-indigo-500" />,
      title: 'Instant Feedback',
      description: 'Get immediate results and detailed performance analysis.'
    },
    {
      icon: <Settings className="h-10 w-10 text-indigo-500" />,
      title: 'Customizable Templates',
      description: 'Create and save templates for different quiz types.'
    },
    {
      icon: <BarChart2 className="h-10 w-10 text-indigo-500" />,
      title: 'Progress Tracking',
      description: 'Monitor improvement with comprehensive analytics.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-indigo-300 rounded-full opacity-40 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-20">
        {/* Header */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'bg-white/90 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'
        }`}>
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center group">
                <div className="relative">
                  <LayoutDashboard className="h-8 w-8 text-indigo-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <div className="absolute inset-0 bg-indigo-400 opacity-0 blur-lg group-hover:opacity-30 transition-opacity duration-300 rounded-full"></div>
                </div>
                <span className="ml-3 text-2xl font-bold text-gray-900">
                  Quick<span className="text-indigo-600">PREP</span>
                </span>
              </div>
              
              <nav className="hidden md:flex space-x-8">
                {['Home', 'About', 'Features', 'Contact'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="relative text-gray-700 hover:text-indigo-600 transition-all duration-300 group font-medium"
                  >
                    {item}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300"></span>
                  </a>
                ))}
              </nav>
              
              <button className="hidden md:block relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/25 group">
                <span className="relative z-10">Sign in</span>
                <div className="absolute inset-0 bg-indigo-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </button>
              
              <button 
                className="md:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 hover:scale-110"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>
                  {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </div>
              </button>
            </div>
          </div>
          
          {isMenuOpen && (
            <div className="md:hidden bg-white/95 backdrop-blur-md shadow-xl absolute top-full left-0 right-0 p-6 flex flex-col space-y-6 animate-slideDown border-t border-gray-200">
              {['Home', 'About', 'Features', 'Contact'].map((item, index) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-gray-700 hover:text-indigo-600 transition-all duration-300 hover:translate-x-2 animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-300 self-start hover:scale-105 animate-fadeIn"
                      style={{ animationDelay: '200ms' }}>
                Sign in
              </button>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <section id="home" className="pt-32 pb-20 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-6xl mx-auto">
              <div className="inline-block bg-indigo-100 border border-indigo-200 text-indigo-700 text-sm font-medium px-8 py-3 rounded-full mb-12 animate-fadeIn hover:scale-105 hover:bg-indigo-200 transition-all duration-300">
                ✨ AI-Powered Quiz Platform
              </div>
              
              <h1 className="text-6xl md:text-8xl font-bold mb-8 animate-slideUp">
                <span className="text-gray-900 hover:text-indigo-600 transition-colors duration-500">
                  Welcome
                </span>
                <span className="text-indigo-600 animate-pulse">.</span>
              </h1>
              
              <p className="text-2xl md:text-4xl text-gray-700 mb-16 animate-slideUp animation-delay-200">
                The <span className="text-indigo-600 font-semibold relative">
                  smarter way
                  <div className="absolute -bottom-1 left-0 right-0 h-1 bg-indigo-200 animate-pulse"></div>
                </span> to prepare for your next role.
              </p>
              
              <button className="relative group bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 px-12 rounded-full text-xl transition-all duration-500 animate-fadeIn animation-delay-400 hover:scale-110 hover:shadow-2xl hover:shadow-indigo-500/30">
                <span className="relative z-10">Start Creating Now</span>
                <div className="absolute inset-0 bg-indigo-700 rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                <div className="absolute -inset-1 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-ping"></div>
              </button>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-indigo-200 rounded-full opacity-40 animate-bounce animation-delay-1000"></div>
          <div className="absolute bottom-20 right-10 w-16 h-16 bg-purple-200 rounded-full opacity-40 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 left-5 w-12 h-12 bg-blue-200 rounded-full opacity-40 animate-spin-slow"></div>
          <div className="absolute top-1/3 right-20 w-8 h-8 bg-indigo-300 rounded-full opacity-50 animate-bounce animation-delay-3000"></div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/50 to-transparent"></div>
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-5xl font-bold mb-8 text-center animate-fadeIn text-gray-900 hover:text-indigo-600 transition-colors duration-500">
                About QuickPREP
              </h2>
              
              <div className="bg-white/80 backdrop-blur-lg border border-gray-200 rounded-3xl p-8 md:p-12 mb-12 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 animate-fadeIn animation-delay-200 group">
                <p className="text-2xl text-gray-800 mb-8 leading-relaxed group-hover:text-gray-900 transition-colors duration-300">
                  QuickPREP is your <span className="text-indigo-600 font-semibold relative">
                    smart quiz assistant
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-300 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  </span>, powered by AI.
                </p>
                
                <p className="text-lg text-gray-600 mb-12 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                  We're building a future where preparation and evaluation are faster, smarter, and deeply
                  personalized. Whether you're a job seeker prepping for interviews, an educator building
                  assessments, or a recruiter shortlisting candidates — QuickPREP does the heavy lifting.
                </p>
                
                <div className="bg-indigo-50 border-l-4 border-indigo-600 p-8 rounded-r-2xl mb-12 hover:bg-indigo-100 transition-colors duration-300">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission:</h3>
                  <p className="text-xl text-gray-800 italic leading-relaxed">
                    To simplify learning and evaluation by making intelligent quiz generation available to
                    everyone — instantly.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-8">Use Cases:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {useCases.map((useCase, index) => (
                      <div key={index} className="flex items-center space-x-4 bg-gray-50 rounded-xl p-4 hover:bg-indigo-50 hover:scale-105 transition-all duration-300 group animate-fadeIn"
                           style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <Check className="h-8 w-8 text-green-500 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-green-400 opacity-0 rounded-full blur-md group-hover:opacity-30 transition-opacity duration-300"></div>
                          </div>
                        </div>
                        <span className="text-lg text-gray-700 group-hover:text-indigo-700 transition-colors duration-300">{useCase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-5xl font-bold mb-8 animate-fadeIn text-gray-900 hover:text-indigo-600 transition-colors duration-500">
                Discover Our Features
              </h2>
              <p className="text-xl text-gray-600 animate-fadeIn animation-delay-200">
                Everything you need to create, manage, and analyze quizzes effectively.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl p-8 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:scale-105 animate-fadeIn"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-50 transition-opacity duration-500 rounded-2xl"></div>
                  
                  <div className="mb-6 p-4 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 group-hover:scale-110 transition-all duration-300 w-fit">
                    {feature.icon}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                    {feature.description}
                  </p>
                  
                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-indigo-600 group-hover:w-full transition-all duration-500 rounded-b-2xl"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden bg-indigo-600">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full transform translate-x-1/2 translate-y-1/2 animate-bounce"></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-spin-slow"></div>
          </div>
          
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-bold mb-8 animate-fadeIn text-white">
                Ready to transform
                <br />
                <span className="text-indigo-200">your quiz experience?</span>
              </h2>
              
              <p className="text-xl text-indigo-100 mb-12 animate-fadeIn animation-delay-200">
                Join thousands of users who are already using QuickPREP to create better quizzes, faster.
              </p>
              
              <button className="relative group bg-white text-indigo-600 hover:bg-indigo-50 font-semibold py-6 px-12 rounded-full text-xl transition-all duration-500 animate-fadeIn animation-delay-400 hover:scale-110 hover:shadow-2xl">
                <span className="relative z-10">Try QuickPREP FREE</span>
                <div className="absolute inset-0 bg-indigo-100 rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                <div className="absolute -inset-1 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-ping"></div>
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="bg-gray-900 backdrop-blur-lg pt-16 pb-8 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
              <div>
                <div className="flex items-center mb-6 group">
                  <LayoutDashboard className="h-8 w-8 text-indigo-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                  <span className="ml-3 text-2xl font-bold">
                    <span className="text-white">Quick</span>
                    <span className="text-indigo-400">PREP</span>
                  </span>
                </div>
                
                <p className="text-gray-400 mb-8 leading-relaxed hover:text-gray-300 transition-colors duration-300">
                  The smarter way to prepare and assess. Powered by AI.
                </p>
                
                <div className="flex space-x-6">
                  <a href="#" className="text-gray-400 hover:text-white p-3 bg-gray-800 rounded-full hover:bg-indigo-600 transition-all duration-300 hover:scale-110">
                    <Linkedin size={20} />
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-6 text-white">
                  Quick Links
                </h3>
                <ul className="space-y-4">
                  {['Home', 'About Us', 'Features', 'Contact'].map((item, index) => (
                    <li key={item}>
                      <a href={`#${item.toLowerCase().replace(' ', '')}`} 
                         className="text-gray-400 hover:text-white hover:translate-x-2 transition-all duration-300 inline-block animate-fadeIn"
                         style={{ animationDelay: `${index * 100}ms` }}>
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-6 text-white">
                  Contact Us
                </h3>
                <ul className="space-y-6">
                  <li className="flex items-center space-x-4 group animate-fadeIn">
                    <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-500 group-hover:scale-110 transition-all duration-300">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gray-400 group-hover:text-white transition-colors duration-300">quickprepai@gmail.com</span>
                  </li>
                  <li className="flex items-center space-x-4 group animate-fadeIn animation-delay-100">
                    <div className="p-2 bg-green-600 rounded-lg group-hover:bg-green-500 group-hover:scale-110 transition-all duration-300">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gray-400 group-hover:text-white transition-colors duration-300">+91 8838868452</span>
                  </li>
                  <li className="flex items-center space-x-4 group animate-fadeIn animation-delay-200">
                    <div className="p-2 bg-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:scale-110 transition-all duration-300">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gray-400 group-hover:text-white transition-colors duration-300">Pinnacle Solutions, Saravanampatti, Coimbatore.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 pt-8 text-center">
              <p className="text-gray-500 text-sm">
                © 2025 QuickPREP. All rights reserved.
                <a href="#" className="text-gray-400 hover:text-white ml-4 transition-colors duration-300">Privacy Policy</a>
                <span className="mx-2">|</span>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Terms of Service</a>
              </p>
            </div>
          </div>
        </footer>
      </div>

      <style >{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }

        .animate-slideUp {
          animation: slideUp 1s ease-out forwards;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }

        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3000 { animation-delay: 3s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}

export default LandingPage;