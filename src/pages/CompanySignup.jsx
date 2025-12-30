import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, User, Mail, Lock, Building2, MapPin, FileText, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MessageNotification from '../components/ui/MessageNotification';
import ImageUploader from '../utils/ImageUploader';

const baseUrl = import.meta.env.VITE_API_URL;

const CompanySignup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgname, setOrgname] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');

  const showMsg = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showMsg('Passwords do not match', 'error');
      return;
    }

    if (!username || !email || !password || !orgname) {
      showMsg('Please fill in all required fields', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/organization/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          orgname,
          address,
          description,
          photo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showMsg('Company registered successfully! Redirecting...', 'success');
        
        // Auto-login
        localStorage.setItem("authToken", data.token);
        
        // Redirect to org dashboard
        setTimeout(() => {
          navigate(`/org-dashboard/${data.organization_id}`);
        }, 1500);
      } else {
        showMsg(data.error || 'Registration failed', 'error');
      }
    } catch (error) {
      showMsg('Server error during registration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 py-12 px-4">
      {/* Back button */}
      <div className="absolute top-6 left-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-10 h-10 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200 hover:bg-white transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Register Your Company
            </h1>
            <p className="text-gray-600">
              Create your organization account to start hiring
            </p>
          </div>

          {message && <MessageNotification message={message} type={messageType} onClose={() => setMessage('')} />}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Account Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Choose a username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="company@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Details Section */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Organization Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={orgname}
                    onChange={(e) => setOrgname(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Your company name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Company address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about your company..."
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <ImageUploader
                  onUploadSuccess={(url) => setPhoto(url)}
                />
                {photo && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={photo} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" />
                    <span className="text-sm text-green-600">✓ Logo uploaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Registering...' : 'Register Company'}
            </button>

            {/* Login link */}
            <p className="text-center text-gray-600 text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Sign in
              </button>
            </p>

            {/* User signup link */}
            <p className="text-center text-gray-500 text-sm">
              Looking for a job? {' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up as a candidate
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanySignup;
