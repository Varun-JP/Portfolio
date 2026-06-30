import { useEffect, useRef } from "react";
import { FluidSimulation } from "./FluidSimulation";

const FLUID_CONFIG = {
  simResolution:       1.5,
  dyeResolution:       512,
  splatRadius:         1,
  velocityDissipation: 0.88,
  dyeDissipation:      0.92,
  vorticity:           15,
  pressureDissipation: 0.8,
  pressureIterations:  1,
  threshold:           0.3,
  edgeSoftness:        0.01,
  inkColor:            [1, 1, 1],
};

export function useGlobalFluid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    new FluidSimulation(canvasRef.current, FLUID_CONFIG);
    // FluidSimulation owns its own RAF loop — no cleanup needed
    // as long as this canvas is mounted once and never removed.
  }, []);

  return canvasRef;
}