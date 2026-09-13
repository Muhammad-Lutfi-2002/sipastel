import React, { useEffect, useState } from 'react';

interface PageLoaderProps {
  onLoaded?: () => void;
  minDuration?: number;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  onLoaded,
  minDuration = 550,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Smooth progress tick
    const pInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(pInterval);
          return 92;
        }
        return prev + 25;
      });
    }, 110);

    let fadeOutTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      setProgress(100);
      setIsFadingOut(true);
      fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
        if (onLoaded) onLoaded();
      }, 200);
    }, minDuration);

    return () => {
      clearInterval(pInterval);
      clearTimeout(timer);
      if (fadeOutTimer) clearTimeout(fadeOutTimer);
    };
  }, [minDuration, onLoaded]);

  if (!isVisible) return null;

  return (
    <aside
      id="initial-page-loader"
      aria-label="Loading SIPASTEL"
      className={`fixed inset-0 z-50 bg-[#FAF9F5] flex flex-col items-center justify-center transition-opacity duration-200 pointer-events-none ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="text-center">
          <span className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-[#1C1B1A] block">
            SIPASTEL
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#75726B] font-semibold block mt-0.5">
            STUDIO BOGOR
          </span>
        </div>

        {/* Minimal progress bar (thin, high fashion aesthetic) */}
        <div className="w-36 sm:w-44 h-[2px] bg-[#E8E5DF] rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-[#1C1B1A] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
