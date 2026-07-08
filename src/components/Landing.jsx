import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ArrowDown } from "lucide-react";
import { Navbar } from "./Navbar";
import gsap from "gsap";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import * as THREE from "three";
import { AboutPreview } from "./AboutPreview";
import { EffectComposer, SelectiveBloom, Selection, Select } from "@react-three/postprocessing";
import { Perf } from "r3f-perf";

// ── 3D constants ──────────────────────────────────────────────────────────────
const GROUP_Z   = -3.5;
const CAM_START =  5.5;
const CAM_X     = -0.199;
const CAM_Y     =  1;
const HOLE_X    = -0.128;
const HOLE_Y    =  0.615;

// ── DEBUG ──────────────────────────────────────────────────────────────────
// EffectComposer/SelectiveBloom was confirmed as the source of a WebGL
// render-target leak: textures climbed on every About<->Skills transition
// and never released until a full page reload. Root cause (render targets
// not being disposed on some internal re-alloc inside SelectiveBloom) isn't
// fixed yet — bypassing the whole composer is the stable option for now.
// Flip to false only once that's actually root-caused and fixed upstream.
const DEBUG_SKIP_EFFECTS = true;
const DEBUG_LOG_METRICS  = true; // console.log texture/program counts + resize events

// Scroll geometry. SCROLL_ZONE_VH is how much scroll distance maps to the
// camera dolly (progress 0 -> 1). DWELL_VH is extra pinned scroll *after*
// progress hits 1 — the "hold on the finished About view" beat before the
// page continues into Skills. Total pinned distance = the sum of both.
const SCROLL_ZONE_VH = 1.5;
const DWELL_VH       = 1.5;

// How quickly the smoothed progress value catches up to the raw
// scroll-derived target. This is cosmetic only — it settles in a handful of
// frames and never blocks or gates anything, unlike the old lock system.
const PROGRESS_SMOOTHING = 0.18;

const BASE_FOV   = 50;
const REF_ASPECT = 16 / 9;

function fovForAspect(aspect) {
  if (!aspect) return BASE_FOV;
  const baseHalfV   = THREE.MathUtils.degToRad(BASE_FOV / 2);
  const lockedHalfH = Math.atan(Math.tan(baseHalfV) * REF_ASPECT);
  const neededHalfV = Math.atan(Math.tan(lockedHalfH) / aspect);
  return THREE.MathUtils.radToDeg(neededHalfV) * 2;
}

// ── Typewriter ────────────────────────────────────────────────────────────────
const Typewriter = ({ text, words, speed = 150, deleteSpeed = 100, pause = 2000 }) => {
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting]   = useState(false);
  const [loopNum, setLoopNum]         = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(speed);

  useEffect(() => {
    const wordList = words ?? ["fullstack", "machine learning", "creative coding"];
    let timer;
    const handleTyping = () => {
      const i        = loopNum % wordList.length;
      const fullText = wordList[i];
      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );
      setTypingSpeed(isDeleting ? deleteSpeed : speed);
      if (!isDeleting && displayText === fullText) {
        timer = setTimeout(() => setIsDeleting(true), pause);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        timer = setTimeout(handleTyping, 500);
      } else {
        timer = setTimeout(handleTyping, typingSpeed);
      }
    };
    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopNum, typingSpeed, speed, deleteSpeed, pause]);

  return (
    <span>
      {text}{" "}
      <span className="text-amber-500 font-bold px-2 py-0.5 rounded-full bg-black">
        {displayText}
      </span>
      <span className="animate-pulse">|</span>
    </span>
  );
};

// ── TunnelR ───────────────────────────────────────────────────────────────────
// Owns: the R geometry/lights/bloom, the camera dolly, and bridging the
// About DOM into the same 3D space via CSS3DObject so it keystones through
// the hole in sync with the camera. The About node is added to the CSS3D
// scene once, on mount, and stays there permanently — it is never pulled
// back out into plain in-flow DOM. Once scroll carries the pinned container
// out of the sticky zone, it simply scrolls away with everything else.
function TunnelR({
  progress, targetProgress, mouseRef, isDarkMode, isMobile,
  cssRendererRef, cssSceneRef, aboutObjRef, inTunnelRef, onFrame,
}) {
  const svg              = useLoader(SVGLoader, "/models/fixed_R.svg");
  const { camera, size } = useThree();

  const headlampRef       = useRef(null);
  const redGhostRef       = useRef(null);
  const cyanGhostRef      = useRef(null);
  const ambientLightRef   = useRef(null);
  const dirLight1Ref      = useRef(null);
  const dirLight2Ref      = useRef(null);
  const mainPointLightRef = useRef(null);
  const fillPointLightRef = useRef(null);

  const [lightsMounted, setLightsMounted] = useState(false);
  useEffect(() => { setLightsMounted(true); }, []);

  const bloomLights = useMemo(
    () => [
      ambientLightRef.current,
      dirLight1Ref.current,
      dirLight2Ref.current,
      mainPointLightRef.current,
      fillPointLightRef.current,
      headlampRef.current,
    ].filter(Boolean),
    [lightsMounted]
  );

  const GHOST_SCALE_FACTOR_RED  = 0.995;
  const GHOST_SCALE_FACTOR_CYAN = 0.9999;

  useEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = fovForAspect(aspect);
    camera.updateProjectionMatrix();
    cssRendererRef.current?.setSize(size.width, size.height);
    if (DEBUG_LOG_METRICS) {
      console.log("[resize] size changed ->", size.width, size.height);
    }
  }, [size, camera, cssRendererRef]);

  // GPU resource watch — throttled so it doesn't spam every frame.
  // textures should stay flat outside of intentional asset loads;
  // programs (shaders) should stay essentially constant after warm-up.
  useFrame(({ gl }) => {
    if (DEBUG_LOG_METRICS && Math.random() < 0.01) {
      console.log(
        "[gpu] textures:", gl.info.memory.textures,
        "geometries:", gl.info.memory.geometries,
        "programs:", gl.info.programs.length
      );
    }
  });

  const shapes = useMemo(() =>
    svg.paths.flatMap((p) => SVGLoader.createShapes(p)),
  [svg]);

  const extrudeSettings = useMemo(() => ({
    depth:          0.35,
    bevelEnabled:   true,
    bevelThickness: 0.008,
    bevelSize:      0.108,
    bevelSegments:  2,
    curveSegments:  10,
  }), []);

  const faceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color:             isDarkMode ? "#5c2e00" : "#6B1500",
    roughness:         0.3,
    metalness:         isDarkMode ? 0.5 : 0.3,
    emissive:          isDarkMode ? "#FFA000" : "#CC3D00",
    emissiveIntensity: isDarkMode ? 1.1  : 1.6,
    side:              THREE.FrontSide,
    transparent:       true,
    opacity:           1,
  }), [isDarkMode]);

  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color:             isDarkMode ? "#0d0300" : "#1a0400",
    roughness:         0.6,
    metalness:         0.15,
    emissive:          isDarkMode ? "#330800" : "#440a00",
    emissiveIntensity: isDarkMode ? 0.15 : 0.3,
    side:              THREE.DoubleSide,
    transparent:       true,
    opacity:           1,
  }), [isDarkMode]);

  const redGhostMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color:       "#ff0000",
    transparent: true,
    opacity:     0,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
    side:        THREE.DoubleSide,
    toneMapped:  false,
  }), []);

  const cyanGhostMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color:       "#ff3300",
    transparent: true,
    opacity:     0,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
    side:        THREE.DoubleSide,
    toneMapped:  false,
  }), []);

  // Reused scratch vectors so we don't allocate every frame.
  const tmpDir = useRef(new THREE.Vector3());
  const tmpPos = useRef(new THREE.Vector3());
  const rotYRef = useRef(-1.45);

  const START_ROT_Y = -1.45;
  const END_ROT_Y   =  0.0;
  const ABOUT_WORLD_HEIGHT = isMobile ? 2.1 : 0.75; // world units at full reveal
  const ABOUT_CSS_HEIGHT   = 500;                   // matches AboutPreview's own height
  const ABOUT_UNIT_SCALE   = ABOUT_WORLD_HEIGHT / ABOUT_CSS_HEIGHT;

  useFrame(({ camera }) => {
    // Progress is a direct, scroll-driven value — this lerp is purely a
    // cosmetic smoother, not a gate. If scrolling stops, it settles in a
    // few frames on its own; nothing waits on it.
    progress.current.value += (targetProgress.current - progress.current.value) * PROGRESS_SMOOTHING;
    const p = progress.current.value;

    const camZ = GROUP_Z + (CAM_START - GROUP_Z) / (1 + p * 20);
    camera.position.set(CAM_X, CAM_Y, camZ);
    camera.lookAt(CAM_X, CAM_Y, GROUP_Z);

    const tunnelOpacity = 1 - gsap.utils.clamp(0, 1, (p - 0.97) / 0.03);
    faceMaterial.opacity = tunnelOpacity;
    wallMaterial.opacity = tunnelOpacity;

    if (headlampRef.current) {
      headlampRef.current.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z + 0.4,
      );
    }

    const glitchCurve   = Math.sin(p * Math.PI);
    const glitchOffset  = 0.025;
    const glitchOpacity = glitchCurve * 0.55 * tunnelOpacity;
    const ghostsVisible = glitchOpacity > 0.01;

    if (redGhostRef.current) {
      redGhostRef.current.visible = ghostsVisible;
      if (ghostsVisible) redGhostRef.current.position.x = -1.175 + glitchOffset;
    }
    if (cyanGhostRef.current) {
      cyanGhostRef.current.visible = ghostsVisible;
      if (ghostsVisible) cyanGhostRef.current.position.x = -1.175 - glitchOffset;
    }
    if (ghostsVisible) {
      redGhostMaterial.opacity  = glitchOpacity;
      cyanGhostMaterial.opacity = glitchOpacity;
    }

    // ── About bridge ────────────────────────────────────────────────────
    // The CSS3DObject lives in the scene permanently. While inTunnelRef is
    // true we actively drive its transform off the camera; once the pinned
    // zone ends we simply stop updating it (it holds its last transform)
    // and it scrolls away naturally with the rest of the sticky container.
    if (inTunnelRef.current && aboutObjRef.current) {
      const tiltRamp = gsap.utils.clamp(0, 1, p / 0.9);
      const m = mouseRef?.current ?? { x: 0, y: 0 };

      tmpDir.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpPos.current.copy(camera.position).addScaledVector(tmpDir.current, 1.4);
      tmpPos.current.x -= 0.11;

      const obj = aboutObjRef.current;
      obj.position.copy(tmpPos.current);
      obj.quaternion.copy(camera.quaternion);

      const baseTargetY = START_ROT_Y + tiltRamp * (END_ROT_Y - START_ROT_Y);
      const targetY      = baseTargetY + m.x * 0.35 * tiltRamp;
      rotYRef.current += (targetY - rotYRef.current) * 0.15;

      obj.rotateY(rotYRef.current);
      obj.rotateX(-0.08);

      const scaleRamp = gsap.utils.clamp(0.05, 1, tiltRamp);
      obj.scale.setScalar(ABOUT_UNIT_SCALE * scaleRamp);

      obj.element.style.opacity = String(tiltRamp * tiltRamp);

      if (cssRendererRef.current && cssSceneRef.current) {
        cssRendererRef.current.render(cssSceneRef.current, camera);
      }
    }

    onFrame?.(p);
  });

  return (
    <>
      <ambientLight
        ref={ambientLightRef}
        intensity={isDarkMode ? 0.18 : 0.08}
        color={isDarkMode ? "#2a0500" : "#1a0800"}
      />
      <directionalLight
        ref={dirLight1Ref}
        position={[HOLE_X - 3, HOLE_Y + 1.5, GROUP_Z + 4]}
        intensity={isDarkMode ? 9 : 14}
        color={isDarkMode ? "#FF3300" : "#FF6600"}
      />
      <directionalLight
        ref={dirLight2Ref}
        position={[HOLE_X + 0.3, HOLE_Y - 2, GROUP_Z + 1]}
        intensity={isDarkMode ? 3 : 5}
        color={isDarkMode ? "#220000" : "#330000"}
      />
      <pointLight
        ref={mainPointLightRef}
        position={[HOLE_X, HOLE_Y, GROUP_Z + 0.3]}
        intensity={isDarkMode ? 14 : 27}
        distance={isDarkMode ? 2.4 : 3.2}
        color={isDarkMode ? "#FFAA00" : "#FF5500"}
        decay={2}
      />
      {!isDarkMode && (
        <pointLight
          ref={fillPointLightRef}
          position={[HOLE_X, HOLE_Y - 0.6, GROUP_Z + 0.8]}
          intensity={6}
          distance={2.0}
          color="#440000"
          decay={2}
        />
      )}
      <pointLight
        ref={headlampRef}
        intensity={isDarkMode ? 2.5 : 4.0}
        distance={2.4}
        decay={2}
        color="#FFD9A0"
      />

      <Selection>
        {!DEBUG_SKIP_EFFECTS && (
          <EffectComposer autoClear={false}>
            <SelectiveBloom
              lights={bloomLights}
              intensity={isDarkMode ? 0.6 : 0.9}
              luminanceThreshold={isDarkMode ? 0.35 : 0.45}
              luminanceSmoothing={0.6}
            />
          </EffectComposer>
        )}

        <Select enabled>
          <group scale={[0.01, -0.01, 1]} position={[-1.175, 1.65, GROUP_Z]}>
            {shapes.map((shape, i) => (
              <mesh key={i} material={[faceMaterial, wallMaterial]}>
                <extrudeGeometry args={[shape, extrudeSettings]} />
              </mesh>
            ))}
          </group>

          <group
            ref={redGhostRef}
            scale={[0.01 * GHOST_SCALE_FACTOR_RED, -0.01 * GHOST_SCALE_FACTOR_RED, 1]}
            position={[-1.175, 1.65, GROUP_Z]}
          >
            {shapes.map((shape, i) => (
              <mesh key={`r-${i}`} material={redGhostMaterial}>
                <extrudeGeometry args={[shape, extrudeSettings]} />
              </mesh>
            ))}
          </group>

          <group
            ref={cyanGhostRef}
            scale={[0.01 * GHOST_SCALE_FACTOR_CYAN, -0.01 * GHOST_SCALE_FACTOR_CYAN, 1]}
            position={[-1.175, 1.65, GROUP_Z]}
          >
            {shapes.map((shape, i) => (
              <mesh key={`c-${i}`} material={cyanGhostMaterial}>
                <extrudeGeometry args={[shape, extrudeSettings]} />
              </mesh>
            ))}
          </group>
        </Select>
      </Selection>
    </>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
export const Landing = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 768);

  // The one, real About DOM node. It's created once, portal-rendered once,
  // and lives inside the CSS3D scene for the lifetime of the component.
  const [homeNode] = useState(() => document.createElement("div"));

  const containerRef       = useRef(null);
  const stickyRef          = useRef(null);
  const cssMountRef        = useRef(null);
  const zoomContainerRef   = useRef(null);
  const vaTextRef          = useRef(null);
  const rTextRef           = useRef(null);
  const unTextRef          = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const mouseRef           = useRef({ x: 0, y: 0 });
  const lastCaRef          = useRef(null);

  const progress       = useRef({ value: 0 });
  const targetProgress = useRef(0);

  // True while we're inside the pinned zoom+dwell zone. Drives the About
  // bridge update loop and the Canvas frameloop mode — purely a perf/update
  // gate now, not a DOM-relocation trigger.
  const inTunnelRef = useRef(true);
  const [inTunnelState, setInTunnelState] = useState(true);

  const cssRendererRef = useRef(null);
  const cssSceneRef    = useRef(null);
  const aboutObjRef    = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? "#000000" : "#ffffff";
  }, [isDarkMode]);

  useEffect(() => {
    const handleMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  const renderFrame = (p) => {
    const scale       = 1 + p * 20;
    const textOpacity = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.10);

    if (zoomContainerRef.current) {
      zoomContainerRef.current.style.transform = `scale(${scale})`;
      zoomContainerRef.current.style.opacity   = textOpacity;
    }

    const ca = Math.sin(p * Math.PI) * 3;
    if (lastCaRef.current === null || Math.abs(ca - lastCaRef.current) > 0.01) {
      lastCaRef.current = ca;
      const combined = `${ca}px 0 0 rgba(255,40,0,0.5), ${-ca}px 0 0 rgba(120,0,0,0.5)`;
      if (vaTextRef.current) vaTextRef.current.style.textShadow = combined;
      if (unTextRef.current) unTextRef.current.style.textShadow = combined;
    }

    if (scrollIndicatorRef.current) {
      scrollIndicatorRef.current.style.opacity = p < 0.15 ? 1 - p / 0.15 : 0;
    }
  };

  useLayoutEffect(() => {
    // ── CSS3D setup ──────────────────────────────────────────────────────
    const renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(renderer.domElement.style, {
      position: "absolute", top: "0", left: "0", pointerEvents: "none",
    });
    cssMountRef.current.appendChild(renderer.domElement);
    cssRendererRef.current = renderer;

    const scene = new THREE.Scene();
    cssSceneRef.current = scene;

    homeNode.style.pointerEvents = "auto"; // re-enable from the none-parent above
    const obj = new CSS3DObject(homeNode);
    aboutObjRef.current = obj;
    scene.add(obj); // added once, stays for the component's lifetime — no reparenting to plain DOM.

    // ── Scroll geometry ──────────────────────────────────────────────────
    const zoomHeight = () => window.innerHeight * SCROLL_ZONE_VH;
    const pinHeight   = () => window.innerHeight * (SCROLL_ZONE_VH + DWELL_VH);

    // ── Initial state (handles page load mid-scroll on refresh) ───────────
    const initialY = window.scrollY;
    const initP    = Math.min(1, Math.max(0, initialY / zoomHeight()));
    progress.current.value = initP;
    targetProgress.current = initP;
    const startInTunnel = initialY < pinHeight();
    inTunnelRef.current  = startInTunnel;
    setInTunnelState(startInTunnel);
    renderFrame(initP);

    // ── Scroll handler ──────────────────────────────────────────────────
    // No preventDefault, no manual scrollTo, no lock. Progress is just read
    // off real scrollY every event; position:sticky does the pinning.
    const onScroll = () => {
      const y = window.scrollY;
      targetProgress.current = Math.min(1, Math.max(0, y / zoomHeight()));

      const nowInTunnel = y < pinHeight();
      if (nowInTunnel !== inTunnelRef.current) {
        inTunnelRef.current = nowInTunnel;
        setInTunnelState(nowInTunnel);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => renderer.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cssMountRef.current?.removeChild(renderer.domElement);
    };
  }, [homeNode]);

  return (
    <>
      {createPortal(<AboutPreview isDark={isDarkMode} />, homeNode)}

      <div style={{ height: `${(SCROLL_ZONE_VH + DWELL_VH) * 100}vh`, position: "relative" }}>
        <div
          ref={stickyRef}
          style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}
        >
          <Navbar />

          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor:    isDarkMode ? "#000000" : "#ffffff",
              backfaceVisibility: "hidden",
              isolation:          "isolate",
              pointerEvents:      "none",
            }}
          >
            {/* CSS3D layer: the real About DOM, positioned in 3D space so it
                keystones through the R's hole as the camera dollies in. */}
            <div ref={cssMountRef} style={{ position: "absolute", inset: 0, zIndex: 16, pointerEvents: "none" }} />

            {/* WebGL layer: the R geometry, transparent background so the
                CSS3D layer shows through wherever there's no geometry. */}
            <div style={{ position: "absolute", inset: 0, zIndex: 17, pointerEvents: "none" }}>
              <Canvas
                frameloop={inTunnelState ? "always" : "demand"}
                camera={{ position: [CAM_X, CAM_Y, CAM_START], fov: 50, near: 0.001, far: 1000 }}
                style={{ width: "100%", height: "100%", background: "transparent" }}
                gl={{
                  alpha:               true,
                  antialias:           true,
                  toneMapping:         THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.2,
                }}
              >
                <Perf position="top-left" />
                <TunnelR
                  progress={progress}
                  targetProgress={targetProgress}
                  mouseRef={mouseRef}
                  isDarkMode={isDarkMode}
                  isMobile={isMobile}
                  cssRendererRef={cssRendererRef}
                  cssSceneRef={cssSceneRef}
                  aboutObjRef={aboutObjRef}
                  inTunnelRef={inTunnelRef}
                  onFrame={renderFrame}
                />
              </Canvas>
            </div>

            {/* 2D VARUN zoom */}
            <div
              ref={zoomContainerRef}
              style={{
                willChange:      "transform, opacity",
                position:        "absolute",
                zIndex:          15,
                transformOrigin: "48% 50%",
                filter:          "contrast(1.1) brightness(1.05)",
                marginTop:       isMobile ? "5vh" : "10vh",
                marginLeft:      "2vh",
              }}
            >
              <div
                className={`font-medium tracking-wide select-none absolute left-2 -top-10 md:top-[-3.5vw] text-sm sm:text-base md:text-[1.5vw] whitespace-nowrap ${isDarkMode ? "text-white/80" : "text-black/80"}`}
              >
                Hey I'm{" "}
                <Typewriter
                  text=""
                  words={["a SWE", "an ML engineer", "an AI dev", "a creative coder"]}
                  speed={120} deleteSpeed={100} pause={2350}
                />
              </div>

              <h1
                className={`text-[20vw] font-black leading-none tracking-wide select-none flex items-baseline font-Sinistre ${isDarkMode ? "text-white" : "text-black"}`}
                aria-label="Varun"
              >
                <span ref={vaTextRef} aria-hidden="true">VA</span>
                <span ref={rTextRef}  aria-hidden="true" style={{ opacity: 0 }}>R</span>
                <span ref={unTextRef} aria-hidden="true">UN</span>
              </h1>

              <div
                className={`font-medium tracking-wide select-none absolute right-2 -bottom-8 md:bottom-[-2.5vw] text-right text-sm sm:text-base md:text-[1.5vw] whitespace-nowrap ${isDarkMode ? "text-white/80" : "text-black/80"}`}
                style={{ minWidth: "min(300px, 55vw)" }}
              >
                <Typewriter text="I love" />
              </div>
            </div>

            {/* Scroll indicator */}
            <div
              ref={scrollIndicatorRef}
              style={{
                position:   "absolute", bottom: "2.5rem", left: "50%",
                transform:  "translateX(-50%)", zIndex: 30,
                display:    "flex", flexDirection: "column",
                alignItems: "center", gap: "0.5rem",
              }}
            >
              <span className={`text-sm font-medium ${isDarkMode ? "text-white/50" : "text-black/50"}`}>
                Scroll to enter
              </span>
              <ArrowDown className={`w-5 h-5 animate-bounce ${isDarkMode ? "text-white/50" : "text-black/50"}`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};