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
import { EffectComposer, SelectiveBloom, Selection, Select } from "@react-three/postprocessing";
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

const SCROLL_ZONE_VH = 1.5; // page-structure reference: sticky zone length & scrollTo target
const WHEEL_VH       = 0.5; // how much wheel/touch travel (in vh) completes the full animation
                             // lower = snappier, higher = more deliberate. tune this freely.
const DWELL_EXTRA_VH = 0;
const DWELL_VH       = 1; // matches the sticky wrapper's own height (100vh) — the scene passes
                           // by once, fully, then the next section follows immediately with no
                           // dead scroll gap and no premature crop.

// Momentum guard tuning — see full explanation inside useLayoutEffect where it's used.
const MOMENTUM_GUARD_MAX_MS = 600; // hard ceiling, not the real trigger
const MOMENTUM_IDLE_MS      = 120; // no scroll events for this long = momentum has died

// How close rotYRef must get to its target (radians) and how close tiltRamp
// must be to 1 before we consider the About plane "visually settled."
// Matches the lerp factor used inside AboutPlane (0.08) — tightened enough
// that the skew in the screenshot bug can't sneak through, loose enough that
// we're not waiting on the asymptote forever.
const ABOUT_ROT_EPS  = 0.015;
const ABOUT_RAMP_EPS = 0.01;

// How far progress must drop from the "done" end (1.0) before we consider
// the tunnel to have genuinely left its settled/finished state. This is the
// threshold hasLeftEndRef uses to decide "we're no longer just re-reading a
// stale done flag, the user actually scrolled backward."
const LEFT_END_THRESHOLD = 0.98;

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
// aboutSettledRef is written to directly (not via a callback prop) so the
// parent (Landing, via TunnelR) can gate the scroll unlock on the *actual*
// rotation lerp reaching its target. Writing the ref directly avoids an
// earlier bug: passing an inline `(v) => ...` callback meant a new function
// identity on every unrelated re-render of Landing, which retriggered a
// cleanup effect that forced the ref back to false — with no way to recover,
// since the internal "did it change" tracking never got re-synced. A plain
// ref write every frame sidesteps that whole class of problem.
function AboutPlane({ textureData, progress, mouseRef, isMobile, aboutSettledRef }) {
  const meshRef      = useRef(null);
  const mirrorRef    = useRef(null);
  const materialRef  = useRef(null);
  const mirrorMat    = useRef(null);
  const rotYRef      = useRef(-1.45);

  const { texture, width, height } = textureData;
  const planeHeight = isMobile ? 2.1 : 1.3;
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

  // Reset to false on mount so re-entering (e.g. AboutPlane remounts if
  // aboutTexture briefly clears) starts from an unsettled state rather than
  // stale data from a previous mount.
  useEffect(() => {
    if (aboutSettledRef) aboutSettledRef.current = false;
  }, []);

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
      const scaleVal = gsap.utils.clamp(0.05, isMobile ? 0.9 : 0.58, tiltRamp * (isMobile ? 0.9 : 0.58));
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

      // Settled = tiltRamp has essentially maxed out (we're at/near the end
      // of the scroll-driven tilt) AND the damped rotation has actually
      // caught up to its target — not just "progress is done." Written
      // directly to the ref every frame; cheap, and avoids any change-
      // detection desync since there's no intermediate callback to miss.
      const rampDone = tiltRamp >= 1 - ABOUT_RAMP_EPS;
      const rotDone  = Math.abs(targetY - rotYRef.current) < ABOUT_ROT_EPS;
      if (aboutSettledRef) aboutSettledRef.current = rampDone && rotDone;
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
function TunnelR({ progress, aboutTexture, mouseRef, isDarkMode, isMobile, aboutSettledRef }) {
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

  // SelectiveBloom needs the ref list itself (not a derived array) on mount,
  // then a second render once lights are attached so it picks them up —
  // otherwise it'd be stuck with an empty array from the first render.
  const [lightsMounted, setLightsMounted] = useState(false);
  useEffect(() => { setLightsMounted(true); }, []);

  const bloomLights = [
    ambientLightRef.current,
    dirLight1Ref.current,
    dirLight2Ref.current,
    mainPointLightRef.current,
    fillPointLightRef.current,
    headlampRef.current,
  ].filter(Boolean);

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
    // Skip the draw call (and its pass through the Bloom selection) entirely
    // when the ghost layers are effectively invisible — this is most of the
    // scroll range, since sin(p*PI) is near zero outside the middle.
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
        <EffectComposer autoClear={false}>
          <SelectiveBloom
            lights={bloomLights}
            intensity={isDarkMode ? 0.6 : 0.9}
            luminanceThreshold={isDarkMode ? 0.35 : 0.45}
            luminanceSmoothing={0.6}
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
          isMobile={isMobile}
          aboutSettledRef={aboutSettledRef}
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
  const isAnimating    = useRef(false);
  // True while the body is locked and wheel/touch events drive progress directly.
  // Flips to false only once ALL of: tunnel progress is done, the About
  // texture has been captured, AND the About plane's rotation lerp has
  // actually settled (not just "progress says we're done").
  const bodyLocked     = useRef(false);

  // Mirrors aboutTexture into a ref so the rAF loop (captured once in
  // useLayoutEffect) always reads the latest readiness state without a
  // stale-closure problem.
  const textureReadyRef = useRef(false);
  useEffect(() => {
    textureReadyRef.current = !!aboutTexture;
  }, [aboutTexture]);

  // Set by AboutPlane (via TunnelR) whenever its damped rotation actually
  // catches up to its target. This is the piece that was missing before —
  // progress hitting 0.99 does NOT mean the plane has visually stopped
  // moving, since it has its own independent lerp.
  const aboutSettledRef = useRef(false);

  // Guards against the relock race: when the user scrolls back up past
  // scrollZone, onScroll relocks the body immediately, but progress,
  // aboutSettledRef, etc. are all still sitting at their "fully forward /
  // fully settled" values from before — nothing has moved yet to invalidate
  // them. Without this guard, the very first tick() after relock sees
  // progress >= 0.99 && aboutSettledRef.current === true (both stale-true)
  // and immediately unlocks again in the same frame, undoing the relock
  // before a single wheel event can move targetProgress backward. That's
  // what caused both "scrolling back up snaps me right back down" and
  // "scrolling forward fast afterward skips straight to Skills."
  // Defaults to true because on initial mount progress starts at 0, so
  // progress.current.value >= 0.99 already gates readyToUnlock on its own —
  // this ref only needs to actively guard on *relock*, not on first load.
  const hasLeftEndRef = useRef(true);

  // Gate refs so we only ever touch state/DOM when a value actually crosses
  // a meaningful threshold, instead of every single animation frame.
  const pointerEventsRef = useRef(false);
  const lastCaRef         = useRef(null);

  const [canvasPointerEvents, setCanvasPointerEvents] = useState(false);

  // Hard visual lock for Skills. Deliberately independent of the scroll/sticky
  // mechanics below: position:sticky releases purely based on scrollY vs.
  // container height, which can be nudged past the boundary by things our
  // wheel/touch handlers never see — trackpad rubber-band momentum,
  // Space/PageDown/arrow-key scrolling, etc. Rather than plugging every one
  // of those leaks individually, this renders an opaque, pointer-events:none
  // overlay above Skills (below the navbar) until real readiness is reached,
  // then fades out. It never blocks clicks/scroll — pure paint-order mask.
  //
  // Important: the overlay must ONLY be considered "needed" once scrollY has
  // actually crossed the sticky boundary (scrollZone). During the entire
  // locked tunnel phase, document.body.style.overflow = "hidden" keeps
  // scrollY at 0, so showOverlay stays false and the tunnel/VARUN text/scroll
  // indicator render normally. Without this check the overlay (zIndex 40) sat
  // on top of the tunnel scene (zIndex 17) etc. from the very first frame,
  // blacking out the entire intro — not just the Skills handoff.
  const [contentRevealed, setContentRevealed] = useState(false);
  const revealedRef = useRef(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const showOverlayRef = useRef(false);
  const scrollZoneRef  = useRef(0);

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

    if (zoomContainerRef.current)
      gsap.set(zoomContainerRef.current, { scale, opacity: textOpacity });

    // Only rebuild/apply the textShadow strings when the offset has moved
    // enough to matter visually — avoids churning style + string concat
    // every single frame.
    const ca = Math.sin(p * Math.PI) * 3;
    if (lastCaRef.current === null || Math.abs(ca - lastCaRef.current) > 0.01) {
      lastCaRef.current = ca;
      const redShadow  = `${ca}px 0 0 rgba(255,40,0,0.5)`;
      const cyanShadow = `${-ca}px 0 0 rgba(120,0,0,0.5)`;
      const combined    = `${redShadow}, ${cyanShadow}`;
      if (vaTextRef.current) vaTextRef.current.style.textShadow = combined;
      if (unTextRef.current) unTextRef.current.style.textShadow = combined;
    }

    if (scrollIndicatorRef.current)
      gsap.set(scrollIndicatorRef.current, { opacity: p < 0.15 ? 1 - p / 0.15 : 0 });

    const wantsPointer = p > 0.75;
    if (wantsPointer !== pointerEventsRef.current) {
      pointerEventsRef.current = wantsPointer;
      setCanvasPointerEvents(wantsPointer);
    }
  };

  useLayoutEffect(() => {
    const LERP_FACTOR = 0.07;
    const SETTLE_EPS  = 0.0005;
    const scrollZone  = window.innerHeight * SCROLL_ZONE_VH;
    scrollZoneRef.current = scrollZone;

    // ── Momentum guard ──────────────────────────────────────────────────────
    // After unlock, a still-in-flight trackpad/wheel fling (or a coalesced
    // batch of events after a pause-then-resume) can carry native scroll
    // straight past the About block into Skills in the same gesture that
    // triggered unlock. This clamps scrollY to the end of the About block
    // for as long as scroll events keep arriving in quick succession, and
    // releases automatically once they go quiet (velocity-based, not a
    // fixed timer) — so a slow, deliberate scroll-through is untouched.
    //
    // Declared here (not at module scope) so it closes over the real
    // `scrollZone` computed above, and so its rAF/timeout handles can be
    // torn down by this same effect's cleanup on unmount.
    let momentumGuardActive = false;
    let lastWheelAt         = 0;
    let guardRafId          = null;
    let guardTimeoutId      = null;

    const clampToAboutZone = () => {
      const max = scrollZone + window.innerHeight * DWELL_VH;
      if (window.scrollY > max) {
        window.scrollTo({ top: max, behavior: "instant" });
      }
    };

    const armMomentumGuard = () => {
      momentumGuardActive = true;
      lastWheelAt = performance.now();

      const check = () => {
        const idle = performance.now() - lastWheelAt;
        clampToAboutZone();
        if (idle > MOMENTUM_IDLE_MS) {
          momentumGuardActive = false;
          return;
        }
        guardRafId = requestAnimationFrame(check);
      };
      guardRafId = requestAnimationFrame(check);

      // Hard ceiling so a pathological case can't hold the guard forever
      guardTimeoutId = setTimeout(() => { momentumGuardActive = false; }, MOMENTUM_GUARD_MAX_MS);
    };

    // If the user refreshes while already past the animation zone (e.g. mid-page),
    // skip locking and start in the unlocked state so they aren't trapped.
    if (window.scrollY >= scrollZone) {
      progress.current.value = 1;
      targetProgress.current = 1;
      bodyLocked.current     = false;
      revealedRef.current    = true;
      setContentRevealed(true);
      showOverlayRef.current = false; // already-revealed case never needs the mask
      renderFrame();
    } else {
      // Lock body scroll for the animation phase. Wheel/touch events will
      // drive progress directly so native scroll can never race ahead of the
      // visual and skip to the next section prematurely.
      bodyLocked.current           = true;
      document.body.style.overflow = "hidden";
      document.body.style.height   = "100vh";
      renderFrame();
    }

    const tick = () => {
      const current = progress.current.value;
      const target  = targetProgress.current;
      const next    = current + (target - current) * LERP_FACTOR;
      const progressSettled = Math.abs(target - next) < SETTLE_EPS;

      progress.current.value = progressSettled ? target : next;

      // Earn the "has left end" flag: only flips true once progress has
      // genuinely dropped below the threshold during THIS lock session.
      // Set before readyToUnlock is computed so the same tick that crosses
      // the threshold can also (correctly) still block unlock — it only
      // unblocks on a subsequent tick once progress climbs back up.
      if (progress.current.value < LEFT_END_THRESHOLD) {
        hasLeftEndRef.current = true;
      }

      renderFrame();

      // Unlock only once ALL FOUR are true:
      //   1. progress has genuinely left the "done" zone at least once
      //      during this lock session (guards against relock racing back
      //      open on stale "already done" values)
      //   2. tunnel progress has essentially reached the end
      //   3. the About texture capture has resolved
      //   4. the About plane's own rotation lerp has actually settled
      const readyToUnlock =
        hasLeftEndRef.current &&
        progress.current.value >= 0.99 &&
        textureReadyRef.current &&
        aboutSettledRef.current;

      // The overlay reveal fires on the exact same condition as the scroll
      // unlock, but is tracked separately (revealedRef/setContentRevealed)
      // so it stays correct even if scrollY has already leaked past the
      // sticky boundary through some path our wheel/touch/scroll handlers
      // don't cover — the mask doesn't care how scrollY got there.
      if (readyToUnlock && !revealedRef.current) {
        revealedRef.current = true;
        setContentRevealed(true);
      }

      if (bodyLocked.current && readyToUnlock) {
        bodyLocked.current           = false;
        document.body.style.overflow = "";
        document.body.style.height   = "";
        window.scrollTo({ top: scrollZone, behavior: "instant" });
        armMomentumGuard();
      }

      // Keep the loop alive while locked-but-waiting on the left-end guard,
      // texture, or rotation settle — even if progress itself has numerically
      // settled — otherwise we stop ticking and never re-check the refs once
      // they flip true. This matters most right after relock: progress may
      // sit unmoved for a frame or two before the first wheel delta arrives,
      // and we don't want the loop to bail out during that gap.
      const stillWaiting =
        bodyLocked.current &&
        (!hasLeftEndRef.current ||
          progress.current.value >= 0.99 &&
            (!textureReadyRef.current || !aboutSettledRef.current));

      if (!progressSettled || stillWaiting) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        isAnimating.current = false;
        rafId.current       = null;
      }
    };

    const wakeAnimation = () => {
      if (!isAnimating.current) {
        isAnimating.current = true;
        rafId.current       = requestAnimationFrame(tick);
      }
    };

    // ── Wheel ────────────────────────────────────────────────────────────────
    // Only intercept while the body is locked (forward animation phase).
    // Once unlocked, the browser drives scroll natively and onScroll handles
    // backward / repeat scrolling.
    // Divisor uses WHEEL_VH (not scrollZone) so sensitivity is independent
    // of the page structure — change WHEEL_VH at the top to tune feel.
    const wheelZone = window.innerHeight * WHEEL_VH;
    const onWheel = (e) => {
      if (!bodyLocked.current) return;
      // Allow scrolling up at the very top so the user is never trapped.
      if (targetProgress.current <= 0 && e.deltaY < 0) return;
      e.preventDefault();
      const delta = e.deltaY / wheelZone;
      targetProgress.current = Math.min(1, Math.max(0, targetProgress.current + delta));
      wakeAnimation();
    };

    // ── Touch (mobile) ───────────────────────────────────────────────────────
    let lastTouchY = 0;
    const onTouchStart = (e) => { lastTouchY = e.touches[0].clientY; };
    const onTouchMove  = (e) => {
      if (!bodyLocked.current) return;
      e.preventDefault();
      const dy       = lastTouchY - e.touches[0].clientY;
      lastTouchY     = e.touches[0].clientY;
      const delta    = dy / wheelZone;
      targetProgress.current = Math.min(1, Math.max(0, targetProgress.current + delta));
      wakeAnimation();
    };

    // ── Scroll ───────────────────────────────────────────────────────────────
    // Drives targetProgress for backward / repeat scrolling once the body is
    // unlocked. Ignored during the locked phase (wheel/touch handles it then).
    const onScroll = () => {
      if (!bodyLocked.current && window.scrollY < scrollZone) {
        bodyLocked.current = true;
        document.body.style.overflow = "hidden";
        document.body.style.height = "100vh";
        revealedRef.current = false;
        setContentRevealed(false);
        // Reset the guard on every relock — it must be earned again this
        // session. This is the piece that was missing: without it, the
        // stale-true progress/aboutSettled values from the previous forward
        // pass let tick() unlock again on the very next frame, before any
        // wheel input had a chance to move targetProgress backward.
        hasLeftEndRef.current = false;
        wakeAnimation();
        return;
      }

      if (bodyLocked.current) return;
      if (momentumGuardActive) { lastWheelAt = performance.now(); clampToAboutZone(); }
      const p = Math.min(1, Math.max(0, window.scrollY / scrollZone));
      targetProgress.current = p;
      wakeAnimation();
    };

    // ── Overlay visibility ──────────────────────────────────────────────────
    // Deliberately NOT gated by bodyLocked — this is the whole point. It only
    // cares whether scrollY has actually crossed the sticky boundary, however
    // that happened (our own scrollTo, a scroll leak, whatever). While the
    // tunnel is locked, body.style.overflow = "hidden" keeps scrollY at 0, so
    // this stays false and the overlay stays invisible the entire intro.
    const OVERLAY_EPS = 2; // px tolerance
    const onScrollForOverlay = () => {
      const needed = window.scrollY >= scrollZone - OVERLAY_EPS;
      if (needed !== showOverlayRef.current) {
        showOverlayRef.current = needed;
        setShowOverlay(needed);
      }
    };
    onScrollForOverlay(); // sync initial state immediately, don't wait for first scroll event

    window.addEventListener("wheel",      onWheel,             { passive: false });
    window.addEventListener("touchstart", onTouchStart,        { passive: true  });
    window.addEventListener("touchmove",  onTouchMove,         { passive: false });
    window.addEventListener("scroll",     onScroll,            { passive: true  });
    window.addEventListener("scroll",     onScrollForOverlay,  { passive: true  });

    return () => {
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("scroll",     onScroll);
      window.removeEventListener("scroll",     onScrollForOverlay);
      document.body.style.overflow = "";
      document.body.style.height   = "";
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (guardRafId) cancelAnimationFrame(guardRafId);
      if (guardTimeoutId) clearTimeout(guardTimeoutId);
    };
  }, []);

  return (
    <>
      <div style={{ height: `${(SCROLL_ZONE_VH + DWELL_VH) * 100}vh`, position: "relative" }}>

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
                  isMobile={isMobile}
                  aboutSettledRef={aboutSettledRef}
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

      {/* Hard visual lock: opaque mask above Skills (below the navbar) until
          the tunnel + About reveal are actually done.
          opacity is gated on TWO things:
            - showOverlay: have we actually crossed the sticky boundary
              (scrollY >= scrollZone)? False for the entire locked tunnel
              intro, since body.style.overflow="hidden" keeps scrollY at 0
              then — this is what stops the mask from blacking out the tunnel
              animation itself.
            - contentRevealed: has real readiness (progress + texture +
              About settle) actually been reached?
          Fixed positioning means once relevant, it covers the viewport
          regardless of how scrollY got past the boundary (our own scrollTo,
          a scroll leak, whatever) — can't be defeated by sticky-release edge
          cases. pointerEvents: none means it never intercepts clicks —
          navbar and everything else behind it keeps working normally. */}
      <div
        aria-hidden="true"
        style={{
          position:        "fixed",
          inset:            0,
          zIndex:           40,
          backgroundColor: isDarkMode ? "#000000" : "#ffffff",
          opacity:          (showOverlay && !contentRevealed) ? 1 : 0,
          pointerEvents:    "none",
          transition:       "opacity 0.25s ease-out",
        }}
      />
    </>
  );
};