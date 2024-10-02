import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
// Remove or comment out the following lines:
// import { Button } from "@/components/ui/button";
// import { Monitor } from 'lucide-react';

interface CountdownDisplayProps {
  activeTimerData: {
    title: string;
    speaker: string;
    remainingTime: number;
  } | null;
  currentTime: string;
  formatTime: (seconds: number) => string;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({ activeTimerData, currentTime, formatTime }) => {
  return (
    <Card className="bg-white text-gray-900">
      <CardContent className="p-4">
        <div className="text-4xl font-bold mb-2">{currentTime}</div>
        {activeTimerData ? (
          <>
            <div className="text-6xl font-bold mb-2">{formatTime(activeTimerData.remainingTime)}</div>
            <div className="text-xl font-semibold mb-1">{activeTimerData.title}</div>
            <div className="text-lg">{activeTimerData.speaker}</div>
          </>
        ) : (
          <div className="text-xl">No active timer</div>
        )}
      </CardContent>
    </Card>
  );
};

export default CountdownDisplay;