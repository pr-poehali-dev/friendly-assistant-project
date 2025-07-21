import { useState, useEffect } from 'react';

const STORAGE_KEY = 'rate_limit_data';
const MAX_FREE_REQUESTS = 5;
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds

interface RateLimitData {
  requestCount: number;
  lastRequestTime: number;
  resetTime: number;
  isInPostFreeMode: boolean; // флаг что пользователь уже потратил 5 бесплатных запросов
}

export const useRateLimit = () => {
  const [canMakeRequest, setCanMakeRequest] = useState(true);
  const [nextRequestTime, setNextRequestTime] = useState(0);
  const [requestsRemaining, setRequestsRemaining] = useState(MAX_FREE_REQUESTS);

  const getRateLimitData = (): RateLimitData => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        
        // Reset if cooldown period has passed
        if (data.resetTime && now >= data.resetTime) {
          return {
            requestCount: 0,
            lastRequestTime: 0,
            resetTime: 0,
            isInPostFreeMode: data.isInPostFreeMode || false
          };
        }
        
        return data;
      }
    } catch (error) {
      console.error('Error reading rate limit data:', error);
    }
    
    return {
      requestCount: 0,
      lastRequestTime: 0,
      resetTime: 0,
      isInPostFreeMode: false
    };
  };

  const setRateLimitData = (data: RateLimitData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving rate limit data:', error);
    }
  };

  const checkRateLimit = () => {
    const data = getRateLimitData();
    const now = Date.now();
    
    // If we have a reset time and it hasn't passed yet
    if (data.resetTime && now < data.resetTime) {
      setCanMakeRequest(false);
      setNextRequestTime(data.resetTime);
      setRequestsRemaining(0);
      return false;
    }
    
    // If reset time has passed, reset the counter
    if (data.resetTime && now >= data.resetTime) {
      const resetData = {
        requestCount: 0,
        lastRequestTime: 0,
        resetTime: 0,
        isInPostFreeMode: data.isInPostFreeMode
      };
      setRateLimitData(resetData);
      
      // Если пользователь уже потратил 5 бесплатных, даем только 1 на 5 минут
      if (data.isInPostFreeMode) {
        setCanMakeRequest(true);
        setNextRequestTime(0);
        setRequestsRemaining(1);
        return true;
      } else {
        setCanMakeRequest(true);
        setNextRequestTime(0);
        setRequestsRemaining(MAX_FREE_REQUESTS);
        return true;
      }
    }
    
    // Check if under limit
    if (!data.isInPostFreeMode && data.requestCount < MAX_FREE_REQUESTS) {
      setCanMakeRequest(true);
      setNextRequestTime(0);
      setRequestsRemaining(MAX_FREE_REQUESTS - data.requestCount);
      return true;
    }
    
    // Если пользователь в пост-бесплатном режиме и может сделать запрос
    if (data.isInPostFreeMode && data.requestCount === 0) {
      setCanMakeRequest(true);
      setNextRequestTime(0);
      setRequestsRemaining(1);
      return true;
    }
    
    // Over limit
    setCanMakeRequest(false);
    setNextRequestTime(data.resetTime || now + COOLDOWN_PERIOD);
    setRequestsRemaining(0);
    return false;
  };

  const recordRequest = () => {
    const data = getRateLimitData();
    const now = Date.now();
    
    const newCount = data.requestCount + 1;
    let resetTime = data.resetTime;
    let isInPostFreeMode = data.isInPostFreeMode;
    
    // Если это 5-й запрос (и превышаем лимит), ставим таймер и флаг
    if (newCount >= MAX_FREE_REQUESTS && !resetTime && !isInPostFreeMode) {
      resetTime = now + COOLDOWN_PERIOD;
      isInPostFreeMode = true;
    }
    
    // Если пользователь в пост-бесплатном режиме и сделал запрос, ставим таймер на 5 минут
    if (isInPostFreeMode && newCount === 1) {
      resetTime = now + COOLDOWN_PERIOD;
    }
    
    const newData = {
      requestCount: newCount,
      lastRequestTime: now,
      resetTime,
      isInPostFreeMode
    };
    
    setRateLimitData(newData);
    
    // Update state
    if (isInPostFreeMode) {
      // В пост-бесплатном режиме после 1 запроса блокируем
      setCanMakeRequest(false);
      setNextRequestTime(resetTime);
      setRequestsRemaining(0);
    } else if (newCount >= MAX_FREE_REQUESTS) {
      // Первые 5 запросов закончились
      setCanMakeRequest(false);
      setNextRequestTime(resetTime);
      setRequestsRemaining(0);
    } else {
      // Остались бесплатные запросы
      setRequestsRemaining(MAX_FREE_REQUESTS - newCount);
    }
  };

  const resetRateLimit = () => {
    const resetData = {
      requestCount: 0,
      lastRequestTime: 0,
      resetTime: 0,
      isInPostFreeMode: false
    };
    setRateLimitData(resetData);
    setCanMakeRequest(true);
    setNextRequestTime(0);
    setRequestsRemaining(MAX_FREE_REQUESTS);
  };

  // Check rate limit on mount and periodically
  useEffect(() => {
    checkRateLimit();
    
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    canMakeRequest,
    nextRequestTime,
    requestsRemaining,
    recordRequest,
    resetRateLimit,
    checkRateLimit
  };
};