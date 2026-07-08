import { useEffect, useRef } from "react";
import { FluidSimulation } from "./FluidSimulation";

export const FLUID_CONFIG = {
  simResolution:       128,
  dyeResolution:        500, 
  splatRadius:          0.8,
  velocityDissipation:  0.78, 
  dyeDissipation:         0.945, 
  vorticity:            3,
  pressureDissipation: 0.8,
  pressureIterations:  20,
  threshold:           0.3,
  edgeSoftness:       0.001,  
  inkColor:            [1, 1, 1],
};

const MOBILE_BREAKPOINT = 768;

export function useGlobalFluid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (window.innerWidth < MOBILE_BREAKPOINT) return;

    const sim = new FluidSimulation(canvasRef.current, FLUID_CONFIG);

    return () => {
      sim.dispose();
    };
  }, []);

  return canvasRef;
}