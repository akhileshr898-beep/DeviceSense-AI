import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Procedural interactive 3D Hardware Model Canvas:
 * Types: "cpu" | "memory" | "storage" | "network"
 * Renders brightly illuminated, centered, realistic 3D hardware components
 * matching commercial hardware with calibrated PBR materials, active indicators,
 * and mouse-interactive 3D tilt.
 */
export default function HardwareModelCanvas({ type = "cpu", utilization = 28 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = 64;
    const height = 64;

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
    camera.position.set(0, 0.45, 2.5);
    camera.lookAt(0, 0, 0);

    // Studio Lighting Rig for bright, specular reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(2.5, 4.0, 3.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 1.8);
    fillLight.position.set(-3.0, 2.0, 2.0);
    scene.add(fillLight);

    const topRimLight = new THREE.PointLight(0xffffff, 2.0, 10);
    topRimLight.position.set(0, 3, -1);
    scene.add(topRimLight);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    if (type === "cpu") {
      // ==========================================
      // 1. CPU: High-Performance Desktop Processor
      // ==========================================
      // Green substrate PCB
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.08, 1.35),
        new THREE.MeshStandardMaterial({
          color: 0x065f46,
          roughness: 0.35,
          metalness: 0.25,
        })
      );
      modelGroup.add(pcb);

      // Gold pins / contact perimeter underneath
      const pins = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 0.03, 1.38),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.9,
          roughness: 0.15,
        })
      );
      pins.position.y = -0.04;
      modelGroup.add(pins);

      // Pin 1 Gold alignment triangle in corner
      const pin1 = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.03, 3),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.95, roughness: 0.1 })
      );
      pin1.rotation.x = Math.PI / 2;
      pin1.position.set(-0.56, 0.045, -0.56);
      modelGroup.add(pin1);

      // Polished Nickel-Plated Integrated Heat Spreader (IHS)
      // Base rim
      const ihsBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.06, 1.18),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.65,
          roughness: 0.22,
        })
      );
      ihsBase.position.y = 0.07;
      modelGroup.add(ihsBase);

      // Upper cap with beveled look
      const ihsCap = new THREE.Mesh(
        new THREE.BoxGeometry(1.02, 0.08, 1.02),
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          metalness: 0.75,
          roughness: 0.18,
        })
      );
      ihsCap.position.y = 0.12;
      modelGroup.add(ihsCap);

      // Silicon Core / Etched Die with glowing activity pulse
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.02, 0.42),
        new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x0ea5e9,
          emissiveIntensity: 2.2,
          roughness: 0.15,
        })
      );
      core.position.y = 0.165;
      modelGroup.add(core);

      modelGroup.userData.pulseMesh = core;
      modelGroup.rotation.x = 0.48;
      modelGroup.rotation.y = -0.42;

    } else if (type === "memory") {
      // ==========================================
      // 2. RAM: Angled High-Performance DDR5 Module
      // ==========================================
      // Dark matte PCB
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.68, 0.72, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 })
      );
      modelGroup.add(pcb);

      // Gold contact fingers at bottom edge
      const pins = new THREE.Mesh(
        new THREE.BoxGeometry(1.54, 0.14, 0.07),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.95,
          roughness: 0.15,
        })
      );
      pins.position.y = -0.32;
      modelGroup.add(pins);

      // Anodized Violet / Deep Indigo Aluminum Armor Heatsink
      const armor = new THREE.Mesh(
        new THREE.BoxGeometry(1.64, 0.52, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0x7c3aed,
          metalness: 0.65,
          roughness: 0.25,
        })
      );
      armor.position.y = 0.04;
      modelGroup.add(armor);

      // 4 Realistic black memory chips visible in heatsink cutouts
      for (const xPos of [-0.48, -0.16, 0.16, 0.48]) {
        const chip = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.32, 0.14),
          new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.55,
            metalness: 0.3,
          })
        );
        chip.position.set(xPos, 0.02, 0);
        modelGroup.add(chip);
      }

      // Frosted Acrylic RGB Diffuser Bar on top edge
      const rgbBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.64, 0.12, 0.13),
        new THREE.MeshStandardMaterial({
          color: 0xe879f9,
          emissive: 0xc084fc,
          emissiveIntensity: 2.6,
          roughness: 0.12,
        })
      );
      rgbBar.position.y = 0.33;
      modelGroup.add(rgbBar);

      modelGroup.userData.pulseMesh = rgbBar;
      modelGroup.rotation.x = 0.26;
      modelGroup.rotation.y = -0.34;

    } else if (type === "storage") {
      // ==========================================
      // 3. STORAGE: M.2 NVMe SSD with Heatsink & LED
      // ==========================================
      // Emerald Green PCB
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.68, 0.58, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.35 })
      );
      modelGroup.add(pcb);

      // Gold PCIe edge connector pins on left end
      const pins = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.48, 0.07),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.95,
          roughness: 0.15,
        })
      );
      pins.position.x = -0.76;
      modelGroup.add(pins);

      // Titanium Finned Aluminum Heatsink
      const heatsink = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.48, 0.1),
        new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.65,
          roughness: 0.25,
        })
      );
      heatsink.position.x = 0.12;
      modelGroup.add(heatsink);

      // Emerald Cooling Ridges / Fins
      for (let i = -1; i <= 1; i++) {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(1.12, 0.04, 0.05),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            metalness: 0.55,
            roughness: 0.2,
          })
        );
        fin.position.set(0.12, i * 0.12, 0.09);
        modelGroup.add(fin);
      }

      // Silicon Memory Controller Chip (Silver Nickel package)
      const controller = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.26, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.7,
          roughness: 0.22,
        })
      );
      controller.position.set(-0.35, 0, 0.05);
      modelGroup.add(controller);

      // Emerald Pulsing Activity LED
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x10b981,
          emissiveIntensity: 3.2,
        })
      );
      led.position.set(-0.52, 0.16, 0.07);
      modelGroup.add(led);

      modelGroup.userData.pulseMesh = led;
      modelGroup.rotation.x = 0.28;
      modelGroup.rotation.y = -0.34;

    } else if (type === "network") {
      // ==========================================
      // 4. NETWORK: Polished Silver RJ45 Port + Waves
      // ==========================================
      // Silver Metallic Port Chassis (Low metalness to stay bright silver!)
      const port = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.72, 0.92),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.45,
          roughness: 0.25,
        })
      );
      modelGroup.add(port);

      // Cavity (Cable Port Opening)
      const cavity = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.46, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 })
      );
      cavity.position.set(0, -0.05, 0.35);
      modelGroup.add(cavity);

      // 8 Gold Contact Pins inside the cavity
      const pinBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.04, 0.22),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.95,
          roughness: 0.1,
        })
      );
      pinBlock.position.set(0, 0.08, 0.36);
      modelGroup.add(pinBlock);

      // Left Link LED (Green)
      const ledG = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 2.8,
        })
      );
      ledG.position.set(-0.25, 0.24, 0.47);
      modelGroup.add(ledG);

      // Right Activity LED (Amber)
      const ledA = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.5,
        })
      );
      ledA.position.set(0.25, 0.24, 0.47);
      modelGroup.add(ledA);

      // Animated 3D Amber Signal Wave Arcs
      const wave1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.03, 8, 28, Math.PI * 0.9),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.6,
          transparent: true,
          opacity: 0.9,
        })
      );
      wave1.rotation.z = Math.PI * 1.05;
      wave1.position.set(0, 0.52, 0.1);
      modelGroup.add(wave1);

      modelGroup.userData.pulseMesh = wave1;
      modelGroup.rotation.x = 0.28;
      modelGroup.rotation.y = -0.36;
    }

    const baseRotX = modelGroup.rotation.x;
    const baseRotY = modelGroup.rotation.y;

    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth floating auto-tilt
      modelGroup.rotation.y = baseRotY + Math.sin(elapsed * 0.9) * 0.14;
      modelGroup.rotation.x = baseRotX + Math.cos(elapsed * 0.7) * 0.05;

      // Activity pulsation tied to utilization
      if (modelGroup.userData.pulseMesh?.material?.emissiveIntensity !== undefined) {
        const pulse = 1.0 + Math.sin(elapsed * (2.4 + utilization * 0.04)) * 0.55;
        modelGroup.userData.pulseMesh.material.emissiveIntensity = 1.6 + pulse * 1.0;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      modelGroup.rotation.y = baseRotY + x * 0.4;
      modelGroup.rotation.x = baseRotX - y * 0.25;
    };

    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousemove", handleMouseMove);
      renderer.dispose();
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [type, utilization]);

  const bgTints = {
    cpu: "rgba(2, 132, 199, 0.10)",
    memory: "rgba(139, 92, 246, 0.10)",
    storage: "rgba(16, 185, 129, 0.10)",
    network: "rgba(245, 158, 11, 0.10)",
  };

  const borderTints = {
    cpu: "rgba(2, 132, 199, 0.20)",
    memory: "rgba(139, 92, 246, 0.20)",
    storage: "rgba(16, 185, 129, 0.20)",
    network: "rgba(245, 158, 11, 0.20)",
  };

  return (
    <div
      ref={mountRef}
      className="hardware-3d-canvas-box"
      style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        background: bgTints[type] || "rgba(255,255,255,0.7)",
        border: `1px solid ${borderTints[type] || "rgba(226,232,240,0.8)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    />
  );
}
