import { useState, useEffect } from 'react';

const STORAGE_KEY = 'rate_limit_data';
const MAX_FREE_REQUESTS = 5;
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds

interface RateLimitData {
  requestCount: number;
  lastRequestTime: number;
  resetTime: number;
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
            resetTime: 0
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
      resetTime: 0
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
        resetTime: 0
      };
      setRateLimitData(resetData);
      setCanMakeRequest(true);
      setNextRequestTime(0);
      setRequestsRemaining(MAX_FREE_REQUESTS);
      return true;
    }
    
    // Check if under limit
    if (data.requestCount < MAX_FREE_REQUESTS) {
      setCanMakeRequest(true);
      setNextRequestTime(0);
      setRequestsRemaining(MAX_FREE_REQUESTS - data.requestCount);
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
    
    // If this is the 5th request, set reset time
    if (newCount >= MAX_FREE_REQUESTS && !resetTime) {
      resetTime = now + COOLDOWN_PERIOD;
    }
    
    const newData = {
      requestCount: newCount,
      lastRequestTime: now,
      resetTime
    };
    
    setRateLimitData(newData);
    
    // Update state
    if (newCount >= MAX_FREE_REQUESTS) {
      setCanMakeRequest(false);
      setNextRequestTime(resetTime);
      setRequestsRemaining(0);
    } else {
      setRequestsRemaining(MAX_FREE_REQUESTS - newCount);
    }
  };

  const resetRateLimit = () => {
    const resetData = {
      requestCount: 0,
      lastRequestTime: 0,
      resetTime: 0
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