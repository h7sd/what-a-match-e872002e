import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv;
    
    // Create flowing liquid effect
    float time = uTime * 0.3;
    
    // Layer multiple noise octaves for organic movement
    float noise1 = snoise(uv * 2.0 + time * 0.5);
    float noise2 = snoise(uv * 4.0 - time * 0.3);
    float noise3 = snoise(uv * 8.0 + time * 0.2);
    
    // Combine noise layers
    float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    
    // Create color palette - dark purple/violet theme
    vec3 color1 = vec3(0.05, 0.02, 0.1); // Very dark purple
    vec3 color2 = vec3(0.15, 0.05, 0.25); // Dark purple
    vec3 color3 = vec3(0.3, 0.1, 0.4); // Purple
    vec3 color4 = vec3(0.5, 0.2, 0.6); // Light purple accent
    
    // Mix colors based on noise
    float t = combinedNoise * 0.5 + 0.5;
    vec3 finalColor;
    
    if (t < 0.33) {
      finalColor = mix(color1, color2, t * 3.0);
    } else if (t < 0.66) {
      finalColor = mix(color2, color3, (t - 0.33) * 3.0);
    } else {
      finalColor = mix(color3, color4, (t - 0.66) * 3.0);
    }
    
    // Add subtle vignette
    float vignette = 1.0 - length(uv - 0.5) * 0.5;
    finalColor *= vignette;
    
    // Add subtle glow pulsation
    float glow = sin(time * 2.0) * 0.1 + 0.9;
    finalColor *= glow;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function LiquidMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

interface LiquidEtherProps {
  className?: string;
}

export function LiquidEther({ className = '' }: LiquidEtherProps) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 1] }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: false, alpha: false }}
      >
        <LiquidMesh />
      </Canvas>
    </div>
  );
}
