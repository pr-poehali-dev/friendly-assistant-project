export interface Message {
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

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}