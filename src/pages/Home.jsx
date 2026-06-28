import { Skills } from "../components/Skills";
import { ProjectsSection } from "../components/ProjectsSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import * as THREE from "three";

// ── Shared constants (must match Landing.jsx exactly) ─────────────────────────
const GROUP_Z    = -3.5;
const CAM_X      = -0.171;
const CAM_Y      =  0.92;
const CAM_START  =  4.5;
const HOLE_X     = -0.128;
const HOLE_Y     =  0.615;
const BASE_FOV   =  50;
const REF_ASPECT = 16 / 9;

function fovForAspect(aspect) {
  if (!aspect) return BASE_FOV;
  const baseHalfV   = THREE.MathUtils.degToRad(BASE_FOV / 2);
  const lockedHalfH = Math.atan(Math.tan(baseHalfV) * REF_ASPECT);
  const neededHalfV = Math.atan(Math.tan(lockedHalfH) / aspect);
  return THREE.MathUtils.radToDeg(neededHalfV) * 2;
}

// ── StaticR — camera parked at p=1, tunnel invisible, About plane facing you ──
function StaticR({ mouseRef, aboutTexture }) {
  const svg              = useLoader(SVGLoader, "/models/fixed_R.svg");
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = fovForAspect(aspect);
    const camZ = GROUP_Z + (CAM_START - GROUP_Z) / (1 + 1 * 20);
    camera.position.set(CAM_X, CAM_Y, camZ);
    camera.lookAt(CAM_X, CAM_Y, GROUP_Z);
    camera.updateProjectionMatrix();
  }, [size, camera]);

  const shapes = useMemo(() =>
    svg.paths.flatMap((p) => SVGLoader.createShapes(p)),
  [svg]);

  const extrudeSettings = useMemo(() => ({
    depth: 0.35, bevelEnabled: false, curveSegments: 64,
  }), []);

  // Tunnel materials — opacity 0, kept only so scene is consistent with Landing
  const faceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#5c2e00", roughness: 0.3, metalness: 0.5,
    emissive: "#FFA000", emissiveIntensity: 0.85,
    side: THREE.FrontSide, transparent: true, opacity: 0,
  }), []);

  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#241000", roughness: 0.34, metalness: 0.45,
    emissive: "#FF5500", emissiveIntensity: 0.4,
    side: THREE.DoubleSide, transparent: true, opacity: 0,
  }), []);

  const meshRef     = useRef(null);
  const materialRef = useRef(null);
  const rotYRef     = useRef(0);
  const tmpDir      = useRef(new THREE.Vector3());
  const tmpPos      = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    const m = mouseRef?.current ?? { x: 0, y: 0 };

    tmpDir.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
    tmpPos.current.copy(camera.position).addScaledVector(tmpDir.current, 1.4);
    tmpPos.current.x -= 0.11;
    meshRef.current.position.copy(tmpPos.current);
    meshRef.current.quaternion.copy(camera.quaternion);

    const mouseSwivel = m.x * 0.12;
    rotYRef.current += (mouseSwivel - rotYRef.current) * 0.08;
    meshRef.current.rotateY(rotYRef.current);
    meshRef.current.rotateX(-0.08);
    meshRef.current.scale.setScalar(0.58);

    if (materialRef.current) materialRef.current.opacity = 1;
  });

  // Reuse the same texture Landing captured via html2canvas
  const planeW = aboutTexture ? 1.6 * (aboutTexture.width / aboutTexture.height) : 1.6 * (800 / 500);
  const planeH = 1.6;

  return (
    <>
      <ambientLight intensity={0.18} color="#3a2200" />
      <directionalLight position={[HOLE_X - 1.5, HOLE_Y + 0.5, GROUP_Z + 6]} intensity={9} color="#FFB300" />
      <directionalLight position={[HOLE_X + 1.5, HOLE_Y - 0.5, GROUP_Z + 6]} intensity={6} color="#FF8800" />
      <pointLight position={[HOLE_X, HOLE_Y, GROUP_Z + 0.3]} intensity={14} distance={2.4} color="#FFAA00" decay={2} />

      {/* Tunnel mesh — invisible at p=1 */}
      <group scale={[0.01, -0.01, 1]} position={[-1.175, 1.65, GROUP_Z]}>
        {shapes.map((shape, i) => (
          <mesh key={i} material={[faceMaterial, wallMaterial]}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
          </mesh>
        ))}
      </group>

      {/* About plane — fully visible, mouse-driven swivel */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial
          ref={materialRef}
          map={aboutTexture?.texture ?? null}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

// ── About section ─────────────────────────────────────────────────────────────
function AboutSection({ mouseRef, aboutTexture }) {
  return (
    <section
      id="about"
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        background: "hsl(var(--background))",
        // pointerEvents none so scroll passes through the canvas to the page
        pointerEvents: "none",
      }}
    >
      <Canvas
        camera={{ position: [CAM_X, CAM_Y, CAM_START], fov: BASE_FOV, near: 0.001, far: 1000 }}
        style={{ width: "100%", height: "100%", display: "block" }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <StaticR mouseRef={mouseRef} aboutTexture={aboutTexture} />
      </Canvas>
    </section>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
export const Home = ({ onScrollToTop, aboutTexture }) => {
  const lastScrollY = useRef(0);
  const mouseRef    = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handle = () => {
      const curr = window.scrollY;
      if (curr <= 10 && curr < lastScrollY.current && onScrollToTop) {
        onScrollToTop();
      }
      lastScrollY.current = curr;
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, [onScrollToTop]);

  useEffect(() => {
    const handleMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <main>
        <AboutSection mouseRef={mouseRef} aboutTexture={aboutTexture} />
        <Skills />
        <ProjectsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};