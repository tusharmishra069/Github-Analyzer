"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Preload, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function AbstractShape() {
    const meshRef = useRef<THREE.Mesh>(null);

    // Animate rotation gracefully
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime / 4) * Math.PI * 0.2;
            meshRef.current.rotation.y += 0.005;
        }
    });

    return (
        <Float floatIntensity={2} speed={1.5} rotationIntensity={0.5}>
            <mesh ref={meshRef} position={[0, 0, 0]} scale={1.5}>
                <icosahedronGeometry args={[1, 0]} />
                <meshPhysicalMaterial
                    color="#ffffff"
                    roughness={0.1}
                    metalness={0.8}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    wireframe={true}
                    wireframeLinewidth={2}
                    emissive="#6366f1"
                    emissiveIntensity={0.2}
                />
            </mesh>
        </Float>
    );
}

export function ThreeDScene() {
    return (
        <div className="absolute inset-0 z-0 h-full w-full pointer-events-none opacity-40">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#e0e7ff" />

                <AbstractShape />

                <ContactShadows
                    position={[0, -2, 0]}
                    opacity={0.4}
                    scale={10}
                    blur={2.5}
                    far={10}
                    resolution={256}
                    color="#000000"
                />
                <Environment preset="city" />
                <Preload all />
            </Canvas>
        </div>
    );
}
