import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Full-screen Interactive 3D Computer Workspace:
 * Renders a large, realistic 3D laptop on a sleek minimalist workspace desk,
 * with natural studio lighting, screen glow, subtle keyboard keys, trackpad,
 * and mouse-driven camera parallax for depth.
 */
export default function WorkspaceCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // WebGL fallback handled via CSS backdrop
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(-2.0, 2.2, 6.4);
    camera.lookAt(-1.2, 0.2, 0);

    // --- Natural Lighting & Studio Rig ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    // Warm daylight window light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(6, 9, 7);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Soft sky blue fill light from the left
    const skyFill = new THREE.DirectionalLight(0xdbeafe, 1.4);
    skyFill.position.set(-6, 4, 3);
    scene.add(skyFill);

    // Subtle rim backlight
    const rimLight = new THREE.PointLight(0x60a5fa, 1.8, 15);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // --- Ground Desk Plane with soft contact shadow ---
    const deskGeo = new THREE.PlaneGeometry(30, 20);
    const deskMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = -0.55;
    desk.receiveShadow = true;
    scene.add(desk);

    // --- 3D Laptop Group ---
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(-2.0, -0.5, 0.4);
    laptopGroup.rotation.y = 0.52;
    scene.add(laptopGroup);

    // Materials
    const aluminumMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Silver-gray anodized aluminum
      metalness: 0.85,
      roughness: 0.22,
    });

    const darkBezelMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.6,
    });

    const keycapMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
    });

    // 1. Laptop Base (Lower Chassis)
    const baseWidth = 3.6;
    const baseDepth = 2.4;
    const baseHeight = 0.12;

    const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const baseMesh = new THREE.Mesh(baseGeo, aluminumMat);
    baseMesh.position.y = baseHeight / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    laptopGroup.add(baseMesh);

    // Trackpad
    const trackpadGeo = new THREE.BoxGeometry(1.2, 0.01, 0.8);
    const trackpadMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.7,
      roughness: 0.25,
    });
    const trackpad = new THREE.Mesh(trackpadGeo, trackpadMat);
    trackpad.position.set(0, baseHeight + 0.005, 0.65);
    laptopGroup.add(trackpad);

    // Keyboard Well & Individual Key Rows
    const kbWellGeo = new THREE.BoxGeometry(3.1, 0.01, 1.25);
    const kbWellMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const kbWell = new THREE.Mesh(kbWellGeo, kbWellMat);
    kbWell.position.set(0, baseHeight + 0.002, -0.4);
    laptopGroup.add(kbWell);

    // 5 Rows of Keycaps
    const keyRows = 5;
    const keyCols = 14;
    const keyW = 0.18;
    const keyH = 0.03;
    const keyD = 0.18;

    for (let r = 0; r < keyRows; r++) {
      for (let c = 0; c < keyCols; c++) {
        const key = new THREE.Mesh(new THREE.BoxGeometry(keyW, keyH, keyD), keycapMat);
        const xPos = -1.35 + c * 0.21;
        const zPos = -0.85 + r * 0.22;
        key.position.set(xPos, baseHeight + 0.02, zPos);
        laptopGroup.add(key);
      }
    }

    // 2. Laptop Display Lid (Rotated at ~115 degrees)
    const lidGroup = new THREE.Group();
    // Hinge line positioned at back edge of base
    lidGroup.position.set(0, baseHeight, -baseDepth / 2);
    // Open angle ~ 65 degrees from vertical
    lidGroup.rotation.x = -1.22;
    laptopGroup.add(lidGroup);

    // Outer Lid Aluminum Shell
    const lidThickness = 0.07;
    const lidGeo = new THREE.BoxGeometry(baseWidth, baseDepth, lidThickness);
    const lidMesh = new THREE.Mesh(lidGeo, aluminumMat);
    lidMesh.position.set(0, baseDepth / 2, -lidThickness / 2);
    lidMesh.castShadow = true;
    lidGroup.add(lidMesh);

    // Screen Front Bezel
    const bezelGeo = new THREE.BoxGeometry(baseWidth - 0.06, baseDepth - 0.06, 0.01);
    const bezelMesh = new THREE.Mesh(bezelGeo, darkBezelMat);
    bezelMesh.position.set(0, baseDepth / 2, 0.005);
    lidGroup.add(bezelMesh);

    // Glowing Display Panel with Dynamic Canvas Texture (Simulating Windows 11 Desktop)
    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 1024;
    screenCanvas.height = 680;
    const ctx = screenCanvas.getContext("2d");

    const renderScreenTexture = () => {
      if (!ctx) return;
      // Windows 11 Bloom Blue Gradient Wallpaper
      const grad = ctx.createLinearGradient(0, 0, 1024, 680);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.4, "#1e3a8a");
      grad.addColorStop(0.7, "#0284c7");
      grad.addColorStop(1, "#38bdf8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 680);

      // Centered DeviceSense AI Pulse Graphic
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(512, 320, 140, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DeviceSense AI", 512, 320);

      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText("Active Real-Time Monitoring", 512, 360);

      // Windows 11 Taskbar at bottom
      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.fillRect(0, 620, 1024, 60);

      // Centered taskbar icons
      const icons = ["#38bdf8", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];
      icons.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(440 + i * 32, 632, 22, 22, 6);
        ctx.fill();
      });
    };

    renderScreenTexture();
    const screenTexture = new THREE.CanvasTexture(screenCanvas);

    const screenGeo = new THREE.PlaneGeometry(baseWidth - 0.28, baseDepth - 0.28);
    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTexture,
      toneMapped: false,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, baseDepth / 2, 0.012);
    lidGroup.add(screenMesh);

    // Screen ambient glow light
    const screenGlow = new THREE.PointLight(0x38bdf8, 1.8, 4);
    screenGlow.position.set(0, baseDepth / 2, 0.8);
    lidGroup.add(screenGlow);

    // --- Interactive Mouse Parallax ---
    let targetCamX = -2.8;
    let targetCamY = 2.9;

    const onMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetCamX = -2.8 + normX * 0.45;
      targetCamY = 2.9 + normY * 0.35;
    };

    window.addEventListener("mousemove", onMouseMove);

    // Animation Render Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera interpolation
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(-0.8, 0.4, 0);

      // Subtle breathing float on laptop lid
      lidGroup.rotation.x = -1.22 + Math.sin(elapsed * 0.5) * 0.01;

      // Soft glow pulse
      screenGlow.intensity = 1.6 + Math.sin(elapsed * 1.5) * 0.3;

      renderer.render(scene, camera);
    };

    animate();

    // Window Resize
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="workspace-3d-background-canvas"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
}
