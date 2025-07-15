import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { Chat } from '@/types/chat';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onCreateNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string, e: React.MouseEvent) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  currentChatId,
  onCreateNewChat,
  onSelectChat,
  onDeleteChat
}) => {
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4">
        <Button 
          onClick={onCreateNewChat}
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
              onClick={() => onSelectChat(chat.id)}
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
                onClick={(e) => onDeleteChat(chat.id, e)}
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
};

export default ChatSidebar;