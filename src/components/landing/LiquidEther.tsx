import { useRef, useEffect } from 'react';

interface LiquidEtherProps {
  className?: string;
}

export function LiquidEther({ className = '' }: LiquidEtherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Simplex noise implementation
    const grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];

    const perm = new Array(512);
    const gradP = new Array(512);

    for (let i = 0; i < 256; i++) {
      perm[i] = perm[i + 256] = p[i];
      gradP[i] = gradP[i + 256] = grad3[p[i] % 12];
    }

    const dot2 = (g: number[], x: number, y: number) => g[0] * x + g[1] * y;

    const noise2D = (xin: number, yin: number) => {
      const F2 = 0.5 * (Math.sqrt(3) - 1);
      const G2 = (3 - Math.sqrt(3)) / 6;
      
      let n0, n1, n2;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;
      
      let i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; }
      else { i1 = 0; j1 = 1; }
      
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      
      const ii = i & 255;
      const jj = j & 255;
      const gi0 = gradP[ii + perm[jj]];
      const gi1 = gradP[ii + i1 + perm[jj + j1]];
      const gi2 = gradP[ii + 1 + perm[jj + 1]];
      
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 < 0) n0 = 0;
      else {
        t0 *= t0;
        n0 = t0 * t0 * dot2(gi0, x0, y0);
      }
      
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 < 0) n1 = 0;
      else {
        t1 *= t1;
        n1 = t1 * t1 * dot2(gi1, x1, y1);
      }
      
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 < 0) n2 = 0;
      else {
        t2 *= t2;
        n2 = t2 * t2 * dot2(gi2, x2, y2);
      }
      
      return 70 * (n0 + n1 + n2);
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      time += 0.003;
      
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const uvX = x / canvas.width;
          const uvY = y / canvas.height;
          
          // Layer multiple noise octaves
          const noise1 = noise2D(uvX * 2 + time * 0.5, uvY * 2 + time * 0.3);
          const noise2 = noise2D(uvX * 4 - time * 0.3, uvY * 4 + time * 0.2);
          const noise3 = noise2D(uvX * 8 + time * 0.2, uvY * 8 - time * 0.1);
          
          const combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
          const t = (combinedNoise + 1) * 0.5;
          
          // Color palette - dark purple/violet theme
          const colors = [
            { r: 13, g: 5, b: 26 },    // Very dark purple
            { r: 38, g: 13, b: 64 },   // Dark purple
            { r: 77, g: 26, b: 102 },  // Purple
            { r: 128, g: 51, b: 153 }  // Light purple accent
          ];
          
          let r, g, b;
          if (t < 0.33) {
            const lt = t * 3;
            r = lerp(colors[0].r, colors[1].r, lt);
            g = lerp(colors[0].g, colors[1].g, lt);
            b = lerp(colors[0].b, colors[1].b, lt);
          } else if (t < 0.66) {
            const lt = (t - 0.33) * 3;
            r = lerp(colors[1].r, colors[2].r, lt);
            g = lerp(colors[1].g, colors[2].g, lt);
            b = lerp(colors[1].b, colors[2].b, lt);
          } else {
            const lt = (t - 0.66) * 3;
            r = lerp(colors[2].r, colors[3].r, lt);
            g = lerp(colors[2].g, colors[3].g, lt);
            b = lerp(colors[2].b, colors[3].b, lt);
          }
          
          // Vignette
          const vignette = 1 - Math.sqrt(Math.pow(uvX - 0.5, 2) + Math.pow(uvY - 0.5, 2)) * 0.5;
          r *= vignette;
          g *= vignette;
          b *= vignette;
          
          // Glow pulsation
          const glow = Math.sin(time * 2) * 0.1 + 0.9;
          r *= glow;
          g *= glow;
          b *= glow;
          
          // Fill 2x2 block for performance
          for (let dy = 0; dy < 2 && y + dy < canvas.height; dy++) {
            for (let dx = 0; dx < 2 && x + dx < canvas.width; dx++) {
              const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
              data[idx] = Math.floor(r);
              data[idx + 1] = Math.floor(g);
              data[idx + 2] = Math.floor(b);
              data[idx + 3] = 255;
            }
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
