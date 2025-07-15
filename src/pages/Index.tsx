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
  image?: {
    url: string;
    base64: string;
  };
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
  const [selectedImage, setSelectedImage] = useState<{ url: string; base64: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка чатов из localStorage при монтировании
  useEffect(() => {
    const savedChats = localStorage.getItem('helpator-chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          // Восстанавливаем URL из base64 для изображений
          image: msg.image && msg.image.base64 ? {
            base64: msg.image.base64,
            url: msg.image.base64 // Используем base64 как URL (data URL)
          } : undefined
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
      // Сохраняем чаты с изображениями в base64 формате
      const chatsToSave = chats.map(chat => ({
        ...chat,
        messages: chat.messages.map(msg => ({
          ...msg,
          // Сохраняем base64 данные изображений
          image: msg.image ? { base64: msg.image.base64 } : undefined
        }))
      }));
      localStorage.setItem('helpator-chats', JSON.stringify(chatsToSave));
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

  const buildMessageHistory = (currentChat: Chat | undefined, userMessage: string, image?: { url: string; base64: string } | null) => {
    const systemMessage = {
      role: 'system' as const,
      content: 'Ты дружелюбный ИИ-ассистент по имени Помогатор. Отвечай на русском языке полезно, кратко и дружелюбно. Если получаешь изображение, подробно его опиши и проанализируй.'
    };

    // Берём последние 14 сообщений из истории (чтобы с новым было 15)
    const recentMessages = currentChat?.messages.slice(-14) || [];
    
    const historyMessages = recentMessages.map(msg => {
      if (msg.image && msg.image.base64) {
        return {
          role: msg.role,
          content: [
            {
              type: 'text',
              text: msg.content
            },
            {
              type: 'image_url',
              image_url: {
                url: msg.image.base64
              }
            }
          ]
        };
      } else {
        return {
          role: msg.role,
          content: msg.content
        };
      }
    });

    // Добавляем текущее сообщение пользователя
    const currentUserMessage = {
      role: 'user' as const,
      content: image ? [
        {
          type: 'text',
          text: userMessage
        },
        {
          type: 'image_url',
          image_url: {
            url: image.base64
          }
        }
      ] : userMessage
    };

    return [systemMessage, ...historyMessages, currentUserMessage];
  };

  const callPollinationsAPI = async (userMessage: string, chatId: string, image?: { url: string; base64: string } | null) => {
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

    try {
      const currentChat = chats.find(chat => chat.id === chatId);
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai',
          messages: buildMessageHistory(currentChat, userMessage, image),
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Добавляем новые данные к буферу
        buffer += decoder.decode(value, { stream: true });
        
        // Разбиваем буфер на строки
        const lines = buffer.split('\n');
        
        // Оставляем последнюю неполную строку в буфере
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6).trim();
            
            if (data === '[DONE]') {
              break;
            }

            if (data === '') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              
              if (delta) {
                content += delta;
                
                // Обновляем сообщение с новым контентом
                setChats(prev => prev.map(chat => 
                  chat.id === chatId 
                    ? {
                        ...chat,
                        messages: chat.messages.map(msg => 
                          msg.id === assistantMessage.id 
                            ? { ...msg, content }
                            : msg
                        )
                      }
                    : chat
                ));
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data, e);
            }
          }
        }
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

    } catch (error) {
      console.error('Error calling Pollinations API:', error);
      
      // В случае ошибки показываем fallback ответ
      const fallbackContent = 'Извините, произошла ошибка при обращении к API. Попробуйте ещё раз.';
      
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? {
              ...chat,
              messages: chat.messages.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: fallbackContent, isStreaming: false }
                  : msg
              )
            }
          : chat
      ));
    } finally {
      // Всегда убираем состояние загрузки
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const messageText = input.trim() || 'Проанализируй это изображение';
    const messageImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      timestamp: new Date(),
      image: messageImage
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

    // Получаем ответ от Pollinations API
    await callPollinationsAPI(messageText, chatId, messageImage);
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const url = URL.createObjectURL(file);
      
      setSelectedImage({
        url,
        base64
      });
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage.url);
      setSelectedImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
                <h1 className="text-xl font-semibold text-gray-900">Помогатор (ChatGPT)</h1>
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

        {/* Input */}
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
                  onClick={removeSelectedImage}
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
                  onChange={handleImageUpload}
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedImage ? "Опишите что нужно сделать с изображением..." : "Напишите сообщение..."}
                className="flex-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;