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
        // ── Fonts ────────────────────────────────────────────────────────────
        await document.fonts.ready;

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

        await document.fonts.ready;

        // ── Three.js / R3F chunks — import eagerly so Vite splits are warm ──
        // These are the same imports Landing.jsx uses; hitting them here means
        // the browser has already parsed + executed the modules by the time
        // the Canvas mounts, so there's no cold-start stall on the 3D scene.
        await Promise.all([
          import('three'),
          import('@react-three/fiber'),
          import('@react-three/postprocessing'),
          import('three/examples/jsm/loaders/SVGLoader'),
        ]);

        // ── Preload the R SVG so SVGLoader gets a cache hit ──────────────────
        // We fetch it as text and stash it; the browser's HTTP cache will
        // serve it instantly when SVGLoader does its own fetch() later.
        try {
          await fetch('/models/fixed_R.svg');
        } catch (svgError) {
          console.warn('SVG preload failed:', svgError);
        }

        // ── GSAP ─────────────────────────────────────────────────────────────
        if (!window.gsap) {
          await import('gsap');
        }

        // Small buffer to let the GPU driver finish any lazy init
        await new Promise(resolve => setTimeout(resolve, 300));

        setAssetsLoaded(true);
      } catch (error) {
        console.warn('Some assets failed to preload:', error);
        setAssetsLoaded(true);
      }
    };

    loadAssets();

    function updateCounter() {
      if (counterRef.current >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (assetsLoaded) {
          setTimeout(() => {
            setIsAnimatingOut(true);
            setTimeout(() => onLoadComplete(), 2000);
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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (counter === 100 && assetsLoaded && !isAnimatingOut) {
      setTimeout(() => {
        setIsAnimatingOut(true);
        setTimeout(() => onLoadComplete(), 2000);
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