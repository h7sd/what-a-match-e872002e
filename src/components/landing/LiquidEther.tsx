import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface LiquidEtherProps {
  className?: string;
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  resolution?: number;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
}

export function LiquidEther({ 
  className = '',
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  mouseForce = 20,
  cursorSize = 100,
  resolution = 0.5,
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
}: LiquidEtherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Configuration
    const config = {
      mouseForce,
      cursorSize,
      isViscous: false,
      viscous: 30,
      iterationsViscous: 32,
      iterationsPoisson: 32,
      dt: 0.014,
      BFECC: true,
      resolution,
      isBounce: false,
      autoDemo,
      autoSpeed,
      autoIntensity,
      takeoverDuration: 0.25,
      autoResumeDelay: 1000,
      autoRampDuration: 0.6,
      colors,
    };

    let width = container.clientWidth;
    let height = container.clientHeight;
    let simWidth = Math.floor(width * config.resolution);
    let simHeight = Math.floor(height * config.resolution);

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Shader materials
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const advectionShader = `
      precision highp float;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      varying vec2 vUv;

      void main() {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
      }
    `;

    const divergenceShader = `
      precision highp float;
      uniform sampler2D uVelocity;
      uniform vec2 texelSize;
      varying vec2 vUv;

      void main() {
        float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;
        float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;
        float T = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).y;
        float B = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `;

    const pressureShader = `
      precision highp float;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      uniform vec2 texelSize;
      varying vec2 vUv;

      void main() {
        float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
        float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
        float div = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - div) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `;

    const gradientSubtractShader = `
      precision highp float;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      uniform vec2 texelSize;
      varying vec2 vUv;

      void main() {
        float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
        float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `;

    const splatShader = `
      precision highp float;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `;

    const displayShader = `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec3 color0;
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;

      void main() {
        vec2 vel = texture2D(uTexture, vUv).xy;
        float speed = length(vel) * 0.5;
        speed = clamp(speed, 0.0, 1.0);
        
        vec3 color;
        if (speed < 0.5) {
          color = mix(color0, color1, speed * 2.0);
        } else {
          color = mix(color1, color2, (speed - 0.5) * 2.0);
        }
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Parse colors
    const parseColor = (hex: string): THREE.Vector3 => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? new THREE.Vector3(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ) : new THREE.Vector3(0, 0, 0);
    };

    const color0 = parseColor(config.colors[0] || '#5227FF');
    const color1 = parseColor(config.colors[1] || '#FF9FFC');
    const color2 = parseColor(config.colors[2] || '#B19EEF');

    // Create render targets
    const createRenderTarget = () => new THREE.WebGLRenderTarget(simWidth, simHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });

    let velocity0 = createRenderTarget();
    let velocity1 = createRenderTarget();
    let pressure0 = createRenderTarget();
    let pressure1 = createRenderTarget();
    let divergence = createRenderTarget();

    const texelSize = new THREE.Vector2(1 / simWidth, 1 / simHeight);

    // Create materials
    const quadGeometry = new THREE.PlaneGeometry(2, 2);

    const advectionMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: advectionShader,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        texelSize: { value: texelSize },
        dt: { value: config.dt },
        dissipation: { value: 0.98 },
      },
    });

    const divergenceMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: divergenceShader,
      uniforms: {
        uVelocity: { value: null },
        texelSize: { value: texelSize },
      },
    });

    const pressureMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: pressureShader,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        texelSize: { value: texelSize },
      },
    });

    const gradientSubtractMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: gradientSubtractShader,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        texelSize: { value: texelSize },
      },
    });

    const splatMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: splatShader,
      uniforms: {
        uTarget: { value: null },
        aspectRatio: { value: width / height },
        color: { value: new THREE.Vector3() },
        point: { value: new THREE.Vector2() },
        radius: { value: config.cursorSize / 1000 },
      },
    });

    const displayMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: displayShader,
      uniforms: {
        uTexture: { value: null },
        color0: { value: color0 },
        color1: { value: color1 },
        color2: { value: color2 },
      },
    });

    const quad = new THREE.Mesh(quadGeometry, displayMaterial);
    scene.add(quad);

    // Mouse state
    let mouseX = 0.5;
    let mouseY = 0.5;
    let lastMouseX = 0.5;
    let lastMouseY = 0.5;
    let isUserInteracting = false;
    let lastInteractionTime = 0;
    let autoTime = 0;
    let autoRampProgress = 1;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = 1 - (e.clientY - rect.top) / rect.height;
      isUserInteracting = true;
      lastInteractionTime = performance.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        mouseX = (e.touches[0].clientX - rect.left) / rect.width;
        mouseY = 1 - (e.touches[0].clientY - rect.top) / rect.height;
        isUserInteracting = true;
        lastInteractionTime = performance.now();
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchmove', handleTouchMove);

    const blit = (target: THREE.WebGLRenderTarget | null, material: THREE.ShaderMaterial) => {
      quad.material = material;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
    };

    const splat = (x: number, y: number, dx: number, dy: number) => {
      splatMaterial.uniforms.uTarget.value = velocity0.texture;
      splatMaterial.uniforms.point.value.set(x, y);
      splatMaterial.uniforms.color.value.set(dx * config.mouseForce, dy * config.mouseForce, 0);
      splatMaterial.uniforms.radius.value = config.cursorSize / 1000;
      blit(velocity1, splatMaterial);
      [velocity0, velocity1] = [velocity1, velocity0];
    };

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      
      // Auto demo mode
      if (config.autoDemo && now - lastInteractionTime > config.autoResumeDelay) {
        isUserInteracting = false;
        autoRampProgress = Math.min(1, autoRampProgress + 0.016 / config.autoRampDuration);
        autoTime += 0.016 * config.autoSpeed * autoRampProgress;
        
        const autoX = 0.5 + 0.3 * Math.sin(autoTime * 0.7) * Math.cos(autoTime * 0.3);
        const autoY = 0.5 + 0.3 * Math.cos(autoTime * 0.5) * Math.sin(autoTime * 0.4);
        
        mouseX = autoX;
        mouseY = autoY;
      } else {
        autoRampProgress = 0;
      }

      // Calculate velocity
      const dx = mouseX - lastMouseX;
      const dy = mouseY - lastMouseY;
      lastMouseX = mouseX;
      lastMouseY = mouseY;

      // Apply splat if there's movement
      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        const force = isUserInteracting ? 1 : config.autoIntensity;
        splat(mouseX, mouseY, dx * force, dy * force);
      }

      // Advection
      advectionMaterial.uniforms.uVelocity.value = velocity0.texture;
      advectionMaterial.uniforms.uSource.value = velocity0.texture;
      blit(velocity1, advectionMaterial);
      [velocity0, velocity1] = [velocity1, velocity0];

      // Divergence
      divergenceMaterial.uniforms.uVelocity.value = velocity0.texture;
      blit(divergence, divergenceMaterial);

      // Pressure solve
      for (let i = 0; i < config.iterationsPoisson; i++) {
        pressureMaterial.uniforms.uPressure.value = pressure0.texture;
        pressureMaterial.uniforms.uDivergence.value = divergence.texture;
        blit(pressure1, pressureMaterial);
        [pressure0, pressure1] = [pressure1, pressure0];
      }

      // Gradient subtract
      gradientSubtractMaterial.uniforms.uPressure.value = pressure0.texture;
      gradientSubtractMaterial.uniforms.uVelocity.value = velocity0.texture;
      blit(velocity1, gradientSubtractMaterial);
      [velocity0, velocity1] = [velocity1, velocity0];

      // Display
      displayMaterial.uniforms.uTexture.value = velocity0.texture;
      quad.material = displayMaterial;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      simWidth = Math.floor(width * config.resolution);
      simHeight = Math.floor(height * config.resolution);
      
      renderer.setSize(width, height);
      texelSize.set(1 / simWidth, 1 / simHeight);
      splatMaterial.uniforms.aspectRatio.value = width / height;

      velocity0.setSize(simWidth, simHeight);
      velocity1.setSize(simWidth, simHeight);
      pressure0.setSize(simWidth, simHeight);
      pressure1.setSize(simWidth, simHeight);
      divergence.setSize(simWidth, simHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchmove', handleTouchMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      velocity0.dispose();
      velocity1.dispose();
      pressure0.dispose();
      pressure1.dispose();
      divergence.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [colors, mouseForce, cursorSize, resolution, autoDemo, autoSpeed, autoIntensity]);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    />
  );
}
