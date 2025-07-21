import React from 'react';
import Icon from '@/components/ui/icon';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* О проекте */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Icon name="Bot" size={18} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Помогатор</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Ваш дружелюбный ИИ-ассистент на базе ChatGPT 4o. 
              Готов помочь с любыми вопросами и задачами.
            </p>
          </div>

          {/* Полезные ссылки */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Полезные ссылки</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Как пользоваться
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Примеры запросов
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Часто задаваемые вопросы
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Обратная связь
                </a>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Связаться с нами</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Icon name="Mail" size={16} className="text-gray-500" />
                <span className="text-gray-600">support@helpator.ru</span>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="MessageCircle" size={16} className="text-gray-500" />
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Telegram канал
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Icon name="Github" size={16} className="text-gray-500" />
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Нижняя часть */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-sm text-gray-500">
              © 2024 Помогатор. Все права защищены.
            </p>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                Политика конфиденциальности
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                Условия использования
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;