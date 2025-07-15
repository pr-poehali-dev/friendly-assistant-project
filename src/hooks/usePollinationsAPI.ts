import { Chat, Message } from '@/types/chat';

export const usePollinationsAPI = () => {
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

  const callPollinationsAPI = async (
    userMessage: string, 
    chatId: string, 
    currentChat: Chat | undefined,
    image: { url: string; base64: string } | null,
    setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
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

  return { callPollinationsAPI };
};