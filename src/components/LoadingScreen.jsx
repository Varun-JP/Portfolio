/* eslint-disable */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen = ({ onLoadComplete }) => {
  const [counter, setCounter] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const counterRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        // Wait for all fonts to be ready
        await document.fonts.ready;
        
        // CRITICAL: Explicitly check if Melete font is loaded
        const meleteFont = new FontFace(
          'Melete',
          'url(/fonts/Melete/Melete-Bold.woff2) format("woff2"), url(/fonts/Melete/Melete-Bold.woff) format("woff")',
          { weight: '800', style: 'normal' }
        );
        
        try {
          await meleteFont.load();
          document.fonts.add(meleteFont);
        } catch (fontError) {
          console.warn('Melete font failed to load:', fontError);
        }
        
        // Double check all fonts are truly ready
        await document.fonts.ready;
        
        // Load GSAP if needed
        if (!window.gsap) {
          await import('gsap');
          await import('gsap/ScrollTrigger');
        }
        
        // Check for Spline viewer
        if (!customElements.get('spline-viewer')) {
          await new Promise((resolve) => {
            const checkSpline = setInterval(() => {
              if (customElements.get('spline-viewer')) {
                clearInterval(checkSpline);
                resolve();
              }
            }, 100);
            setTimeout(() => {
              clearInterval(checkSpline);
              resolve();
            }, 5000);
          });
        }
        
        // Extra delay to ensure font rendering is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        setAssetsLoaded(true);
      } catch (error) {
        console.warn('Some assets failed to preload:', error);
        setAssetsLoaded(true);
      }
    };

    loadAssets();

    function updateCounter() {
      if (counterRef.current >= 100) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (assetsLoaded) {
          setTimeout(() => {
            setIsAnimatingOut(true);
            setTimeout(() => {
              onLoadComplete();
            }, 2000);
          }, 500);
        }
        return;
      }
      const increment = Math.floor(Math.random() * 10) + 1;
      counterRef.current = Math.min(counterRef.current + increment, 100);
      setCounter(counterRef.current);
      const delay = Math.floor(Math.random() * 200) + 100;
      setTimeout(updateCounter, delay);
    }

    updateCounter();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (counter === 100 && assetsLoaded && !isAnimatingOut) {
      setTimeout(() => {
        setIsAnimatingOut(true);
        setTimeout(() => {
          onLoadComplete();
        }, 2000);
      }, 500);
    }
  }, [counter, assetsLoaded, isAnimatingOut, onLoadComplete]);

  return (
    <div className="fixed inset-0 z-[9999]">
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: isAnimatingOut ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 flex items-center justify-center z-[10000] pointer-events-none"
      >
        <span className="text-[10vw] font-bold text-primary tabular-nums leading-none">
          {counter}
        </span>
      </motion.div>
      <div className="fixed inset-0 flex" style={{ width: '100vw' }}>
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: '105vh' }}
            animate={{ height: isAnimatingOut ? 0 : '105vh' }}
            transition={{
              duration: 1.5,
              delay: isAnimatingOut ? i * 0.05 : 0,
              ease: [0.76, 0, 0.24, 1],
            }}
            className="bg-foreground"
            style={{
              width: '10vw',
              transformOrigin: 'bottom',
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};