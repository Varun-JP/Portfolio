import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { Navbar } from "./Navbar";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { FluidSimulation } from "./FluidSimulation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import * as THREE from "three";
import html2canvas from "html2canvas";
import { AboutPreview } from "./AboutPreview";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

gsap.registerPlugin(Observer);

// ── 3D constants ──────────────────────────────────────────────────────────────
const GROUP_Z    = -3.5;
const CAM_START  =  4.5;
const CAM_END    =  -4.0;
const CAM_TRAVEL = CAM_START - CAM_END;

const CAM_X = -0.171;
const CAM_Y =  0.92;
const HOLE_X  = -0.128;
const HOLE_Y  =  0.615;
const ABOUT_Z = GROUP_Z - 1;

const HOLE_TRI_WORLD = [
  new THREE.Vector3(-0.13915, 0.892795, GROUP_Z),
  new THREE.Vector3(-0.44915, 0.432795, GROUP_Z),
  new THREE.Vector3(0.22509,  0.425002, GROUP_Z),
];

// ── Responsive FOV compensation ────────────────────────────────────────────
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

const FLUID_CONFIG = {
  simResolution: 1.5, dyeResolution: 512, splatRadius: 1,
  velocityDissipation: 0.88, dyeDissipation: 0.92, vorticity: 15,
  pressureDissipation: 0.8, pressureIterations: 1,
  threshold: 0.3, edgeSoftness: 0.01, inkColor: [1, 1, 1],
};

// ── AboutPlane ────────────────────────────────────────────────────────────────
function AboutPlane({ textureData, progress, mouseRef }) {
  const meshRef     = useRef(null);
  const materialRef = useRef(null);
  const rotYRef     = useRef(-1.45);

  const { texture, width, height } = textureData;
  const planeHeight = 1.4;
  const planeWidth  = planeHeight * (width / height);

  const START_ROT_Y = -1.45;
  const END_ROT_Y   = 0.0;

  const tmpDir = useRef(new THREE.Vector3());
  const tmpPos = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const p = progress.current.value;
    const tiltRamp = gsap.utils.clamp(0, 1, (p - 0.50) / 0.49);

    if (meshRef.current) {
      const m = mouseRef?.current ?? { x: 0, y: 0 };

      tmpDir.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpPos.current.copy(camera.position).addScaledVector(tmpDir.current, 1.4);
      tmpPos.current.x -= 0.11;
      meshRef.current.position.copy(tmpPos.current);

      meshRef.current.quaternion.copy(camera.quaternion);

      const baseTargetY = START_ROT_Y + tiltRamp * (END_ROT_Y - START_ROT_Y);
      const mouseSwivel = m.x * 0.12 * tiltRamp;
      const targetY     = baseTargetY + mouseSwivel;
      rotYRef.current += (targetY - rotYRef.current) * 0.08;

      meshRef.current.rotateY(rotYRef.current);
      meshRef.current.rotateX(-0.08);

      const scaleVal = gsap.utils.clamp(0.05, 0.58, tiltRamp * 0.58);
      meshRef.current.scale.setScalar(scaleVal);
    }

    const ramp = tiltRamp * tiltRamp;
    if (materialRef.current) {
      materialRef.current.opacity = ramp;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// ── TunnelR ───────────────────────────────────────────────────────────────────
function TunnelR({ progress, aboutTexture, mouseRef }) {
  const svg              = useLoader(SVGLoader, "/models/fixed_R.svg");
  const { camera, size } = useThree();

  const headlampRef  = useRef(null);
  const redGhostRef  = useRef(null);
  const cyanGhostRef = useRef(null);

  // Recompute fov on resize only — not every frame
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = fovForAspect(aspect);
    camera.updateProjectionMatrix();
  }, [size, camera]);

  const shapes = useMemo(() =>
    svg.paths.flatMap((p) => SVGLoader.createShapes(p)),
  [svg]);

  const extrudeSettings = useMemo(() => ({
    depth:         0.35,
    bevelEnabled:  false,
    curveSegments: 64,
  }), []);

  const faceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color:             "#5c2e00",
    roughness:         0.3,
    metalness:         0.5,
    emissive:          "#FFA000",
    emissiveIntensity: 0.85,
    side:              THREE.FrontSide,
    transparent:       true,
    opacity:           1,
  }), []);

  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color:             "#241000",
    roughness:         0.34,
    metalness:         0.45,
    emissive:          "#FF5500",
    emissiveIntensity: 0.4,
    side:              THREE.DoubleSide,
    transparent:       true,
    opacity:           1,
  }), []);

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
    color:       "#00ffff",
    transparent: true,
    opacity:     0,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
    side:        THREE.DoubleSide,
    toneMapped:  false,
  }), []);

  useFrame(() => {
    const p = progress.current.value;

    // Camera fixed in X/Y — only Z moves with scroll
    const camZ = GROUP_Z + (CAM_START - GROUP_Z) / (1 + p * 20);
    camera.position.set(CAM_X, CAM_Y, camZ);
    camera.lookAt(CAM_X, CAM_Y, GROUP_Z);

    const tunnelOpacity = 1 - gsap.utils.clamp(0, 1, (p - 0.97) / 0.03);
    faceMaterial.opacity = tunnelOpacity;
    wallMaterial.opacity = tunnelOpacity;

    if (headlampRef.current) {
      headlampRef.current.position.set(camera.position.x, camera.position.y, camera.position.z + 0.4);
    }

    const glitchCurve   = Math.sin(p * Math.PI);
    const glitchOffset  = glitchCurve * 0.05;
    const glitchOpacity = glitchCurve * 0.55 * tunnelOpacity;

    if (redGhostRef.current)  redGhostRef.current.position.x  = -1.175 + glitchOffset;
    if (cyanGhostRef.current) cyanGhostRef.current.position.x = -1.175 - glitchOffset;
    redGhostMaterial.opacity  = glitchOpacity;
    cyanGhostMaterial.opacity = glitchOpacity;
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#3a2200" />
      <directionalLight position={[HOLE_X - 1.5, HOLE_Y + 0.5, GROUP_Z + 6]} intensity={9} color="#FFB300" />
      <directionalLight position={[HOLE_X + 1.5, HOLE_Y - 0.5, GROUP_Z + 6]} intensity={6} color="#FF8800" />
      <pointLight position={[HOLE_X, HOLE_Y, GROUP_Z + 0.3]} intensity={14} distance={2.4} color="#FFAA00" decay={2} />
      <pointLight ref={headlampRef} intensity={2.5} distance={2.4} decay={2} color="#FFD9A0" />

      <group scale={[0.01, -0.01, 1]} position={[-1.175, 1.65, GROUP_Z]}>
        {shapes.map((shape, i) => (
          <mesh key={i} material={[faceMaterial, wallMaterial]}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
          </mesh>
        ))}
      </group>

      <group ref={redGhostRef} scale={[0.01, -0.01, 1]} position={[-1.175, 1.65, GROUP_Z]}>
        {shapes.map((shape, i) => (
          <mesh key={`r-${i}`} material={redGhostMaterial}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
          </mesh>
        ))}
      </group>
      <group ref={cyanGhostRef} scale={[0.01, -0.01, 1]} position={[-1.175, 1.65, GROUP_Z]}>
        {shapes.map((shape, i) => (
          <mesh key={`c-${i}`} material={cyanGhostMaterial}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
          </mesh>
        ))}
      </group>

      <EffectComposer>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      </EffectComposer>

      {aboutTexture && (
        <AboutPlane textureData={aboutTexture} progress={progress} mouseRef={mouseRef} />
      )}
    </>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
export const Landing = ({ phase, onComplete, onReverseComplete, onTextureReady }) => {
  const [isDarkMode, setIsDarkMode]     = useState(false);
  const [aboutTexture, setAboutTexture] = useState(null);
  const [isMobile, setIsMobile]         = useState(() => window.innerWidth < 768);

  const MAX_PROGRESS   = 1;
  const FADE_THRESHOLD = 0.99;

  const landingWrapRef     = useRef(null);
  const containerRef       = useRef(null);
  const zoomContainerRef   = useRef(null);
  const vaTextRef          = useRef(null);
  const rTextRef           = useRef(null);
  const unTextRef          = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const fluidCanvasRef     = useRef(null);
  const fluidSimRef        = useRef(null);
  const canvasWrapperRef   = useRef(null);
  const aboutCaptureRef    = useRef(null);
  const mouseRef           = useRef({ x: 0, y: 0 });
  const progress           = useRef({ value: 0 });
  const targetProgress     = useRef(0);
  const portalFiredRef     = useRef(false);
  const observerRef        = useRef(null);

  // ── track mobile breakpoint ───────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── dark mode ──────────────────────────────────────────────────────────────
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

  // ── fluid sim ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fluidCanvasRef.current) return;
    fluidSimRef.current = new FluidSimulation(fluidCanvasRef.current, FLUID_CONFIG);
  }, []);

  // ── mouse tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  // ── html2canvas → 3D texture ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const capture = async () => {
      if (!aboutCaptureRef.current) return;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(aboutCaptureRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        ignoreElements: (el) => el.tagName === "CANVAS",
      });
      if (cancelled) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const textureData = { texture, width: canvas.width, height: canvas.height };
      setAboutTexture(textureData);
      if (onTextureReady) onTextureReady(textureData);
    };
    capture();
    return () => { cancelled = true; };
  }, []);

  // ── dismiss: fade out whole landing, reveal Home ──────────────────────────
  const dismissToHome = () => {
    const wrap = landingWrapRef.current;
    if (!wrap) return;
    gsap.to(wrap, {
      opacity:  0,
      duration: 0.6,
      ease:     "power2.inOut",
      onComplete: () => {
        wrap.style.pointerEvents = "none";
        wrap.style.display       = "none";
        if (onComplete) onComplete();
      },
    });
  };

  // ── render frame ──────────────────────────────────────────────────────────
  const renderFrame = () => {
    const p = progress.current.value;

    const scale        = 1 + p * 20;
    const textOpacity  = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.10);
    const fluidOpacity = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.12);

    const ca         = Math.sin(p * Math.PI) * 3;
    const redShadow  = `${ca}px 0 0 rgba(255,0,0,0.5)`;
    const cyanShadow = `${-ca}px 0 0 rgba(0,255,255,0.5)`;

    if (zoomContainerRef.current)
      gsap.set(zoomContainerRef.current, { scale, opacity: textOpacity });

    if (fluidCanvasRef.current)
      gsap.set(fluidCanvasRef.current, { opacity: fluidOpacity });
    if (vaTextRef.current)
      vaTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;
    if (unTextRef.current)
      unTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;

    if (scrollIndicatorRef.current)
      gsap.set(scrollIndicatorRef.current, { opacity: p < 0.15 ? 1 - p / 0.15 : 0 });

    if (p >= FADE_THRESHOLD && !portalFiredRef.current && targetProgress.current >= FADE_THRESHOLD) {
      portalFiredRef.current = true;
    }
  };

  // ── scroll observer ───────────────────────────────────────────────────────
  const startObserver = () => {
    if (observerRef.current) { observerRef.current.kill(); observerRef.current = null; }
    observerRef.current = Observer.create({
      target:         window,
      type:           "wheel,touch",
      preventDefault: true,
      tolerance:      10,
      onChange: (self) => {
        const event         = self.event || {};
        const isTouchLike   = event.type?.startsWith("touch") || event.pointerType === "touch";
        const delta         = self.deltaY || self.velocityY;
        const sensitivity   = isTouchLike ? 0.004 : 0.0035;
        const adjustedDelta = isTouchLike ? -delta : delta;

        if (portalFiredRef.current) {
          if (adjustedDelta > 0) {
            // ── THE FIX: hand off to Home on the first forward scroll past the portal ──
            if (observerRef.current) { observerRef.current.kill(); observerRef.current = null; }
            dismissToHome();
            return;
          } else {
            portalFiredRef.current = false;

            const snapBack = FADE_THRESHOLD - 0.08;
            progress.current.value = MAX_PROGRESS;
            targetProgress.current = snapBack;

            gsap.killTweensOf(progress.current);
            gsap.to(progress.current, {
              value:    snapBack,
              duration: 0.55,
              ease:     "power2.out",
              onUpdate: renderFrame,
              onComplete: () => {
                targetProgress.current = snapBack;
              },
            });
          }
          return;
        }

        targetProgress.current = gsap.utils.clamp(
          0, MAX_PROGRESS,
          targetProgress.current + adjustedDelta * sensitivity
        );
        gsap.killTweensOf(progress.current);
        gsap.to(progress.current, {
          value:     targetProgress.current,
          duration:  0.3,
          overwrite: true,
          ease:      "power2.out",
          onUpdate:  renderFrame,
        });
      },
    });
  };

  // ── phase changes ─────────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = landingWrapRef.current;
    if (!wrap) return;

    if (phase === "hidden") {
      wrap.style.pointerEvents = "none";
      // Kill the Observer — it has preventDefault:true on wheel/touch which
      // blocks ALL page scroll even after body overflow is restored.
      if (observerRef.current) { observerRef.current.kill(); observerRef.current = null; }
      return;
    }

    if (phase === "reverse") {
      wrap.style.pointerEvents = "auto";
      wrap.style.display       = "";
      wrap.style.opacity       = "1";
      document.body.style.overflow = "hidden";
      document.body.style.height   = "100vh";
      progress.current.value = MAX_PROGRESS;
      targetProgress.current = MAX_PROGRESS;
      portalFiredRef.current = false;
      if (observerRef.current) { observerRef.current.kill(); observerRef.current = null; }
      gsap.to(progress.current, {
        value:    0,
        duration: 1.5,
        ease:     "power2.inOut",
        onUpdate: renderFrame,
        onComplete: () => { if (onReverseComplete) onReverseComplete(); },
      });
      return;
    }

    if (phase === "forward") {
      wrap.style.pointerEvents = "auto";
      wrap.style.display       = "";
      wrap.style.opacity       = "1";
      progress.current.value   = 0;
      targetProgress.current   = 0;
      portalFiredRef.current   = false;
      document.body.style.overflow = "hidden";
      document.body.style.height   = "100vh";
      renderFrame();
      startObserver();
    }
  }, [phase]);

  // ── initial mount ──────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    progress.current.value = 0;
    targetProgress.current = 0;
    portalFiredRef.current = false;
    document.body.style.overflow = "hidden";
    document.body.style.height   = "100vh";
    renderFrame();
    startObserver();
    return () => {
      if (observerRef.current) observerRef.current.kill();
      document.body.style.overflow = "";
      document.body.style.height   = "";
    };
  }, []);

  return (
    <div
      ref={landingWrapRef}
      style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "auto" }}
    >
      <Navbar />

      {/* Off-screen About snapshot — html2canvas only, never visible */}
      <div
        ref={aboutCaptureRef}
        aria-hidden="true"
        style={{ position: "fixed", left: "-99999px", top: 0, zIndex: -1 }}
      >
        <AboutPreview />
      </div>

      <div
        ref={containerRef}
        className="fixed inset-0 w-full h-screen overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: isDarkMode ? "#000000" : "#f9fafb",
          backfaceVisibility: "hidden",
          isolation: "isolate",
        }}
      >
        {/* Fluid canvas */}
        <canvas
          ref={fluidCanvasRef}
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100vw", height: "100vh",
            zIndex: 40, pointerEvents: "none",
            mixBlendMode: "difference",
          }}
        />

        {/* 3D tunnel */}
        <div
          ref={canvasWrapperRef}
          style={{
            position: "absolute", inset: 0,
            zIndex: 17, opacity: 1,
            pointerEvents: "none",
          }}
        >
          <Canvas
            camera={{ position: [CAM_X, CAM_Y, CAM_START], fov: 50, near: 0.001, far: 1000 }}
            style={{ width: "100%", height: "100%", background: "transparent" }}
            gl={{
              alpha: true,
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.2,
            }}
          >
            <TunnelR progress={progress} aboutTexture={aboutTexture} mouseRef={mouseRef} />
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
            marginTop:       isMobile ? "5vh" : "8vh",
            marginLeft:      "2vh",
          }}
        >
          <div className={`font-medium tracking-wide select-none absolute left-2 -top-10 md:-top-[3.5vw] text-sm sm:text-base md:text-[1.5vw] whitespace-nowrap ${isDarkMode ? "text-white/80" : "text-black/80"}`}>
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
            <span ref={rTextRef} aria-hidden="true" style={{ opacity: 0 }}>R</span>
            <span ref={unTextRef} aria-hidden="true">UN</span>
          </h1>

          <div
            className={`font-medium tracking-wide select-none absolute right-2 -bottom-8 md:-bottom-[2.5vw] text-right text-sm sm:text-base md:text-[1.5vw] whitespace-nowrap ${isDarkMode ? "text-white/80" : "text-black/80"}`}
            style={{ minWidth: "min(300px, 55vw)" }}
          >
            <Typewriter text="I love" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          ref={scrollIndicatorRef}
          style={{
            position:  "absolute", bottom: "2.5rem", left: "50%",
            transform: "translateX(-50%)", zIndex: 30,
            display:   "flex", flexDirection: "column",
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
  );
};