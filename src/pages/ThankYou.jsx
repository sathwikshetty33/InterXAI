import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, Award, Star } from 'lucide-react';

const ThankYou = () => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000);

    // Hide confetti after 3 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(confettiTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Simple confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 5)]
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-2xl w-full text-center">
        {/* Success Icon */}
        <div className="mb-8 relative inline-block">
          <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-30 animate-pulse" />
          <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-full shadow-2xl">
            <CheckCircle className="w-20 h-20 text-white" />
          </div>
        </div>

        {/* Thank You Message */}
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent mb-4">
          Thank You!
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
          Interview Completed Successfully
        </h2>
        
        <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
          We appreciate you taking the time to complete this interview. 
          Your responses have been recorded and the hiring team will review them shortly.
        </p>

        {/* Stats/Info Cards */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-purple-100 flex items-center gap-3">
            <Award className="w-8 h-8 text-purple-500" />
            <div className="text-left">
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold text-gray-800">Submitted</p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-blue-100 flex items-center gap-3">
            <Star className="w-8 h-8 text-blue-500" />
            <div className="text-left">
              <p className="text-sm text-gray-500">Next Step</p>
              <p className="font-semibold text-gray-800">Await Results</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
          </button>
        </div>

        <p className="text-sm text-gray-400 mt-8">
          You will be automatically redirected in 10 seconds...
        </p>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes fall {
          from {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
};

export default ThankYou;
