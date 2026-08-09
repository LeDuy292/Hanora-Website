import { useEffect, useState, useRef } from 'react';
import { useTourStore } from '../../store/tourStore';

export const TourOverlay = ({ currentStepData, onElementFound }) => {
  const [targetRect, setTargetRect] = useState(null);
  const { setWaitingForElement } = useTourStore();
  const observerRef = useRef(null);
  const prevRectRef = useRef(null);
  const scrolledStepRef = useRef(null);

  useEffect(() => {
    if (!currentStepData) return;

    // Reset target rect for new step so scroll into view fires cleanly
    setTargetRect(null);
    prevRectRef.current = null;
    let isSubscribed = true;

    const findTarget = () => {
      let el = document.querySelector(currentStepData.target);
      if (!el && currentStepData.fallbackTarget) {
        el = document.querySelector(currentStepData.fallbackTarget);
      }

      if (el && isSubscribed) {
        // Auto scroll to element focus on step change
        if (scrolledStepRef.current !== currentStepData.id) {
          scrolledStepRef.current = currentStepData.id;
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          } catch (e) {
            console.warn("Could not scroll into view:", e);
          }
        }

        const rect = el.getBoundingClientRect();
        
        const prev = prevRectRef.current;
        if (
          !prev ||
          prev.top !== rect.top ||
          prev.left !== rect.left ||
          prev.width !== rect.width ||
          prev.height !== rect.height
        ) {
          const nextRect = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
          prevRectRef.current = nextRect;
          setTargetRect(nextRect);
          setWaitingForElement(false);
          if (onElementFound) onElementFound(el);
        }
        return true;
      }
      return false;
    };

    // Initial check
    const foundImmediately = findTarget();
    if (!foundImmediately) {
      setWaitingForElement(true);

      // Polling & MutationObserver fallback for dynamic elements
      const interval = setInterval(() => {
        if (findTarget()) {
          clearInterval(interval);
        }
      }, 200);

      // MutationObserver
      if (typeof MutationObserver !== 'undefined') {
        observerRef.current = new MutationObserver(() => {
          if (findTarget()) {
            if (observerRef.current) observerRef.current.disconnect();
          }
        });
        observerRef.current.observe(document.body, { childList: true, subtree: true });
      }

      return () => {
        isSubscribed = false;
        clearInterval(interval);
        if (observerRef.current) observerRef.current.disconnect();
      };
    }

    // Scroll & Resize Listeners to track element movement
    const handleScrollOrResize = () => {
      findTarget();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize);

    return () => {
      isSubscribed = false;
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
    };
  }, [currentStepData, setWaitingForElement, onElementFound]);

  return (
    <>
      {/* 
        Spotlight Cutout Overlay:
        Using box-shadow 9999px creates a smooth dark backdrop over the ENTIRE screen,
        while leaving a transparent, bright, fully visible hole right over the target button!
      */}
      {targetRect ? (
        <div
          className="fixed rounded-2xl border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] pointer-events-none z-[99995] transition-all duration-300 ease-out"
          style={{
            top: `${Math.max(4, targetRect.top - 6)}px`,
            left: `${Math.max(4, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      ) : (
        /* Fallback dark overlay if element is loading */
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[99990] transition-opacity duration-300 pointer-events-none" />
      )}
    </>
  );
};
