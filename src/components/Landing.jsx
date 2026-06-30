import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { Navbar } from "./Navbar";
import gsap from "gsap";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import * as THREE from "three";
import html2canvas from "html2canvas";
import { AboutPreview } from "./AboutPreview";
import { EffectComposer, Bloom, Selection, Select } from "@react-three/postprocessing";

// ── 3D constants ──────────────────────────────────────────────────────────────
const GROUP_Z    = -3.5;
const CAM_START  =  5.5;
const CAM_END    =  -4.0;
const CAM_TRAVEL = CAM_START - CAM_END;

const CAM_X = -0.199;
const CAM_Y =  1;
const HOLE_X  = -0.128;
const HOLE_Y  =  0.615;
const ABOUT_Z = GROUP_Z - 1;

const HOLE_TRI_WORLD = [
  new THREE.Vector3(-0.13915, 0.892795, GROUP_Z),
  new THREE.Vector3(-0.44915, 0.432795, GROUP_Z),
  new THREE.Vector3(0.22509,  0.425002, GROUP_Z),
];

const SCROLL_ZONE_VH = 1.5;

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

// ── Mirror fade shader ────────────────────────────────────────────────────────
const MIRROR_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const MIRROR_FRAG = `
  uniform sampler2D map;
  uniform float opacity;
  varying vec2 vUv;
  void main() {
    vec4 col = texture2D(map, vUv);
    float fade = vUv.y * vUv.y * 0.38;
    gl_FragColor = vec4(col.rgb, col.a * opacity * fade);
  }
`;

// ── AboutPlane ────────────────────────────────────────────────────────────────
function AboutPlane({ textureData, progress, mouseRef }) {
  const meshRef      = useRef(null);
  const mirrorRef    = useRef(null);
  const materialRef  = useRef(null);
  const mirrorMat    = useRef(null);
  const rotYRef      = useRef(-1.45);

  const { texture, width, height } = textureData;
  const planeHeight = 1.3;
  const planeWidth  = planeHeight * (width / height);

  const MIRROR_GAP  = 0.045;
  const START_ROT_Y = -1.45;
  const END_ROT_Y   =  0.0;

  const tmpDir  = useRef(new THREE.Vector3());
  const tmpPos  = useRef(new THREE.Vector3());
  const tmpDown = useRef(new THREE.Vector3());

  useEffect(() => {
    mirrorMat.current = new THREE.ShaderMaterial({
      uniforms: {
        map:     { value: texture },
        opacity: { value: 0 },
      },
      vertexShader:   MIRROR_VERT,
      fragmentShader: MIRROR_FRAG,
      transparent:    true,
      depthWrite:     false,
      side:           THREE.DoubleSide,
    });
    if (mirrorRef.current) {
      mirrorRef.current.material = mirrorMat.current;
    }
    return () => {
      mirrorMat.current?.dispose();
    };
  }, [texture]);

  useFrame(({ camera }) => {
    const p        = progress.current.value;
    const tiltRamp = gsap.utils.clamp(0, 1, p / 0.9);

    if (meshRef.current) {
      const m = mouseRef?.current ?? { x: 0, y: 0 };

      tmpDir.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpPos.current.copy(camera.position).addScaledVector(tmpDir.current, 1.4);
      tmpPos.current.x -= 0.11;
      meshRef.current.position.copy(tmpPos.current);
      meshRef.current.quaternion.copy(camera.quaternion);

      const baseTargetY = START_ROT_Y + tiltRamp * (END_ROT_Y - START_ROT_Y);
      const mouseSwivel = m.x * 0.35 * tiltRamp;
      const targetY     = baseTargetY + mouseSwivel;
      rotYRef.current  += (targetY - rotYRef.current) * 0.08;

      meshRef.current.rotateY(rotYRef.current);
      meshRef.current.rotateX(-0.08);

      const scaleVal = gsap.utils.clamp(0.05, 0.58, tiltRamp * 0.58);
      meshRef.current.scale.setScalar(scaleVal);

      if (mirrorRef.current) {
        mirrorRef.current.position.copy(meshRef.current.position);
        mirrorRef.current.quaternion.copy(meshRef.current.quaternion);
        mirrorRef.current.scale.copy(meshRef.current.scale);

        tmpDown.current
          .set(0, -1, 0)
          .applyQuaternion(meshRef.current.quaternion)
          .multiplyScalar((planeHeight + MIRROR_GAP) * scaleVal);
        mirrorRef.current.position.add(tmpDown.current);

        mirrorRef.current.scale.y *= -1;
      }
    }

    const ramp = tiltRamp * tiltRamp;
    if (materialRef.current)       materialRef.current.opacity = ramp;
    if (mirrorMat.current)         mirrorMat.current.uniforms.opacity.value = ramp;
  });

  const handleClick = () => {
    const el = document.getElementById("about");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() =>  { document.body.style.cursor = "default"; }}
      >
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

      <mesh ref={mirrorRef} position={[0, 0, 0]}>
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
}

// ── TunnelR ───────────────────────────────────────────────────────────────────
function TunnelR({ progress, aboutTexture, mouseRef, isDarkMode }) {
  const svg              = useLoader(SVGLoader, "/models/fixed_R.svg");
  const { camera, size } = useThree();

  const headlampRef  = useRef(null);
  const redGhostRef  = useRef(null);
  const cyanGhostRef = useRef(null);

  const GHOST_SCALE_FACTOR_RED  = 0.995;
  const GHOST_SCALE_FACTOR_CYAN = 0.9999;

  useEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = fovForAspect(aspect);
    camera.updateProjectionMatrix();
  }, [size, camera]);

  const shapes = useMemo(() =>
    svg.paths.flatMap((p) => SVGLoader.createShapes(p)),
  [svg]);

  const extrudeSettings = useMemo(() => ({
    depth:          0.35,
    bevelEnabled:   true,
    bevelThickness: 0.008,
    bevelSize:      0.108,
    bevelSegments:  2,
    curveSegments:  64,
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

  useFrame(() => {
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

    if (redGhostRef.current)  redGhostRef.current.position.x  = -1.175 + glitchOffset;
    if (cyanGhostRef.current) cyanGhostRef.current.position.x = -1.175 - glitchOffset;
    redGhostMaterial.opacity  = glitchOpacity;
    cyanGhostMaterial.opacity = glitchOpacity;
  });

  return (
    <>
      <ambientLight
        intensity={isDarkMode ? 0.18 : 0.08}
        color={isDarkMode ? "#2a0500" : "#1a0800"}
      />
      <directionalLight
        position={[HOLE_X - 3, HOLE_Y + 1.5, GROUP_Z + 4]}
        intensity={isDarkMode ? 9 : 14}
        color={isDarkMode ? "#FF3300" : "#FF6600"}
      />
      <directionalLight
        position={[HOLE_X + 0.3, HOLE_Y - 2, GROUP_Z + 1]}
        intensity={isDarkMode ? 3 : 5}
        color={isDarkMode ? "#220000" : "#330000"}
      />
      <pointLight
        position={[HOLE_X, HOLE_Y, GROUP_Z + 0.3]}
        intensity={isDarkMode ? 14 : 27}
        distance={isDarkMode ? 2.4 : 3.2}
        color={isDarkMode ? "#FFAA00" : "#FF5500"}
        decay={2}
      />
      {!isDarkMode && (
        <pointLight
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
        <EffectComposer autoClear={false}>
          <Bloom
            intensity={isDarkMode ? 0.6 : 0.9}
            luminanceThreshold={isDarkMode ? 0.35 : 0.45}
            luminanceSmoothing={8}
            mipmapBlur
          />
        </EffectComposer>

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

      {aboutTexture && (
        <AboutPlane
          textureData={aboutTexture}
          progress={progress}
          mouseRef={mouseRef}
        />
      )}
    </>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
export const Landing = () => {
  const [isDarkMode, setIsDarkMode]     = useState(() => document.documentElement.classList.contains("dark"));
  const [aboutTexture, setAboutTexture] = useState(null);
  const [isMobile, setIsMobile]         = useState(() => window.innerWidth < 768);

  const containerRef       = useRef(null);
  const stickyRef          = useRef(null);
  const zoomContainerRef   = useRef(null);
  const vaTextRef          = useRef(null);
  const rTextRef           = useRef(null);
  const unTextRef          = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const canvasWrapperRef   = useRef(null);
  const aboutCaptureRef    = useRef(null);
  const mouseRef           = useRef({ x: 0, y: 0 });

  const progress       = useRef({ value: 0 });
  const targetProgress = useRef(0);
  const rafId          = useRef(null);

  const [canvasPointerEvents, setCanvasPointerEvents] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    const capture = async () => {
      if (!aboutCaptureRef.current) return;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(aboutCaptureRef.current, {
        backgroundColor: isDarkMode ? "#000000" : "#ffffff",
        scale: 2,
        ignoreElements: (el) => el.tagName === "CANVAS",
      });
      if (cancelled) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      setAboutTexture({ texture, width: canvas.width, height: canvas.height });
    };
    capture();
    return () => { cancelled = true; };
  }, [isDarkMode]);

  const renderFrame = () => {
    const p = progress.current.value;

    const scale       = 1 + p * 20;
    const textOpacity = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.10);

    const ca         = Math.sin(p * Math.PI) * 3;
    const redShadow  = `${ca}px 0 0 rgba(255,40,0,0.5)`;
    const cyanShadow = `${-ca}px 0 0 rgba(120,0,0,0.5)`;

    if (zoomContainerRef.current)
      gsap.set(zoomContainerRef.current, { scale, opacity: textOpacity });

    if (vaTextRef.current)
      vaTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;
    if (unTextRef.current)
      unTextRef.current.style.textShadow = `${redShadow}, ${cyanShadow}`;

    if (scrollIndicatorRef.current)
      gsap.set(scrollIndicatorRef.current, { opacity: p < 0.15 ? 1 - p / 0.15 : 0 });

    setCanvasPointerEvents(p > 0.75);
  };

  const DWELL_VH = 1.0;
  useLayoutEffect(() => {
    document.body.style.overflow = "";
    document.body.style.height   = "";

    const onScroll = () => {
      const scrollZone = window.innerHeight * SCROLL_ZONE_VH;
      const p = Math.min(1, Math.max(0, window.scrollY / scrollZone));
      targetProgress.current = p;
    };

    const LERP_FACTOR = 0.07;

    const tick = () => {
      const current = progress.current.value;
      const target  = targetProgress.current;
      const next    = current + (target - current) * LERP_FACTOR;
      progress.current.value = Math.abs(target - next) < 0.0005 ? target : next;
      renderFrame();
      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div style={{ height: `${(SCROLL_ZONE_VH + 1.5 + DWELL_VH) * 100}vh`, position: "relative" }}>

      <div
        ref={stickyRef}
        style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}
      >
        <Navbar />

        <div
          ref={aboutCaptureRef}
          aria-hidden="true"
          style={{ position: "fixed", left: "-99999px", top: 0, zIndex: -1 }}
        >
          <AboutPreview isDark={isDarkMode} />
        </div>

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
          {/* 3D tunnel */}
          <div
            ref={canvasWrapperRef}
            style={{
              position:      "absolute", inset: 0,
              zIndex:        17, opacity: 1,
              pointerEvents: canvasPointerEvents ? "auto" : "none",
            }}
          >
            <Canvas
              camera={{ position: [CAM_X, CAM_Y, CAM_START], fov: 50, near: 0.001, far: 1000 }}
              style={{ width: "100%", height: "100%", background: "transparent" }}
              gl={{
                alpha:               true,
                antialias:           true,
                toneMapping:         THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.2,
              }}
            >
              <TunnelR
                progress={progress}
                aboutTexture={aboutTexture}
                mouseRef={mouseRef}
                isDarkMode={isDarkMode}
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
  );
};