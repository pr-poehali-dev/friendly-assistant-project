import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextRequestTime: number;
}

export const RateLimitModal: React.FC<RateLimitModalProps> = ({
  isOpen,
  onClose,
  nextRequestTime
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, nextRequestTime - now);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        onClose();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, nextRequestTime, onClose]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleUnlockClick = () => {
    // Yandex Metrica goal
    if (typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym(103345566, 'reachGoal', 'subs');
    }
    
    // Here you would implement payment logic
    console.log('Unlock unlimited requests clicked');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Icon name="X" size={20} />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <Icon name="Clock" size={32} className="text-orange-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Лимит запросов исчерпан
          </h2>

          {/* Timer */}
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              Следующий бесплатный запрос — через
            </p>
            <div className="text-4xl font-mono font-bold text-orange-600">
              {formatTime(timeRemaining)}
            </div>
          </div>

          {/* Unlock button */}
          <Button
            onClick={handleUnlockClick}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl text-lg mb-4 transition-all duration-200 transform hover:scale-105"
          >
            <Icon name="Unlock" size={20} className="mr-2" />
            Разблокировать безлимитные запросы за 49₽
          </Button>

          {/* Or wait text */}
          <p className="text-sm text-gray-500">
            или дождитесь окончания таймера
          </p>
        </div>
      </div>
    </div>
  );
};

export default RateLimitModal;