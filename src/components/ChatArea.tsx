import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Chat, Message } from '@/types/chat';

interface ChatAreaProps {
  currentChat: Chat | undefined;
  onExampleClick: (example: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ currentChat, onExampleClick }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {!currentChat?.messages.length ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Bot" size={24} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Добро пожаловать в Помогатор!</h2>
            <p className="text-gray-600 mb-6">Ваш дружелюбный ИИ-ассистент готов помочь с любыми вопросами</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
              {[
                "Объясни сложную тему простыми словами",
                "Помоги с решением задачи",
                "Дай совет по работе",
                "Ответь на любой вопрос"
              ].map((example, i) => (
                <Card key={i} className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onExampleClick(example)}>
                  <p className="text-sm text-gray-700">{example}</p>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {currentChat.messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-2xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-start space-x-3">
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon name="Bot" size={16} className="text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div>
                        {message.image && (
                          <div className="mb-3">
                            <img 
                              src={message.image.url} 
                              alt="Загруженное изображение"
                              className="max-w-xs rounded-lg shadow-sm"
                            />
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                          {message.isStreaming && <span className="animate-pulse">▊</span>}
                        </p>
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon name="User" size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatArea;