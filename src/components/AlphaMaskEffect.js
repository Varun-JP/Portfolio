import { Effect } from "postprocessing";
import { Uniform, Vector2 } from "three";

const fragmentShader = /* glsl */ `
  uniform sampler2D uCoverage;
  uniform vec2 uTexelSize;
  uniform float uDilate;

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    float mask = 0.0;
    for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec2 offset = vec2(float(x), float(y)) * uTexelSize * uDilate;
        mask = max(mask, texture2D(uCoverage, uv + offset).r);
      }
    }
    mask = smoothstep(0.15, 0.85, mask); // soft edge instead of a hard cutover
    outputColor = vec4(inputColor.rgb, mask);
  }
`;

export class AlphaMaskEffect extends Effect {
  constructor(coverageTexture, coverageSize = new Vector2(512, 512)) {
    super("AlphaMaskEffect", fragmentShader, {
      uniforms: new Map([
        ["uCoverage", new Uniform(coverageTexture)],
        ["uTexelSize", new Uniform(new Vector2(1 / coverageSize.x, 1 / coverageSize.y))],
        ["uDilate", new Uniform(4.0)], // texels of slack past the raw mesh edge
      ]),
    });
  }

  setCoverageTexture(tex) {
    this.uniforms.get("uCoverage").value = tex;
  }

  setDilate(v) {
    this.uniforms.get("uDilate").value = v;
  }
}