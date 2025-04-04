import * as THREE from 'three';

export const WaterDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    intensity: { value: 0.8 },
    mousePosition: { value: new THREE.Vector2(0.5, 0.5) },
    isActive: { value: 0 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform vec2 mousePosition;
    uniform float isActive;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      
      // Mouse distance and falloff
      vec2 toMouse = uv - mousePosition;
      float dist = length(toMouse);
      vec2 dir = normalize(toMouse);
      float falloff = smoothstep(0.4, 0.0, dist);
      
      // Wave effect
      float wave = sin(dist * 15.0 - time * 3.0) * 0.1 * intensity * isActive * falloff;
      float circularWave = sin(dist * 20.0 + time * 2.0) * 0.05 * intensity * isActive * falloff;
      
      vec2 offset = vec2(
        (wave + circularWave) * dir.x,
        (wave + circularWave) * dir.y
      );
      
      gl_FragColor = texture2D(tDiffuse, uv + offset);
    }
  `
}; 