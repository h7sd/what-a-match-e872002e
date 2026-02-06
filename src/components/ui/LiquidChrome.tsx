import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

interface LiquidChromeProps {
  baseColor?: [number, number, number];
  speed?: number;
  amplitude?: number;
  frequencyX?: number;
  frequencyY?: number;
  interactive?: boolean;
  className?: string;
}

const vertexShader = `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0, 1);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform float uAmplitude;
  uniform float uFrequencyX;
  uniform float uFrequencyY;
  uniform vec2 uMouse;
  uniform float uMouseInfluence;
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    
    // Add mouse influence
    vec2 mouseEffect = (uMouse - 0.5) * uMouseInfluence * 0.1;
    uv += mouseEffect;
    
    // Chrome liquid distortion
    float distort1 = sin(uv.x * uFrequencyX + uTime) * uAmplitude;
    float distort2 = cos(uv.y * uFrequencyY + uTime * 0.8) * uAmplitude;
    float distort3 = sin((uv.x + uv.y) * 3.0 + uTime * 1.2) * uAmplitude * 0.5;
    
    vec2 distortedUv = uv + vec2(distort1, distort2 + distort3);
    
    // Chrome-like reflections
    float chrome = sin(distortedUv.x * 10.0 + uTime) * 0.5 + 0.5;
    chrome *= cos(distortedUv.y * 8.0 - uTime * 0.5) * 0.5 + 0.5;
    chrome = pow(chrome, 1.5);
    
    // Fresnel-like edge effect
    float fresnel = pow(1.0 - abs(uv.x - 0.5) * 2.0, 2.0);
    fresnel *= pow(1.0 - abs(uv.y - 0.5) * 2.0, 2.0);
    
    // Combine effects
    vec3 color = uBaseColor;
    color += vec3(chrome * 0.4);
    color += vec3(fresnel * 0.2);
    
    // Add highlight streaks
    float streak = sin(distortedUv.x * 20.0 + distortedUv.y * 10.0 + uTime * 2.0);
    streak = smoothstep(0.8, 1.0, streak);
    color += vec3(streak * 0.3);
    
    // Darken edges
    float vignette = 1.0 - length((uv - 0.5) * 1.5);
    vignette = smoothstep(0.0, 1.0, vignette);
    color *= vignette * 0.5 + 0.5;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function LiquidChrome({
  baseColor = [0.1, 0.1, 0.1],
  speed = 0.3,
  amplitude = 0.3,
  frequencyX = 2.5,
  frequencyY = 1.5,
  interactive = true,
  className = ''
}: LiquidChromeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const renderer = new Renderer({ 
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance'
    });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: baseColor },
        uAmplitude: { value: amplitude },
        uFrequencyX: { value: frequencyX },
        uFrequencyY: { value: frequencyY },
        uMouse: { value: [0.5, 0.5] },
        uMouseInfluence: { value: interactive ? 1.0 : 0.0 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    };
    
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      targetMouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height
      };
    };

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    let animationId: number;
    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);
      
      // Smooth mouse movement
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;
      
      program.uniforms.uTime.value = time * 0.001 * speed;
      program.uniforms.uMouse.value = [mouseRef.current.x, mouseRef.current.y];
      
      renderer.render({ scene: mesh });
    };
    
    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive]);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 ${className}`}
      style={{ overflow: 'hidden' }}
    />
  );
}

export default LiquidChrome;
