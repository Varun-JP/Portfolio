import { forwardRef, useMemo } from "react";
import { AlphaMaskEffect } from "./AlphaMaskEffect";

export const AlphaMask = forwardRef(({ coverageTexture }, ref) => {
  const effect = useMemo(() => new AlphaMaskEffect(coverageTexture), []); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the uniform live without recreating the effect instance
  if (effect.uniforms.get("uCoverage").value !== coverageTexture) {
    effect.setCoverageTexture(coverageTexture);
  }

  return <primitive ref={ref} object={effect} dispose={null} />;
});