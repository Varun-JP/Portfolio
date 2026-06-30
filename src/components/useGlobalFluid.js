import { useEffect, useRef } from "react";
import { FluidSimulation } from "./FluidSimulation";

const FLUID_CONFIG = {
  simResolution:       128,   // was 1.5 — a ~1px sim grid was the root cause of the blowups
  dyeResolution:       512,
  splatRadius:         1,
  velocityDissipation: 0.88,
  dyeDissipation:      0.92,
  vorticity:           15,
  pressureDissipation: 0.8,
  pressureIterations:  20,    // was 1 — too low to keep the field stable under fast/large input
  threshold:           0.3,
  edgeSoftness:        0.01,
  inkColor:            [1, 1, 1],
};

export function useGlobalFluid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    new FluidSimulation(canvasRef.current, FLUID_CONFIG);
  }, []);

  return canvasRef;
}