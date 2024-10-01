'use client'

import React, { useEffect, useState } from 'react';

interface Message {
  id: string;
  text: string;
  type: 'info' | 'alert' | 'question';
  timestamp: string;
}

interface CountdownData {
  title: string;
  speaker: string;
  remainingTime: number;
  isRunning: boolean;
  isUnder60Seconds: boolean;
  isOvertime: boolean;
  currentTime: string;
  messages: Message[];
}

export default function CountdownPage() {
  const [countdownData, setCountdownData] = useState<CountdownData | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'UPDATE_COUNTDOWN') {
        setCountdownData(prevData => {
          const newData = event.data.data;
          if (prevData && newData.messages.length > prevData.messages.length) {
            const newestMessage = newData.messages[0];
            if (newestMessage) {
              setLastMessageId(newestMessage.id);
              setIsFlashing(true);
              setTimeout(() => setIsFlashing(false), 1000); // Flash for 1 second
            }
          }
          return newData;
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (lastMessageId !== null) {
      const timer = setTimeout(() => {
        setLastMessageId(null);
      }, 5000); // Reset after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [lastMessageId]);

  const getTimerColor = () => {
    if (!countdownData) return '';
    if (countdownData.isOvertime || countdownData.remainingTime <= 0) return 'text-red-600';
    if (countdownData.isUnder60Seconds) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatTime = (time: number): string => {
    const absTime = Math.abs(time);
    const minutes = Math.floor(absTime / 60);
    const seconds = Math.floor(absTime % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-red-600';
      case 'question':
        return 'bg-green-600';
      default:
        return 'bg-gray-700';
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-gray-100 p-4 sm:p-8">
      {countdownData && (
        <>
          <div className="flex-grow flex flex-col items-center justify-center w-full">
            <div className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-4 sm:mb-8 text-center">
              <span className={getTimerColor()}>
                {countdownData.remainingTime <= 0 ? '-' : ''}
                {formatTime(Math.abs(countdownData.remainingTime))}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold mb-2 sm:mb-4 text-center">{countdownData.title}</h1>
            <p className="text-xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-600 mb-3 sm:mb-6 text-center">{countdownData.speaker}</p>
            <p className="text-lg sm:text-2xl md:text-3xl lg:text-4xl mb-6 sm:mb-12">{countdownData.currentTime}</p>
          </div>
          <div className="w-full max-w-4xl space-y-2 sm:space-y-4 overflow-y-auto" style={{ maxHeight: '30vh' }}>
            {countdownData.messages.map((message) => (
              <div
                key={message.id}
                className={`p-2 sm:p-4 rounded text-white ${getMessageColor(message.type)} ${
                  message.id === lastMessageId && isFlashing ? 'animate-pulse' : ''
                }`}
              >
                <p className="text-lg sm:text-2xl md:text-3xl">{message.text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}