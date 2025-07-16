import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Icon from '@/components/ui/icon';
import ChatArea from '@/components/ChatArea';
import ChatSidebar from '@/components/ChatSidebar';
import MessageInput from '@/components/MessageInput';
import { Chat, Message } from '@/types/chat';
import { usePollinationsAPI } from '@/hooks/usePollinationsAPI';

const Index = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { callPollinationsAPI } = usePollinationsAPI();

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
          // НЕ восстанавливаем изображения из localStorage
          image: undefined
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
      try {
        // Сохраняем чаты БЕЗ изображений, чтобы не превышать лимит localStorage
        const chatsToSave = chats.map(chat => ({
          ...chat,
          messages: chat.messages.map(msg => ({
            ...msg,
            // НЕ сохраняем изображения в localStorage из-за ограничений размера
            image: msg.image ? { base64: '', url: '' } : undefined
          }))
        }));
        
        // Проверяем размер перед сохранением
        const dataSize = JSON.stringify(chatsToSave).length;
        if (dataSize > 5000000) { // 5MB лимит
          // Если слишком большой, сохраняем только последние 5 чатов
          const limitedChats = chatsToSave.slice(0, 5);
          localStorage.setItem('helpator-chats', JSON.stringify(limitedChats));
        } else {
          localStorage.setItem('helpator-chats', JSON.stringify(chatsToSave));
        }
      } catch (error) {
        console.warn('Failed to save chats to localStorage:', error);
        // Если ошибка, очищаем localStorage и сохраняем только текущий чат
        try {
          const currentChatOnly = chats.filter(chat => chat.id === currentChatId).slice(0, 1);
          const safeChatData = currentChatOnly.map(chat => ({
            ...chat,
            messages: chat.messages.map(msg => ({
              ...msg,
              image: undefined // Удаляем все изображения
            }))
          }));
          localStorage.setItem('helpator-chats', JSON.stringify(safeChatData));
        } catch (secondError) {
          console.error('Failed to save even minimal chat data:', secondError);
          localStorage.removeItem('helpator-chats');
        }
      }
    }
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

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setSidebarOpen(false);
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

    // Отправляем событие в Яндекс.Метрику
    if (typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym(103345566, 'reachGoal', 'message_sent');
    }

    // Получаем ответ от Pollinations API
    await callPollinationsAPI(messageText, chatId, currentChat, messageImage, setChats, setIsLoading);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r">
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          onCreateNewChat={createNewChat}
          onSelectChat={selectChat}
          onDeleteChat={deleteChat}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <ChatSidebar
            chats={chats}
            currentChatId={currentChatId}
            onCreateNewChat={createNewChat}
            onSelectChat={selectChat}
            onDeleteChat={deleteChat}
          />
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
            
            <a 
              href="https://poehali.dev/?utm_source=pmgtor" 
              target="_blank" 
              rel="noopener noreferrer"
              className="transition-transform hover:scale-105"
            >
              <img 
                src="https://cdn.poehali.dev/intertnal/img/created-badge.svg" 
                alt="Created with poehali.dev" 
                className="w-auto h-10"
              />
            </a>
          </div>
        </div>

        {/* Messages */}
        <ChatArea
          currentChat={currentChat}
          onExampleClick={handleExampleClick}
        />

        {/* Input */}
        <MessageInput
          input={input}
          selectedImage={selectedImage}
          isLoading={isLoading}
          onInputChange={setInput}
          onImageUpload={handleImageUpload}
          onRemoveImage={removeSelectedImage}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
        />
      </div>
    </div>
  );
};

export default Index;