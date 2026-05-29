import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HERO_COSMIC_CATALOG, CosmicObject, CollaborativeUser } from "../types";
import { spaceSynths } from "../utils/audio";

interface GalaxyCanvasProps {
  selectedObject: CosmicObject | null;
  onSelectObject: (obj: CosmicObject | null) => void;
  visualizationMode: "default" | "density" | "metallicity" | "velocity";
  timeOffset: number; // Years from current era (-100,000 to +100,000)
  cameraMode: "free" | "cinematic" | "spaceship" | "god";
  isPlayingTime: boolean;
  warpTriggered: boolean;
  collaborativeUsers: CollaborativeUser[];
  activeUserId: string | null;
  onCameraChange?: (pos: [number, number, number], target: [number, number, number]) => void;
  showSplash?: boolean;
  birdsEyeTrigger?: number;
}

export default function GalaxyCanvas({
  selectedObject,
  onSelectObject,
  visualizationMode,
  timeOffset,
  cameraMode,
  isPlayingTime,
  warpTriggered,
  collaborativeUsers,
  activeUserId,
  onCameraChange,
  showSplash = true,
  birdsEyeTrigger
}: GalaxyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Particle systems and object groups
  const galaxyParticlesRef = useRef<THREE.Points | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);
  const nebulaGroupRef = useRef<THREE.Group | null>(null);
  const starGlowMeshesRef = useRef<THREE.Mesh[]>([]);
  const labelsGroupRef = useRef<THREE.Group | null>(null);
  const sgrAAcretionRef = useRef<THREE.Mesh | null>(null);
  const sgrAGlowRef = useRef<THREE.Mesh | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastPulsarBlipTimeRef = useRef<number>(0);

  // Interactive state
  const [hoveredObject, setHoveredObject] = useState<CosmicObject | null>(null);
  const activeSelectedObjectRef = useRef<CosmicObject | null>(null);
  const cameraModeRef = useRef<string>("free");

  // Telemetry trigger for high-altitude birds-eye reset
  useEffect(() => {
    if (birdsEyeTrigger && birdsEyeTrigger > 0) {
      onSelectObject(null);
      // Elevate camera straight up above the galactic center disk for a beautiful architectural view
      gsapLerpCamera(0, 3100, 15, 2000);
    }
  }, [birdsEyeTrigger]);

  // Keep references updated to avoid stale scope values in the animation loop
  useEffect(() => {
    activeSelectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
    if (controlsRef.current) {
      if (cameraMode === "spaceship") {
        controlsRef.current.enableRotate = false;
        controlsRef.current.enableZoom = false;
      } else if (cameraMode === "god") {
        controlsRef.current.enableRotate = true;
        controlsRef.current.enableZoom = true;
        // Zoom out camera immediately in god mode to inspect whole galaxy
        if (cameraRef.current) {
          const now = cameraRef.current.position;
          gsapLerpCamera(0, 1500, 1800);
        }
      } else {
        controlsRef.current.enableRotate = true;
        controlsRef.current.enableZoom = true;
      }
    }
  }, [cameraMode]);

  // Warp effect state
  const warpStrengthRef = useRef<number>(0);
  useEffect(() => {
    if (warpTriggered) {
      spaceSynths.playWarpSwoosh();
      let step = 0;
      const interval = setInterval(() => {
        if (step < 10) {
          warpStrengthRef.current = step / 10;
        } else {
          warpStrengthRef.current = (20 - step) / 10;
        }
        step++;
        if (step > 20) {
          warpStrengthRef.current = 0;
          clearInterval(interval);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [warpTriggered]);

  // Assist camera transition dynamically
  const gsapTransitRef = useRef<{
    targetPos: THREE.Vector3;
    lookAtPos: THREE.Vector3;
    alpha: number;
  } | null>(null);

  function gsapLerpCamera(x: number, y: number, z: number, duration = 1200) {
    if (!cameraRef.current || !controlsRef.current) return;
    const currentPos = cameraRef.current.position.clone();
    const targetPos = new THREE.Vector3(x, y, z);
    const targetLook = selectedObject
      ? new THREE.Vector3(selectedObject.position[0], selectedObject.position[1], selectedObject.position[2])
      : new THREE.Vector3(0, 0, 0);

    const startTime = performance.now();
    function animateCam(nowTime: number) {
      const elapsed = nowTime - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - ratio, 3);

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.lerpVectors(currentPos, targetPos, ease);
        controlsRef.current.target.lerpVectors(controlsRef.current.target.clone(), targetLook, ease);
        controlsRef.current.update();
      }

      if (ratio < 1) {
        requestAnimationFrame(animateCam);
      }
    }
    requestAnimationFrame(animateCam);
  }

  // Trigger camera swoop to target object when selected
  useEffect(() => {
    if (selectedObject && cameraRef.current) {
      const [ox, oy, oz] = selectedObject.position;
      // Position camera offset depending on object type
      let cameraOffset: [number, number, number] = [0, 15, 45];
      if (selectedObject.type === "black_hole") {
        cameraOffset = [120, 80, 200];
      } else if (selectedObject.type === "exoplanet") {
        cameraOffset = [2, 1, 4];
      } else if (selectedObject.type === "nebula") {
        cameraOffset = [150, 80, 250];
      } else if (selectedObject.type === "cluster") {
        cameraOffset = [250, 100, 300];
      } else if (selectedObject.type === "region") {
        cameraOffset = [120, 85, 220];
      }

      gsapLerpCamera(ox + cameraOffset[0], oy + cameraOffset[1], oz + cameraOffset[2]);
    }
  }, [selectedObject]);

  // Color lookup for spectral temperature classes (Planck's laws)
  const getSpectralColor = (type?: string): THREE.Color => {
    if (!type) return new THREE.Color(0xddf1ff);
    const firstLetter = type.toUpperCase().charAt(0);
    switch (firstLetter) {
      case "O": return new THREE.Color(0x99ccff); // Hot blue
      case "B": return new THREE.Color(0xb3d9ff); // White-blue
      case "A": return new THREE.Color(0xe6f2ff); // Pure White
      case "F": return new THREE.Color(0xfff5e6); // Yellow-white
      case "G": return new THREE.Color(0xffe680); // Sol type (deep yellow)
      case "K": return new THREE.Color(0xffa31a); // Warm orange
      case "M": return new THREE.Color(0xff4d4d); // Cool red dwarf
      case "S": return new THREE.Color(0x40e0d0); // Singularity / exotic pulsar
      default: return new THREE.Color(0xffe6cc);
    }
  };

  // Re-map colors of all particles based on visual modes (metallicity, density, velocity)
  useEffect(() => {
    if (!galaxyParticlesRef.current) return;
    const geometry = galaxyParticlesRef.current.geometry;
    const colorsAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
    const positionsAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    if (!colorsAttr || !positionsAttr) return;

    const count = positionsAttr.count;
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const x = positionsAttr.getX(i);
      const y = positionsAttr.getY(i);
      const z = positionsAttr.getZ(i);
      const r = Math.sqrt(x * x + z * z);

      if (visualizationMode === "density") {
        // High density central stellar heat values vs cold arms
        const heat = Math.max(0, 1 - (r / 600));
        tempColor.setHSL(0.08 + heat * 0.15, 1.0, 0.4 + heat * 0.3);
      } else if (visualizationMode === "metallicity") {
        // Galactic chemical evolution: older core stars are metal-rich (yellow/cyan), outskirts are metal-poor (crimson)
        const metalFraction = Math.max(0, 1 - (r / 750));
        tempColor.setHSL(0.55 + metalFraction * 0.25, 1.0, 0.4);
      } else if (visualizationMode === "velocity") {
        // Rotational motion color: Blue-shifted approaching stars vs Red-shifted receding stars
        // We can color based on rotation angle relative to quadrant
        const angle = Math.atan2(z, x);
        const shift = Math.abs(Math.sin(angle));
        tempColor.setRGB(0.1 + shift * 0.8, 0.2, 0.9 - shift * 0.6);
      } else {
        // Default star class colors loaded from initial setup
        // Let's restore random temperature colors
        const seedValue = (i % 7);
        if (seedValue === 0) tempColor.setHex(0x99ccff);
        else if (seedValue === 1) tempColor.setHex(0xb3d9ff);
        else if (seedValue === 2) tempColor.setHex(0xe6f2ff);
        else if (seedValue === 3) tempColor.setHex(0xffffff);
        else if (seedValue === 4) tempColor.setHex(0xffe680);
        else if (seedValue === 5) tempColor.setHex(0xffa31a);
        else tempColor.setHex(0xff4d4d);
      }

      colorsAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    colorsAttr.needsUpdate = true;
  }, [visualizationMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // SCENE & SYSTEM SETUP
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x01050e);
    scene.fog = new THREE.FogExp2(0x01050e, 0.00015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 15000);
    cameraRef.current = camera;
    
    // Position deep space coordinates initially to build beautiful intro
    camera.position.set(200, 2400, 3600);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 5000;
    controls.minDistance = 0.5;
    controls.target.set(0, 0, 0); // Rotate around center by default

    if (!showSplash) {
      // Trigger cinematic approaching swoop descend from deep space on sensors initialization
      setTimeout(() => {
        gsapLerpCamera(0, 450, 750, 4200);
      }, 50);
    }
    controls.update();

    // AMBIENT LIGHTING FOR HERO SATELLITES
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const centralLight = new THREE.PointLight(0xfff6dd, 2.5, 3000);
    centralLight.position.set(0, 0, 0);
    scene.add(centralLight);

    // 1. GENERATE MILKY WAY PARTICLE SYSTEM (50,000 STARS)
    const starCount = 65000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    // Flat spiral arms definition
    const armCount = 4;
    const maxRadius = 800;
    const coreRadius = 70;

    for (let i = 0; i < starCount; i++) {
      let x = 0, y = 0, z = 0;

      // 10% Stars are in the central core bulge
      if (Math.random() < 0.15) {
        // Spherical core Gaussian cluster
        const r = Math.pow(Math.random(), 2) * coreRadius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta) * 0.7; // Flattened core
        z = r * Math.cos(phi);
      } else {
        // Spiral arms stars
        // Assign to one of the 4 arm anchors
        const armIndex = i % armCount;
        const armAngle = (armIndex / armCount) * Math.PI * 2;

        // Radial log distance
        const t = Math.pow(Math.random(), 1.2);
        const r = coreRadius + t * (maxRadius - coreRadius);

        // Exponential spiral angle deflection
        const theta = armAngle + t * 4.4 + (Math.random() - 0.5) * 0.22;

        // Gaussian thickness spread: thinner at outskirts, thicker near core
        const thicknessFactor = (1 - (r / maxRadius)) * 32 + 3;
        const u1 = Math.random();
        const u2 = Math.random();
        const zSpread = Math.min(2.5, Math.max(-2.5, Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)));

        x = r * Math.cos(theta);
        y = zSpread * thicknessFactor;
        z = r * Math.sin(theta);
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Assign random physical color temperatures initially
      const rVal = Math.random();
      let starColor = new THREE.Color(0xffffff);
      if (rVal < 0.15) starColor = new THREE.Color(0xa3c2ff); // Blue-white
      else if (rVal < 0.3) starColor = new THREE.Color(0xfff0b3); // Yellow-white
      else if (rVal < 0.6) starColor = new THREE.Color(0xff9900); // Orange
      else if (rVal < 0.8) starColor = new THREE.Color(0xff4d4d); // Crimson Red
      else starColor = new THREE.Color(0xf6f6f6);

      colors[i * 3] = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;

      sizes[i] = Math.random() * 1.5 + 0.3;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Custom Star particle shader to emulate glow sparkles
    const starTexture = createSparkleTexture();
    const particleMaterial = new THREE.PointsMaterial({
      size: 4.5,
      map: starTexture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.85,
    });

    const galaxyParticles = new THREE.Points(particleGeometry, particleMaterial);
    galaxyParticlesRef.current = galaxyParticles;
    scene.add(galaxyParticles);


    // 1A. GENERATE SWIRLING AMBER/GOLDEN STELLAR DUST LANES (18,000 PARTICLES)
    const dustCount = 18000;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const armIndex = i % armCount;
      const armAngle = (armIndex / armCount) * Math.PI * 2;
      const t = Math.pow(Math.random(), 1.4);
      const r = coreRadius + t * (maxRadius - coreRadius);
      const theta = armAngle + t * 4.4 + (Math.random() - 0.5) * 0.35 + 0.15; // Shift slightly for offset lane

      const thicknessFactor = (1 - (r / maxRadius)) * 24 + 2;
      const zSpread = (Math.random() - 0.5) * 2;

      dustPositions[i * 3] = r * Math.cos(theta);
      dustPositions[i * 3 + 1] = zSpread * thicknessFactor;
      dustPositions[i * 3 + 2] = r * Math.sin(theta);

      // Amber, gold and soft violet dust mix (specified colors)
      const colRand = Math.random();
      let dustColor = new THREE.Color(0xfbbf24); // #FBBF24 Amber
      if (colRand < 0.25) {
        dustColor = new THREE.Color(0xf59e0b); // Golden orange
      } else if (colRand < 0.5) {
        dustColor = new THREE.Color(0x8b5cf6); // #8B5CF6 Violet gas lane
      } else if (colRand < 0.6) {
        dustColor = new THREE.Color(0xef4444); // Red dust
      }

      dustColors[i * 3] = dustColor.r;
      dustColors[i * 3 + 1] = dustColor.g;
      dustColors[i * 3 + 2] = dustColor.b;

      dustSizes[i] = Math.random() * 2.5 + 0.5;
    }

    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute("size", new THREE.BufferAttribute(dustSizes, 1));

    const dustMaterial = new THREE.PointsMaterial({
      size: 5.5,
      map: starTexture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.45,
    });

    const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
    dustParticlesRef.current = dustParticles;
    scene.add(dustParticles);


    // 1B. GENERATE PARALLAX BACKGROUND STARFIELD (3,500 FAINT STATIC STARS)
    const bgStarCount = 3500;
    const bgStarGeometry = new THREE.BufferGeometry();
    const bgStarPositions = new Float32Array(bgStarCount * 3);
    const bgStarColors = new Float32Array(bgStarCount * 3);

    for (let i = 0; i < bgStarCount; i++) {
      // Scatter on outer sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 4500 + Math.random() * 2000; // Deep background space location

      bgStarPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      bgStarPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      bgStarPositions[i * 3 + 2] = r * Math.cos(phi);

      // Faint blue-whites and white
      const rVal = Math.random();
      let starColor = new THREE.Color(0x38bdf8); // Sky blue
      if (rVal < 0.4) starColor = new THREE.Color(0xffffff);
      else if (rVal < 0.6) starColor = new THREE.Color(0xfbbf24); // Amber

      bgStarColors[i * 3] = starColor.r * 0.45; // slightly dimmer for parallax immersion
      bgStarColors[i * 3 + 1] = starColor.g * 0.45;
      bgStarColors[i * 3 + 2] = starColor.b * 0.45;
    }

    bgStarGeometry.setAttribute("position", new THREE.BufferAttribute(bgStarPositions, 3));
    bgStarGeometry.setAttribute("color", new THREE.BufferAttribute(bgStarColors, 3));

    const bgStarMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    const bgStarfield = new THREE.Points(bgStarGeometry, bgStarMaterial);
    scene.add(bgStarfield);


    // 1C. GENERATE VOLUMETRIC NEBULA CLOUDS ALONG SPIRAL ARMS
    const nebulaGroup = new THREE.Group();
    nebulaGroupRef.current = nebulaGroup;
    const nebulaColors = [0x8b5cf6, 0x38bdf8, 0xdb2777, 0x06b6d4]; // Violet, Sky Blue, Pink Magenta, Cyan
    const nebulaLocs = [
      [180, 0, 180], [-150, 10, -220], [280, -10, -80], [-250, 20, 290],
      [80, -5, 340], [-350, -15, -120], [420, 15, -450], [-100, 30, 20],
      [520, 0, 60], [-500, -20, 520], [20, 5, -550], [-400, 25, -390]
    ];

    nebulaLocs.forEach(([nx, ny, nz], idx) => {
      const col = nebulaColors[idx % nebulaColors.length];
      const geom = new THREE.DodecahedronGeometry(45 + Math.random() * 25, 1);
      
      // Randomize vertices to make cloud uneven/volumetric
      const posAttr = geom.attributes.position;
      for (let v = 0; v < posAttr.count; v++) {
        const vx = posAttr.getX(v);
        const vy = posAttr.getY(v);
        const vz = posAttr.getZ(v);
        posAttr.setXYZ(
          v,
          vx + (Math.random() - 0.5) * 12,
          vy + (Math.random() - 0.5) * 12,
          vz + (Math.random() - 0.5) * 12
        );
      }
      geom.computeVertexNormals();

      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.04 + Math.random() * 0.03,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        wireframe: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(nx, ny, nz);
      nebulaGroup.add(mesh);
    });
    scene.add(nebulaGroup);


    // 1D. GENERATE DISTANT DEEP SPACE GALAXIES
    const distantGroup = new THREE.Group();
    const distantLocs = [
      [3600, 1200, -4200], [-4500, -1800, -3200], [4800, -1000, 3100], [-3900, 1600, 4400]
    ];
    const distantColors = [0x8b5cf6, 0x38bdf8, 0xfbbf24, 0xdb2777];

    distantLocs.forEach(([gx, gy, gz], idx) => {
      const col = new THREE.Color(distantColors[idx % distantColors.length]);
      const miniCount = 180;
      const minigeom = new THREE.BufferGeometry();
      const minipos = new Float32Array(miniCount * 3);
      const minicols = new Float32Array(miniCount * 3);

      for (let m = 0; m < miniCount; m++) {
        // Spiral mathematical form
        const mt = Math.pow(Math.random(), 1.2);
        const mr = mt * 120;
        const mtheta = mt * 8.0 + (m % 2) * Math.PI + (Math.random() - 0.5) * 0.4;
        minipos[m * 3] = mr * Math.cos(mtheta);
        minipos[m * 3 + 1] = (Math.random() - 0.5) * 15;
        minipos[m * 3 + 2] = mr * Math.sin(mtheta);

        minicols[m * 3] = col.r * 0.8;
        minicols[m * 3 + 1] = col.g * 0.8;
        minicols[m * 3 + 2] = col.b * 0.8;
      }
      minigeom.setAttribute("position", new THREE.BufferAttribute(minipos, 3));
      minigeom.setAttribute("color", new THREE.BufferAttribute(minicols, 3));

      const miniPoints = new THREE.Points(minigeom, new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      }));
      miniPoints.position.set(gx, gy, gz);
      distantGroup.add(miniPoints);
    });
    scene.add(distantGroup);


    // 2. CREATING SAGITTARIUS A* EVENT HORIZON
    const sgrAGroup = new THREE.Group();
    sgrAGroup.position.set(0, 0, 0);

    const holeGeom = new THREE.SphereGeometry(1.6, 32, 32);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const singMesh = new THREE.Mesh(holeGeom, holeMat);
    sgrAGroup.add(singMesh);

    // Accretion Disk (Doppler-shifted orbiting gas clouds)
    const diskGeom = new THREE.TorusGeometry(8, 2.5, 4, 100);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const diskMesh = new THREE.Mesh(diskGeom, diskMat);
    diskMesh.rotation.x = Math.PI / 2.3; // Relativistic tilt
    diskMesh.rotation.y = Math.PI / 12;
    sgrAAcretionRef.current = diskMesh;
    sgrAGroup.add(diskMesh);

    // Gravitational glow lensing halo
    const sgrGlowGeom = new THREE.SphereGeometry(18, 16, 16);
    const sgrGlowMat = new THREE.MeshBasicMaterial({
      color: 0x9933ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const sgrGlow = new THREE.Mesh(sgrGlowGeom, sgrGlowMat);
    sgrAGlowRef.current = sgrGlow;
    sgrAGroup.add(sgrGlow);

    scene.add(sgrAGroup);


    // 3. SPARKLE LABELS GROUP FOR SCIENTIFIC HERO OBJECTS
    const labelsGroup = new THREE.Group();
    labelsGroupRef.current = labelsGroup;
    scene.add(labelsGroup);

    const starGlowMeshes: THREE.Mesh[] = [];

    HERO_COSMIC_CATALOG.forEach((obj) => {
      // Create high-clarity 3D spheres at direct positions representing hero targets
      let radius = 2.0;
      let color = getSpectralColor(obj.spectralType);

      if (obj.type === "black_hole") {
        radius = 8.0;
        color.setHex(0xffaa00);
      } else if (obj.type === "nebula") {
        radius = 12.0;
        color.setHex(0xff33cc);
      } else if (obj.type === "cluster") {
        radius = 10.0;
        color.setHex(0x33e3ff);
      } else if (obj.type === "region") {
        radius = 16.0;
        color.setHex(0x38bdf8); // Sky blue themed region node
      }

      const sphereGeom = new THREE.SphereGeometry(radius, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        wireframe: (obj.type === "nebula" || obj.type === "cluster" || obj.type === "region"),
      });

      const mesh = new THREE.Mesh(sphereGeom, sphereMat);
      // Map positions: Scaled coordinate projection based on light-year indexes
      const [px, py, pz] = obj.position;
      mesh.position.set(px, py, pz);
      // Associate metadata with 3D mesh for raycasting click handlers
      mesh.userData = { objRef: obj };

      // Volumetric glow envelope around clickable star
      const glowGeom = new THREE.SphereGeometry(radius * 2.2, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
      });
      const glowMesh = new THREE.Mesh(glowGeom, glowMat);
      mesh.add(glowMesh);

      scene.add(mesh);
      starGlowMeshes.push(mesh);
    });

    starGlowMeshesRef.current = starGlowMeshes;


    // 4. RAYCASTING INTERACTIVE CLICK HANDLER
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 10.0 }; // Generous clickable bounds for stars
    const mouse = new THREE.Vector2();

    const handleMouseClick = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(starGlowMeshes);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const cosmicData = clickedMesh.userData.objRef as CosmicObject;
        if (cosmicData) {
          onSelectObject(cosmicData);
          // Play resonant scale sounds
          spaceSynths.playStarClick(cosmicData.temperature || 0);
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(starGlowMeshes);

      if (intersects.length > 0) {
        document.body.style.cursor = "pointer";
        const targetMesh = intersects[0].object as THREE.Mesh;
        const data = targetMesh.userData.objRef as CosmicObject;
        setHoveredObject(data);
      } else {
        document.body.style.cursor = "default";
        setHoveredObject(null);
      }
    };

    renderer.domElement.addEventListener("click", handleMouseClick);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);


    // 5. ANIMATING RENDER LOOP
    const clock = new THREE.Clock();

    const animate = () => {
      const animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Flat-rotation speed math to model physical galaxy rotational flows
      // Dark Matter constant rotation velocity is roughly v = 220 km/s.
      // Therefore, angular velocity omega increases closer to the core: omega = v / radialDistance.
      // We apply rotation to the particle geometry points depending on distance from core (R) and the TimeOffset!
      if (galaxyParticles) {
        const geometry = galaxyParticles.geometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const initialPositions = (geometry.userData.initialPositions ||= positions.slice()) as Float32Array;

        // Model galactic spin direction over time: 1 light year = 9.46e12 km.
        // We calculate angular shift for each star on the disk:
        for (let i = 0; i < starCount; i++) {
          const initX = initialPositions[i * 3];
          const initY = initialPositions[i * 3 + 1];
          const initZ = initialPositions[i * 3 + 2];

          const r = Math.sqrt(initX * initX + initZ * initZ);
          if (r > 0) {
            // Flat rotation speed curve approximation: constant orbital speed on outskirts, linear near inner core
            const speedCurve = r < 50 ? (r / 50) : 1.0;
            // Complete orbital period is roughly 230 million years at solar radius (26,000 ly)
            // Solar coordinate moves roughly 0.005 radians per 100,000 years
            const orbitalFreq = (speedCurve / (r + 10)) * 0.04;

            // Apply time travel speed multiplier
            const thetaDelta = orbitalFreq * (timeOffset / 1000) + (isPlayingTime ? elapsedTime * 0.1 * speedCurve : 0);

            const initialAngle = Math.atan2(initZ, initX);
            const currentAngle = initialAngle + thetaDelta;

            positions[i * 3] = r * Math.cos(currentAngle);
            positions[i * 3 + 2] = r * Math.sin(currentAngle);
          }
        }
        geometry.attributes.position.needsUpdate = true;
      }

      // Swirling rotation of dust particle lanes and volumetric nebula clouds
      if (dustParticles) {
        const dustGeom = dustParticles.geometry;
        const dustPos = dustGeom.attributes.position.array as Float32Array;
        const initDustPos = (dustGeom.userData.initialPositions ||= dustPos.slice()) as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          const initX = initDustPos[i * 3];
          const initZ = initDustPos[i * 3 + 2];
          const r = Math.sqrt(initX * initX + initZ * initZ);
          if (r > 0) {
            const speedCurve = r < 50 ? (r / 50) : 1.0;
            const orbitalFreq = (speedCurve / (r + 10)) * 0.04;
            const thetaDelta = orbitalFreq * (timeOffset / 1000) + (isPlayingTime ? elapsedTime * 0.1 * speedCurve : 0);
            const initialAngle = Math.atan2(initZ, initX);
            const currentAngle = initialAngle + thetaDelta;
            dustPos[i * 3] = r * Math.cos(currentAngle);
            dustPos[i * 3 + 2] = r * Math.sin(currentAngle);
          }
        }
        dustGeom.attributes.position.needsUpdate = true;
      }

      if (nebulaGroupRef.current) {
        // Volumetric clouds rotate slowly around central core
        nebulaGroupRef.current.rotation.y = (timeOffset / 180000) + elapsedTime * 0.04;
      }

      // Rotate Accretion disk on Sagittarius A*
      if (sgrAAcretionRef.current) {
        sgrAAcretionRef.current.rotation.z += 1.8 * delta;
      }
      if (sgrAGlowRef.current) {
        sgrAGlowRef.current.rotation.y += 0.08 * delta;
        // Glowing core pulse kinetic effect (core pulses)
        const pulseFactor = 1.0 + Math.sin(elapsedTime * 1.5) * 0.12;
        sgrAGlowRef.current.scale.set(pulseFactor, pulseFactor, pulseFactor);
      }

      // Volumetric breathing pulse of hero targets
      starGlowMeshes.forEach((mesh) => {
        const objType = mesh.userData?.objRef?.type;
        const frequency = objType === "region" ? 1.5 : 3.5;
        const amplitude = objType === "region" ? 0.05 : 0.12;
        const pulse = 1.0 + Math.sin(elapsedTime * frequency + mesh.position.x) * amplitude;
        mesh.scale.set(pulse, pulse, pulse);
      });

      // Warp streaking effect (elongate camera coordinate trajectory)
      if (warpStrengthRef.current > 0) {
        camera.fov = 60 + warpStrengthRef.current * 35;
        camera.updateProjectionMatrix();
        if (galaxyParticles) {
          galaxyParticles.scale.set(1.0, 1.0, 1.0 + warpStrengthRef.current * 1.5);
        }
      } else {
        if (camera.fov !== 60) {
          camera.fov = 60;
          camera.updateProjectionMatrix();
        }
        if (galaxyParticles && galaxyParticles.scale.z !== 1) {
          galaxyParticles.scale.set(1, 1, 1);
        }
      }

      // FPS flight spaceship autopilot navigation controls
      if (cameraModeRef.current === "spaceship") {
        // Starship glides around looking towards Sol or central Sgr A*
        camera.position.x += Math.cos(elapsedTime * 0.25) * 0.8;
        camera.position.z += Math.sin(elapsedTime * 0.25) * 0.8;
        controls.update();
      } else {
        controls.update();
      }

      // Proximity warning audio triggers for pulsars or black holes
      if (camera) {
        const nowMs = performance.now();
        const highDensityObjects = HERO_COSMIC_CATALOG.filter(
          (obj) => obj.type === "pulsar" || obj.type === "black_hole"
        );
        let closestObject: CosmicObject | null = null;
        let closestDistance = Infinity;

        highDensityObjects.forEach((obj) => {
          const objPos = new THREE.Vector3(obj.position[0], obj.position[1], obj.position[2]);
          const dist = camera.position.distanceTo(objPos);
          if (dist < closestDistance) {
            closestDistance = dist;
            closestObject = obj;
          }
        });

        if (closestObject && closestDistance < 720) {
          // Dynamic pulsing rate: speeds up closer to the target (min 150ms interval, max 1000ms interval)
          const minInterval = 150;
          const maxInterval = 1000;
          const ratio = Math.max(0, Math.min(1, (closestDistance - 30) / 690));
          const currentInterval = minInterval + ratio * (maxInterval - minInterval);

          if (nowMs - lastPulsarBlipTimeRef.current >= currentInterval) {
            spaceSynths.playPulsarBlip(closestDistance);
            lastPulsarBlipTimeRef.current = nowMs;
          }
        }
      }

      // Track camera changes and notify parent component
      frameCountRef.current++;
      if (frameCountRef.current % 10 === 0) {
        if (camera && controls && onCameraChange) {
          const pos = camera.position;
          const trg = controls.target;
          onCameraChange([pos.x, pos.y, pos.z], [trg.x, trg.y, trg.z]);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. ADAPTING TO WINDOW RESIZING
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // CLEANUP SYSTEM BOUNDS
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleMouseClick);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      try {
        container.removeChild(renderer.domElement);
      } catch (e) {}

      // Dispose assets to prevent GPU memory leaks
      starGlowMeshes.forEach((m) => {
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      });
      particleGeometry.dispose();
      particleMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      bgStarGeometry.dispose();
      bgStarMaterial.dispose();
      nebulaGroup.children.forEach((c) => {
        (c as THREE.Mesh).geometry.dispose();
        ((c as THREE.Mesh).material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [timeOffset, isPlayingTime, showSplash]);

  // Procedural canvas star textures to avoid importing big web assets
  function createSparkleTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Glow gradient circle
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.12, "rgba(235,245,255,0.9)");
      gradient.addColorStop(0.28, "rgba(120,200,255,0.3)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Collaborative spaceships 3D scene synchronizer
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let playersGroup = scene.getObjectByName("other-players-group") as THREE.Group;
    if (!playersGroup) {
      playersGroup = new THREE.Group();
      playersGroup.name = "other-players-group";
      scene.add(playersGroup);
    }

    // Map of active client IDs
    const activeIds = new Set(collaborativeUsers.map(u => u.id).filter(id => id !== activeUserId));

    // Cleanup stale spacecraft meshes
    playersGroup.children.slice().forEach((child) => {
      if (child.name.startsWith("player_")) {
        const pid = child.name.replace("player_", "");
        if (!activeIds.has(pid)) {
          playersGroup.remove(child);
        }
      }
    });

    // Spawn or update active players
    collaborativeUsers.forEach((user) => {
      if (user.id === activeUserId) return; // skip self

      let userGroup = playersGroup.getObjectByName(`player_${user.id}`) as THREE.Group;
      if (!userGroup) {
        userGroup = new THREE.Group();
        userGroup.name = `player_${user.id}`;

        const spacecraft = createSpacecraftMesh(user.avatarColor);
        spacecraft.name = "vessel";
        userGroup.add(spacecraft);

        const txt = `${user.avatarEmoji} ${user.username}`;
        const sprite = createTextSprite(txt, user.avatarColor);
        sprite.position.set(0, 10, 0); // slightly elevated
        userGroup.add(sprite);

        playersGroup.add(userGroup);
      }

      userGroup.position.set(user.cameraPos[0], user.cameraPos[1], user.cameraPos[2]);
      const lookVec = new THREE.Vector3(user.cameraTarget[0], user.cameraTarget[1], user.cameraTarget[2]);
      userGroup.lookAt(lookVec);
    });
  }, [collaborativeUsers, activeUserId]);

  // Floating HTML Label on Hover overlays
  return (
    <div id="galaxy-3d-container" className="relative w-full h-full" ref={containerRef}>
      {/* Floating Star Tag on Hover */}
      {hoveredObject && (
        <div
          id="hover-tag"
          className="absolute pointer-events-none bg-black/60 border border-white/10 backdrop-blur-xl text-white text-xs py-1.5 px-4 rounded-xl shadow-2xl font-mono z-40 transition-all"
          style={{
            left: `${window.innerWidth / 2 - 100}px`,
            top: `12%`,
            pointerEvents: "none"
          }}
        >
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full bubble-pulsar ${
              hoveredObject.type === 'black_hole' ? 'bg-purple-500 animate-ping' : 'bg-cyan-400 animate-pulse'
            }`} />
            <div>
              <p className="font-bold text-cyan-300">{hoveredObject.name}</p>
              <p className="text-[10px] text-white/40">{hoveredObject.commonName || hoveredObject.type.toUpperCase()}</p>
            </div>
            <span className="ml-3 border-l border-white/10 pl-3 text-[10px] text-cyan-400">
              {hoveredObject.distance >= 1 ? `${Math.round(hoveredObject.distance).toLocaleString()} ly` : 'Earth core orbit'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function createSpacecraftMesh(colorStr: string): THREE.Group {
  const group = new THREE.Group();
  const geomBody = new THREE.ConeGeometry(2.5, 6, 4);
  const colorHex = parseInt(colorStr.replace("#", "0x"));
  const matBody = new THREE.MeshPhongMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.3,
    shininess: 80,
    flatShading: true,
  });

  const topHull = new THREE.Mesh(geomBody, matBody);
  topHull.rotation.x = Math.PI / 2;
  group.add(topHull);

  const geomThrust = new THREE.SphereGeometry(1.2, 6, 6);
  const matThrust = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const thruster = new THREE.Mesh(geomThrust, matThrust);
  thruster.position.set(0, 0, -3);
  group.add(thruster);

  return group;
}

function createTextSprite(text: string, colorStr: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(10, 5, 236, 45, 8);
    } else {
      ctx.rect(10, 5, 236, 45);
    }
    ctx.fill();

    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 28);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(16, 4, 1);
  return sprite;
}
