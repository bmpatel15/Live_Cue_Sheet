import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor } from 'lucide-react';

interface CountdownDisplayProps {
  activeTimerData: {
    title: string;
    speaker: string;
    remainingTime: number;
  } | undefined;
  currentTime: string;
  isRunning: boolean;
  isUnder60Seconds: boolean;
  isOvertime: boolean;
  formatTime: (time: number) => string;
  openCountdownInNewWindow: () => void;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({
  activeTimerData,
  currentTime,
  isRunning,
  isUnder60Seconds,
  isOvertime,
  formatTime,
  openCountdownInNewWindow
}) => {
  const getTimeColor = () => {
    if (isOvertime || (activeTimerData && activeTimerData.remainingTime <= 0)) return 'text-red-600';
    if (isUnder60Seconds) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formattedTime = activeTimerData
    ? activeTimerData.remainingTime <= 0
      ? `-${formatTime(Math.abs(activeTimerData.remainingTime))}`
      : formatTime(activeTimerData.remainingTime)
    : '00:00';

  return (
    <Card className="bg-white text-gray-900">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Countdown</h3>
          <span className="text-sm font-medium">{currentTime}</span>
        </div>
        <div className="text-center mb-4">
          <div className={`text-6xl font-bold ${getTimeColor()}`}>
            {formattedTime}
          </div>
        </div>
        <div className="text-center mb-4">
          <h4 className="text-xl font-semibold">{activeTimerData?.title || 'No active timer'}</h4>
          <p className="text-gray-600">{activeTimerData?.speaker || ''}</p>
        </div>
        <div className="flex justify-center">
          <Button onClick={openCountdownInNewWindow} variant="outline" size="sm">
            <Monitor className="mr-2 h-4 w-4" />
            Open in New Window
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CountdownDisplay;