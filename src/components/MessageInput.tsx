import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface MessageInputProps {
  input: string;
  selectedImage: { url: string; base64: string } | null;
  isLoading: boolean;
  requestsRemaining?: number;
  onInputChange: (value: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  input,
  selectedImage,
  isLoading,
  requestsRemaining,
  onInputChange,
  onImageUpload,
  onRemoveImage,
  onSendMessage,
  onKeyPress
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Автоматически фокусируемся на поле ввода
  useEffect(() => {
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Фокусируемся после отправки сообщения
  useEffect(() => {
    if (!input && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [input]);

  return (
    <div className="border-t p-4 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Preview selected image */}
        {selectedImage && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={selectedImage.url} 
                alt="Предпросмотр"
                className="w-12 h-12 object-cover rounded-lg"
              />
              <span className="text-sm text-gray-600">Изображение выбрано</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onRemoveImage}
              className="text-gray-400 hover:text-red-500"
            >
              <Icon name="X" size={16} />
            </Button>
          </div>
        )}
        
        <div className="flex space-x-2">
          <div className="flex space-x-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              <Icon name="Paperclip" size={18} />
            </Button>
          </div>
          
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={selectedImage ? "Опишите что нужно сделать с изображением..." : "Напишите сообщение..."}
            className="flex-1 border-gray-300 focus:border-green-500 focus:ring-green-500 focus:outline-none"
            autoFocus
          />
          <Button 
            onClick={onSendMessage}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="bg-green-500 hover:bg-green-600 text-white px-6"
          >
            {isLoading ? (
              <Icon name="Loader2" size={18} className="animate-spin" />
            ) : (
              <Icon name="Send" size={18} />
            )}
          </Button>
        </div>

        {/* Rate limit indicator */}
        {requestsRemaining !== undefined && requestsRemaining <= 3 && (
          <div className="mt-2 text-center">
            <span className={`text-sm px-3 py-1 rounded-full ${
              requestsRemaining === 0 
                ? 'bg-red-100 text-red-700' 
                : requestsRemaining <= 1 
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-yellow-100 text-yellow-700'
            }`}>
              {requestsRemaining === 0 
                ? 'В очереди' 
                : `Осталось ${requestsRemaining} ${requestsRemaining === 1 ? 'запрос' : 'запроса'}`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;