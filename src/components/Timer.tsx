"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  onClosingPhase: () => void;
}

export function Timer({ totalSeconds, onTimeUp, onClosingPhase }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [closingTriggered, setClosingTriggered] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    // Trigger closing phase at 2 minutes remaining
    if (secondsLeft <= 120 && !closingTriggered) {
      setClosingTriggered(true);
      onClosingPhase();
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, closingTriggered, onTimeUp, onClosingPhase]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const isWarning = secondsLeft <= 120;
  const isCritical = secondsLeft <= 60;

  return (
    <div
      className={`font-mono text-lg font-semibold px-4 py-2 rounded-lg ${
        isCritical
          ? "bg-red-100 text-red-700"
          : isWarning
            ? "bg-yellow-100 text-yellow-700"
            : "bg-gray-100 text-gray-700"
      }`}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
