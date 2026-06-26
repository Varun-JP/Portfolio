import { useEffect, useRef } from 'react';

export const TrailingCursor = () => {
  const cursorRef = useRef(null);
  const coordsRef = useRef({ x: 0, y: 0 });
  const circlesRef = useRef([]);

  useEffect(() => {
    const circles = circlesRef.current;
    
    // Initialize circle positions
    circles.forEach((circle) => {
      if (circle) {
        circle.x = 0;
        circle.y = 0;
      }
    });

    const handleMouseMove = (e) => {
      coordsRef.current.x = e.clientX;
      coordsRef.current.y = e.clientY;
    };

    const animateCircles = () => {
      let x = coordsRef.current.x;
      let y = coordsRef.current.y;

      circles.forEach((circle, index) => {
        if (circle) {
          circle.style.left = x - 12 + "px";
          circle.style.top = y - 12 + "px";
          circle.style.scale = (circles.length - index) / circles.length;
          
          circle.x = x;
          circle.y = y;

          const nextCircle = circles[index + 1] || circles[0];
          if (nextCircle) {
            x += (nextCircle.x - x) * 0.3;
            y += (nextCircle.y - y) * 0.3;
          }
        }
      });

      requestAnimationFrame(animateCircles);
    };

    window.addEventListener("mousemove", handleMouseMove);
    const animationId = requestAnimationFrame(animateCircles);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div 
      ref={cursorRef}
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{ mixBlendMode: 'difference' }}
    >
      {Array.from({ length: 20 }).map((_, index) => (
        <div
          key={index}
          ref={(el) => (circlesRef.current[index] = el)}
          className="absolute block w-[26px] h-[26px] rounded-full bg-white"
        />
      ))}
    </div>
  );
};