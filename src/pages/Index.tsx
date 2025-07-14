import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Icon from '@/components/ui/icon';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const Index = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загрузка чатов из localStorage при монтировании
  useEffect(() => {
    const savedChats = localStorage.getItem('helpator-chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
      }
    }
  }, []);

  // Сохранение чатов в localStorage при изменении
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('helpator-chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, currentChatId]);

  const currentChat = chats.find(chat => chat.id === currentChatId);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'Новый диалог',
      messages: [],
      createdAt: new Date()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setSidebarOpen(false);
  };

  const simulateStreamingResponse = async (userMessage: string, chatId: string) => {
    const responses = [
      "Привет! Я Помогатор — ваш дружелюбный ИИ-ассистент. Чем могу помочь?",
      "Отличный вопрос! Давайте разберём это пошагово...",
      "Я понимаю вашу задачу. Вот несколько вариантов решения:",
      "Это интересная тема! Позвольте мне поделиться своими мыслями на этот счёт.",
      "Конечно, помогу! Вот подробный ответ на ваш вопрос..."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const assistantMessage: Message = {
      id: Date.now().toString() + '_assistant',
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true
    };

    // Добавляем пустое сообщение ассистента
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages: [...chat.messages, assistantMessage] }
        : chat
    ));

    // Имитируем стриминг по символам
    for (let i = 0; i < randomResponse.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? {
              ...chat,
              messages: chat.messages.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: randomResponse.slice(0, i + 1) }
                  : msg
              )
            }
          : chat
      ));
    }

    // Убираем флаг стриминга
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, isStreaming: false }
                : msg
            )
          }
        : chat
    ));
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    let chatId = currentChatId;

    // Создаём новый чат если его нет
    if (!chatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: messageText.slice(0, 30) + (messageText.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date()
      };
      setChats(prev => [newChat, ...prev]);
      chatId = newChat.id;
      setCurrentChatId(chatId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      role: 'user',
      timestamp: new Date()
    };

    // Добавляем сообщение пользователя
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            title: chat.messages.length === 0 ? messageText.slice(0, 30) + (messageText.length > 30 ? '...' : '') : chat.title
          }
        : chat
    ));

    // Симулируем ответ ассистента
    await simulateStreamingResponse(messageText, chatId);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4">
        <Button 
          onClick={createNewChat}
          className="w-full bg-transparent border border-gray-600 hover:bg-gray-800 text-white"
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Новый диалог
        </Button>
      </div>
      
      <Separator className="bg-gray-700" />
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                setSidebarOpen(false);
              }}
              className={`p-3 rounded-lg cursor-pointer group flex items-center justify-between transition-colors ${
                currentChatId === chat.id 
                  ? 'bg-gray-700' 
                  : 'hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Icon name="MessageSquare" size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm truncate">{chat.title}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => deleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-red-400"
              >
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-screen flex bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSidebarOpen(true)}>
                  <Icon name="Menu" size={20} />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Icon name="Bot" size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Помогатор</h1>
                <p className="text-sm text-gray-500">Ваш дружелюбный ИИ-ассистент</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
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
                    <Card key={i} className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setInput(example)}>
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
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                            {message.isStreaming && <span className="animate-pulse">▊</span>}
                          </p>
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

        {/* Input */}
        <div className="border-t p-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Напишите сообщение..."
                className="flex-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-green-500 hover:bg-green-600 text-white px-6"
              >
                {isLoading ? (
                  <Icon name="Loader2" size={18} className="animate-spin" />
                ) : (
                  <Icon name="Send" size={18} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;