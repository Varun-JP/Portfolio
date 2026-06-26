import React, { lazy } from "react";

// Lazy load Spline
const Spline = lazy(() => import("@splinetool/react-spline"));

const DarkSpline = () => {
  return (
    <div className="w-full h-screen">
      <Spline scene="https://prod.spline.design/dUZcypexzY2IPAXf/scene.splinecode" />
    </div>
  );
};

export default DarkSpline;
