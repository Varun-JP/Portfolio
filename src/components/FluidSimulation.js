import * as THREE from "three";
import shaders from "./shaders.js";

export class FluidSimulation {
  constructor(canvas, config) {
    this.config = config;
    this._setupRenderer(canvas);
    this._setupScene();
    this._setupTargets();
    this._setupMaterials();
    this._setupInput();
    this._loop();
  }

  _setupRenderer(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0); // ← add this line
    this.dpr = this.renderer.getPixelRatio();
    this.width = window.innerWidth * this.dpr;
    this.height = window.innerHeight * this.dpr;

this._onResize = () => {
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  this.width = window.innerWidth * this.dpr;
  this.height = window.innerHeight * this.dpr;
};
window.addEventListener("resize", this._onResize);
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.quad);
  }


_setupTargets() {
  const { simResolution: simRes, dyeResolution: dyeRes } = this.config;
  const aspect = this.width / this.height;
  const options = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
  };

    const single = (w, h) => new THREE.WebGLRenderTarget(w, h, options);
    const double = (w, h) => ({
      read: single(w, h),
      write: single(w, h),
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      },
    });

    this.simSize = { w: simRes, h: Math.round(simRes / aspect) };
    this.dyeSize = { w: dyeRes, h: Math.round(dyeRes / aspect) };

    this.velocity = double(this.simSize.w, this.simSize.h);
    this.dye = double(this.dyeSize.w, this.dyeSize.h);
    this.divergence = single(this.simSize.w, this.simSize.h);
    this.curl = single(this.simSize.w, this.simSize.h);
    this.pressure = double(this.simSize.w, this.simSize.h);

    this._clearAllTargets();
  }
_clearAllTargets() {
  const targets = [
    this.velocity.read, this.velocity.write,
    this.dye.read, this.dye.write,
    this.divergence,
    this.curl,
    this.pressure.read, this.pressure.write,
  ];
  targets.forEach((t) => {
    this.renderer.setRenderTarget(t);
    this.renderer.clear(true, true, true);
  });
  this.renderer.setRenderTarget(null);
}
  _setupMaterials() {
    const make = ([vert, frag], uniforms) =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms,
      });

    const tex = () => ({ value: null });
    const num = (v = 0) => ({ value: v });
    const vec2 = () => ({ value: new THREE.Vector2() });

    this.material = {
      splat: make(shaders.splat, {
        uTarget: tex(),
        aspectRatio: num(),
        radius: num(),
        color: { value: new THREE.Vector3() },
        point: { value: new THREE.Vector2() },
      }),
      advection: make(shaders.advection, {
        uVelocity: tex(),
        uSource: tex(),
        texelSize: vec2(),
        dt: num(),
        dissipation: num(),
      }),
      divergence: make(shaders.divergence, {
        uVelocity: tex(),
        texelSize: vec2(),
      }),
      curl: make(shaders.curl, { uVelocity: tex(), texelSize: vec2() }),
      vorticity: make(shaders.vorticity, {
        uVelocity: tex(),
        uCurl: tex(),
        texelSize: vec2(),
        curlStrength: num(),
        dt: num(),
      }),
      pressure: make(shaders.pressure, {
        uPressure: tex(),
        uDivergence: tex(),
        texelSize: vec2(),
      }),
      gradientSubtract: make(shaders.gradientSubtract, {
        uPressure: tex(),
        uVelocity: tex(),
        texelSize: vec2(),
      }),
      clear: make(shaders.clear, { uTexture: tex(), value: num() }),
      display: new THREE.ShaderMaterial({
        vertexShader: shaders.display[0],
        fragmentShader: shaders.display[1],
        uniforms: {
          uTexture: tex(),
          threshold: num(),
          edgeSoftness: num(),
          inkColor: { value: new THREE.Vector3() },
        },
        transparent: true,
        depthWrite: false,
      }),
    };
  }

_setupInput() {
  this.pointers = [{ id: -1, x: window.innerWidth / 2, y: window.innerHeight / 2, dx: 0, dy: 0, down: true, moved: false, color: [1, 1, 1] }];

  const MAX_DELTA = 40;

  this._onMouseMove = (e) => {
    const p = this.pointers[0];
    let rawDx = e.clientX - p.x;
    let rawDy = e.clientY - p.y;
    rawDx = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, rawDx));
    rawDy = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, rawDy));
    p.dx = rawDx * 5.0;
    p.dy = rawDy * 5.0;
    p.x = e.clientX;
    p.y = e.clientY;
    p.color = [1, 1, 1];
    p.moved = true;
  };

  this._onMouseUp = () => {
    this.pointers[0].down = false;
  };

  window.addEventListener("mousemove", this._onMouseMove);
  window.addEventListener("mouseup", this._onMouseUp);
}

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  splat(x, y, dx, dy, color) {
    const { splat: m } = this.material;
    m.uniforms.aspectRatio.value = this.width / this.height;
    m.uniforms.point.value.set(x / window.innerWidth, 1.0 - y / window.innerHeight);
    m.uniforms.radius.value = this.config.splatRadius / 100.0;

    m.uniforms.uTarget.value = this.velocity.read.texture;
    m.uniforms.color.value.set(dx, -dy, 0);
    this._pass(m, this.velocity.write);
    this.velocity.swap();

    m.uniforms.uTarget.value = this.dye.read.texture;
    m.uniforms.color.value.set(...color);
    this._pass(m, this.dye.write);
    this.dye.swap();
  }

  _loop() {
    let lastTime = performance.now();
 const step = () => {
    if (this._disposed) return;
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 1 / 30); // cap at 1/30s so a stall doesn't overdrive advection
    lastTime = now;

    const { advection: adv, divergence: div, curl: crl, vorticity: vor, pressure: pre, gradientSubtract: gra, clear, display } = this.material;
    const simTexel = new THREE.Vector2(1.0 / this.simSize.w, 1.0 / this.simSize.h);

      // Input
      this.pointers.forEach((p) => {
        if (p.moved) {
          this.splat(p.x, p.y, p.dx, p.dy, p.color);
          p.moved = false;
        }
      });

      // Simulation Step
      adv.uniforms.dt.value = dt;
      adv.uniforms.texelSize.value.copy(simTexel);
      
      adv.uniforms.uVelocity.value = this.velocity.read.texture;
      adv.uniforms.uSource.value = this.velocity.read.texture;
      adv.uniforms.dissipation.value = this.config.velocityDissipation;
      this._pass(adv, this.velocity.write);
      this.velocity.swap();

      adv.uniforms.uVelocity.value = this.velocity.read.texture;
      adv.uniforms.uSource.value = this.dye.read.texture;
      adv.uniforms.dissipation.value = this.config.dyeDissipation;
      this._pass(adv, this.dye.write);
      this.dye.swap();

      crl.uniforms.uVelocity.value = this.velocity.read.texture;
      crl.uniforms.texelSize.value.copy(simTexel);
      this._pass(crl, this.curl);

      vor.uniforms.uVelocity.value = this.velocity.read.texture;
      vor.uniforms.uCurl.value = this.curl.texture;
      vor.uniforms.curlStrength.value = this.config.vorticity;
      vor.uniforms.dt.value = dt;
      vor.uniforms.texelSize.value.copy(simTexel);
      this._pass(vor, this.velocity.write);
      this.velocity.swap();

      div.uniforms.uVelocity.value = this.velocity.read.texture;
      div.uniforms.texelSize.value.copy(simTexel);
      this._pass(div, this.divergence);

      clear.uniforms.uTexture.value = this.pressure.read.texture;
      clear.uniforms.value.value = this.config.pressureDissipation;
      this._pass(clear, this.pressure.write);
      this.pressure.swap();

      pre.uniforms.uDivergence.value = this.divergence.texture;
      pre.uniforms.texelSize.value.copy(simTexel);
      for (let i = 0; i < this.config.pressureIterations; i++) {
        pre.uniforms.uPressure.value = this.pressure.read.texture;
        this._pass(pre, this.pressure.write);
        this.pressure.swap();
      }

      gra.uniforms.uPressure.value = this.pressure.read.texture;
      gra.uniforms.uVelocity.value = this.velocity.read.texture;
      gra.uniforms.texelSize.value.copy(simTexel);
      this._pass(gra, this.velocity.write);
      this.velocity.swap();

      display.uniforms.uTexture.value = this.dye.read.texture;
      display.uniforms.threshold.value = this.config.threshold;
      display.uniforms.edgeSoftness.value = this.config.edgeSoftness;
      display.uniforms.inkColor.value.set(...this.config.inkColor);
      this._pass(display, null);

      this._rafId = requestAnimationFrame(step);
    };
    step();
  }
  dispose() {
  this._disposed = true;
  if (this._rafId) cancelAnimationFrame(this._rafId);

  window.removeEventListener("mousemove", this._onMouseMove);
  window.removeEventListener("mouseup", this._onMouseUp);
  window.removeEventListener("resize", this._onResize);

  [this.velocity.read, this.velocity.write,
   this.dye.read, this.dye.write,
   this.divergence, this.curl,
   this.pressure.read, this.pressure.write,
  ].forEach(t => t.dispose());

  Object.values(this.material).forEach(m => m.dispose());

  this.quad.geometry.dispose();
  this.renderer.dispose();
}
}
