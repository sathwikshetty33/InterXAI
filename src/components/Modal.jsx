import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, ArrowRight } from 'lucide-react';

/**
 * Reusable Modal Component for Interview Pages
 * Types: success, warning, info, error
 */
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  showCloseButton = true,
  autoCloseDelay = null,
  onConfirm = null,
  confirmText = 'Continue',
  cancelText = 'Close'
}) => {
  // Auto-close after delay if specified
  useEffect(() => {
    if (isOpen && autoCloseDelay) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  // Icon and colors based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-500" />,
          bgGradient: 'from-green-50 to-emerald-50',
          borderColor: 'border-green-200',
          buttonColor: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
          bgGradient: 'from-yellow-50 to-amber-50',
          borderColor: 'border-yellow-200',
          buttonColor: 'from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-500" />,
          bgGradient: 'from-red-50 to-rose-50',
          borderColor: 'border-red-200',
          buttonColor: 'from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-12 h-12 text-purple-500" />,
          bgGradient: 'from-purple-50 to-lavender-50',
          borderColor: 'border-purple-200',
          buttonColor: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={showCloseButton ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className={`relative bg-gradient-to-br ${styles.bgGradient} rounded-3xl shadow-2xl border-2 ${styles.borderColor} max-w-md w-full transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95`}>
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
        
        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-white rounded-full shadow-lg">
              {styles.icon}
            </div>
          </div>
          
          {/* Title */}
          {title && (
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {title}
            </h2>
          )}
          
          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed whitespace-pre-line">
            {message}
          </p>
          
          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            {onConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-6 py-3 rounded-xl bg-gradient-to-r ${styles.buttonColor} text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
                >
                  {confirmText}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className={`px-8 py-3 rounded-xl bg-gradient-to-r ${styles.buttonColor} text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}
              >
                {confirmText}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
