import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 3D RAM Modules Visual for the Attention Required Banner:
 * Renders dual high-performance RAM sticks with metallic cobalt blue heatspreaders,
 * bold "RAM" text markings, illuminated RGB diffusers, golden PCB pins,
 * seated in a clean white motherboard DIMM socket stand.
 */
export default function RamWarningCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = 200;
    const height = 120;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 1.15, 3.4);
    camera.lookAt(0, 0.05, 0);

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.6);
    sunLight.position.set(3, 5, 4);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 2.0);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const ramGroup = new THREE.Group();
    scene.add(ramGroup);

    // Glossy White DIMM Socket Pedestal Base
    const slotBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.2, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.18,
        metalness: 0.08,
      })
    );
    slotBase.position.y = -0.42;
    ramGroup.add(slotBase);

    // Dual DIMM slot retention latches at ends
    for (const xSide of [-1.22, 1.22]) {
      const clip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.36, 0.95),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.25,
          metalness: 0.15,
        })
      );
      clip.position.set(xSide, -0.3, 0);
      ramGroup.add(clip);
    }

    // High-resolution Canvas Texture for crisp "RAM" text
    const createRamTextTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Deep cobalt blue background
        ctx.fillStyle = "#1d4ed8";
        ctx.fillRect(0, 0, 512, 128);

        // Bold white RAM typography
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 76px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "6px";
        ctx.fillText("RAM", 256, 64);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    const ramTextTexture = createRamTextTexture();

    // Factory for Parallel RAM Module
    const createRamStick = (zOffset) => {
      const stick = new THREE.Group();
      stick.position.z = zOffset;

      // Dark PCB
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.68, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 })
      );
      stick.add(pcb);

      // Gold pins at bottom
      const pins = new THREE.Mesh(
        new THREE.BoxGeometry(1.95, 0.1, 0.06),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.95,
          roughness: 0.1,
        })
      );
      pins.position.y = -0.3;
      stick.add(pins);

      // Blue Anodized Metallic Heatspreader Body with "RAM" text
      const heatSpreader = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 0.54, 0.1),
        new THREE.MeshStandardMaterial({
          map: ramTextTexture,
          color: 0x2563eb,
          metalness: 0.65,
          roughness: 0.22,
        })
      );
      heatSpreader.position.y = 0.05;
      stick.add(heatSpreader);

      // Glowing Cyan/Blue RGB Light Diffuser on top edge
      const rgbBar = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 0.1, 0.11),
        new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          emissive: 0x38bdf8,
          emissiveIntensity: 2.4,
          roughness: 0.1,
        })
      );
      rgbBar.position.y = 0.38;
      stick.add(rgbBar);

      return { stick, rgbBar };
    };

    const stick1 = createRamStick(0.22);
    const stick2 = createRamStick(-0.22);
    ramGroup.add(stick1.stick);
    ramGroup.add(stick2.stick);

    // Isometric orientation matching template
    ramGroup.rotation.y = -0.52;
    ramGroup.rotation.x = 0.32;

    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle floating hover
      ramGroup.position.y = Math.sin(elapsed * 1.5) * 0.035;
      ramGroup.rotation.y = -0.52 + Math.sin(elapsed * 0.9) * 0.07;

      // Pulsing memory alert glow
      const glow = 2.0 + Math.sin(elapsed * 3.2) * 0.65;
      stick1.rgbBar.material.emissiveIntensity = glow;
      stick2.rgbBar.material.emissiveIntensity = glow;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="ram-3d-scene-container"
      style={{
        width: 200,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 10px 20px rgba(37, 99, 235, 0.18))",
      }}
      title="3D Dual-Channel DDR5 RAM Modules"
    />
  );
}
