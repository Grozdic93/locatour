import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  AfterViewInit,
  PLATFORM_ID,
  NgZone
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';

// Import loaders
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import {
  Lensflare,
  LensflareElement,
} from 'three/examples/jsm/objects/Lensflare.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import gsap from 'gsap';
import { WaterDistortionShader } from './water-distortion-shader';

@Component({
  selector: 'app-compass',
  template: `<div #compassContainer class="compass-container"></div>`,
  styleUrls: ['./compass.component.scss'],
})
export class CompassComponent implements AfterViewInit, OnDestroy {
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private animationFrameId?: number;
  private model?: THREE.Object3D;
  private composer?: EffectComposer;
  private particles?: THREE.Points;
  private originalPositions?: Float32Array;
  private originalColors?: Float32Array;
  private originalSizes?: Float32Array;
  private particleTime: number = 0;
  private isBrowser: boolean;
  private resizeObserver?: ResizeObserver;
  private container?: HTMLElement;
  private waterPass?: ShaderPass;
  private distortionTime: number = 0;
  private isActive: boolean = false;
  private mousePosition: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private lastMousePosition: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private lastMouseTime: number = 0;
  private currentIntensity: number = 0;
  private isMobile: boolean = false;
  private velocity: THREE.Vector2 = new THREE.Vector2(0, 0);
  private targetIntensity: number = 0;
  private momentum: number = 0;

  constructor(
    private elementRef: ElementRef,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.isMobile = this.isBrowser && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.container = this.elementRef.nativeElement.querySelector('.compass-container');
      if (this.container) {
        this.ngZone.runOutsideAngular(() => {
          this.initThreeJS();
        });
      }
    }
  }

  private setupPostProcessing() {
    if (!this.renderer || !this.scene || !this.camera) return;

    console.log('Setting up post processing...');

    // Create a composer for post-processing
    this.composer = new EffectComposer(this.renderer);

    // Add the main render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Add bloom for the glow effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.1,
      0.4,
      0.9
    );
    this.composer.addPass(bloomPass);

    // Add water distortion effect
    this.waterPass = new ShaderPass(WaterDistortionShader);
    this.waterPass.uniforms['intensity'].value = 0.8;
    this.waterPass.uniforms['isActive'].value = 0;
    this.waterPass.uniforms['mousePosition'].value = this.mousePosition;
    this.composer.addPass(this.waterPass);

    console.log('Water distortion shader initialized:', this.waterPass);

    // Add film grain and scanlines for cinematic effect
    const filmPass = new FilmPass(
      0.1,
      false
    );
    this.composer.addPass(filmPass);

    // Add anti-aliasing pass
    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x =
      1 / (window.innerWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y =
      1 / (window.innerHeight * pixelRatio);
    this.composer.addPass(fxaaPass);

    // Set initial size
    if (this.container && this.container.clientWidth > 0 && this.container.clientHeight > 0) {
      this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    // Add event listeners for mouse/touch interaction
    this.setupInteractionListeners();
  }

  private setupInteractionListeners() {
    if (!this.container || this.isMobile) {
      console.log('Skipping interaction setup on mobile device');
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      let lastMoveTime = performance.now();
      const MOVEMENT_THRESHOLD = 50;

      const handleMouseMove = (event: MouseEvent) => {
        if (!this.container || !this.waterPass) return;
        
        // Check if we're over an interactive element
        const target = event.target as HTMLElement;
        const isOverInteractive = target.closest('input, button, a, [role="button"], [tabindex]');
        
        if (isOverInteractive) {
          this.isActive = false;
          this.waterPass.uniforms['isActive'].value = 0;
          return;
        }
        
        const currentTime = performance.now();
        lastMoveTime = currentTime;
        
        const rect = this.container.getBoundingClientRect();
        
        // Calculate mouse speed and limit it
        const dx = event.clientX - this.lastMousePosition.x;
        const dy = event.clientY - this.lastMousePosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeDelta = currentTime - this.lastMouseTime;
        const speed = Math.min(distance / timeDelta, 3.0);
        
        this.lastMousePosition.x = event.clientX;
        this.lastMousePosition.y = event.clientY;
        this.lastMouseTime = currentTime;
        
        // Normalize mouse position and flip Y
        this.mousePosition.x = (event.clientX - rect.left) / rect.width;
        this.mousePosition.y = 1.0 - (event.clientY - rect.top) / rect.height;
        
        this.targetIntensity = Math.min(speed * 0.1, 0.8);
        this.momentum = Math.min(speed * 0.1, 1.0);
        
        this.waterPass.uniforms['mousePosition'].value = this.mousePosition;
        this.waterPass.uniforms['isActive'].value = 1;
        this.isActive = true;
      };

      const handleMouseLeave = () => {
        if (!this.waterPass) return;
        this.isActive = false;
        this.waterPass.uniforms['isActive'].value = 0;
        this.currentIntensity = 0;
        this.momentum = 0;
      };

      const checkMouseStop = () => {
        if (!this.waterPass) return;
        const currentTime = performance.now();
        if (currentTime - lastMoveTime > MOVEMENT_THRESHOLD && this.isActive) {
          this.isActive = false;
        }
      };

      const options = { passive: true };
      if (this.container) {
        this.container.addEventListener('mousemove', handleMouseMove, options);
        this.container.addEventListener('mouseleave', handleMouseLeave);
        
        const animationFrame = () => {
          checkMouseStop();
          requestAnimationFrame(animationFrame);
        };
        requestAnimationFrame(animationFrame);
      }

      return () => {
        if (this.container) {
          this.container.removeEventListener('mousemove', handleMouseMove);
          this.container.removeEventListener('mouseleave', handleMouseLeave);
        }
      };
    });
  }

  private initThreeJS() {
    if (!this.container) return;

    this.scene = new THREE.Scene();

    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.3, 3);
    this.camera.lookAt(0, 1.3, 0);

    // Setup renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.1;
    this.renderer.setClearColor(0x000000, 0);

    this.container.appendChild(this.renderer.domElement);

    // Add lights
    const fillLight = new THREE.DirectionalLight(0xffaa44, 0.8);
    fillLight.position.set(3, 1, 5);
    this.scene.add(fillLight);

    // Load Environment Map
    this.loadEnvironmentMap();

    const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    });

    // Load Model
    const loader = new GLTFLoader();
    loader.load('/assets/models/compass.glb', (gltf) => {
      this.model = gltf.scene;
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          // Make material reflective
          child.material.envMap = this.scene!.environment;
          child.material.metalness = 0.9; // High metalness for more reflection
          child.material.roughness = 0.1; // Low roughness for sharper reflections
          child.material.needsUpdate = true;
        }
      });
      this.model.position.set(0, 1.3, 0);
      this.model.scale.set(0.035, 0.035, 0.035);
      this.scene?.add(this.model);
      this.setupPostProcessing();

      this.particles = this.addParticles();
      this.animate();
    });

    // Setup resize observer for better performance
    this.resizeObserver = new ResizeObserver(() => {
      this.onWindowResize();
    });
    this.resizeObserver.observe(this.container);
  }

  private loadEnvironmentMap() {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer!);
    pmremGenerator.compileEquirectangularShader();

    const textureLoader = new RGBELoader()
      .setDataType(THREE.HalfFloatType) // Try HalfFloatType instead of FloatType
      .load(
        '/assets/textures/studio3.hdr', // Use .hdr extension
        (texture) => {
          const pmremGenerator = new THREE.PMREMGenerator(this.renderer!);
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          this.scene!.environment = envMap;
          pmremGenerator.dispose();
          texture.dispose();
        }
      );
  }

  private addParticles() {
    // Get the model's position
    const modelPosition = new THREE.Vector3(0, 1.3, 0); // Where your compass is

    const particleCount = 7500; // Increased particle count
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3); // Add color attribute
    const sizes = new Float32Array(particleCount); // Add varying sizes

    // Create a more controlled distribution
    for (let i = 0; i < particleCount * 3; i += 3) {
      // Generate random points in a cube
      const x = (Math.random() - 0.5) * 3;
      const y = (Math.random() - 0.5) * 3;
      const z = (Math.random() - 0.5) * 3;

      // Convert to spherical distribution by normalizing and scaling
      const length = Math.sqrt(x * x + y * y + z * z);
      const radius = 1 + Math.random() * 1.5; // Between 1 and 2.5 units from center

      // Skip particles that would be too close to the center
      if (length < 0.1) {
        i -= 3; // Try again for this particle
        continue;
      }

      // Position relative to model
      positions[i] = modelPosition.x + (x / length) * radius;
      positions[i + 1] = modelPosition.y + (y / length) * radius;
      positions[i + 2] = modelPosition.z + (z / length) * radius;

      // Create a color gradient based on position
      // Blue to cyan to white gradient
      const distanceFromCenter = Math.sqrt(
        Math.pow(positions[i] - modelPosition.x, 2) +
          Math.pow(positions[i + 1] - modelPosition.y, 2) +
          Math.pow(positions[i + 2] - modelPosition.z, 2)
      );

      // Map distance to color - IMPORTANT: store BASE colors
      const t = Math.min(distanceFromCenter / 2.5, 1.0);

      if (t < 0.5) {
        // Blue to cyan gradient (0.0-0.5)
        const normalizedT = t * 2; // Scale 0-0.5 to 0-1
        colors[i] = 0.0 + normalizedT * 0.0; // R: 0 -> 0
        colors[i + 1] = 0.1 + normalizedT * 0.8; // G: 0.1 -> 0.9
        colors[i + 2] = 0.8 + normalizedT * 0.2; // B: 0.8 -> 1.0
      } else {
        // Cyan to white gradient (0.5-1.0)
        const normalizedT = (t - 0.5) * 2; // Scale 0.5-1 to 0-1
        colors[i] = 0.0 + normalizedT * 1.0; // R: 0 -> 1.0
        colors[i + 1] = 0.9 + normalizedT * 0.1; // G: 0.9 -> 1.0
        colors[i + 2] = 1.0; // B: 1.0 -> 1.0
      }

      // Random particle sizes for depth effect
      const particleIdx = i / 3;
      sizes[particleIdx] = Math.random() * 0.015 + 0.005; // Slightly smaller sizes
    }

    // Add all attributes to the geometry
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Store original values
    this.originalPositions = new Float32Array(positions);
    this.originalColors = new Float32Array(colors);
    this.originalSizes = new Float32Array(sizes);

    // Create a simple circular texture for particles
    const particleTexture = this.createParticleTexture();

    // Use a better shader material for particles
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.03,
      map: particleTexture,
      transparent: true,
      opacity: 0.7, // Reduced opacity
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true, // Use vertex colors
      sizeAttenuation: true, // Size particles based on distance
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    this.scene!.add(particleSystem);

    return particleSystem;
  }

  // Create a circular particle texture programmatically
  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    const context = canvas.getContext('2d');
    if (context) {
      // Create a radial gradient - softer gradient
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(249, 141, 17, 0)');

      // Draw the particle
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }


  // Updated animation method
  private updateParticles() {
    if (
      !this.particles ||
      !this.originalPositions ||
      !this.originalColors ||
      !this.originalSizes
    )
      return;

    // Use a consistent time increment instead of Date.now() to avoid jitter
    this.particleTime += 0.006;
    const time = this.particleTime;

    const positionAttribute = this.particles.geometry.getAttribute('position');
    const colorAttribute = this.particles.geometry.getAttribute('color');
    const sizeAttribute = this.particles.geometry.getAttribute('size');

    if (!positionAttribute || !colorAttribute || !sizeAttribute) return;

    const positions = positionAttribute.array;
    const colors = colorAttribute.array;
    const sizes = sizeAttribute.array;

    for (let i = 0; i < positions.length; i += 3) {
      const particleIndex = i / 3;

      // POSITION ANIMATION
      // Calculate unique phase for each particle to prevent synchronized movement
      const phaseX = particleIndex * 0.21;
      const phaseY = particleIndex * 0.37;
      const phaseZ = particleIndex * 0.16;

      // Calculate distance from center for movement amplitude scaling
      const dx = this.originalPositions[i];
      const dy = this.originalPositions[i + 1] - 1.3; // Center Y
      const dz = this.originalPositions[i + 2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const movementScale = Math.min(distance / 2, 0.8);

      // Apply movement with multiple frequencies
      positions[i] =
        this.originalPositions[i] +
        Math.sin(time + phaseX) * 0.02 * movementScale;

      positions[i + 1] =
        this.originalPositions[i + 1] +
        Math.cos(time * 0.8 + phaseY) * 0.02 * movementScale;

      positions[i + 2] =
        this.originalPositions[i + 2] +
        Math.sin(time * 1.2 + phaseZ) * 0.02 * movementScale;

      // COLOR ANIMATION
      // Create subtle color pulsing by multiplying the original color by a factor
      const colorPulse = Math.sin(time * 2 + particleIndex * 0.1) * 0.15 + 0.9; // 0.7 to 1.0

      // Always use original color as base to prevent color accumulation
      colors[i] = this.originalColors[i] * colorPulse;
      colors[i + 1] = this.originalColors[i + 1] * colorPulse;
      colors[i + 2] = this.originalColors[i + 2] * colorPulse;

      // SIZE ANIMATION
      // Similar approach for size - always base on original size
      const sizePulse = Math.sin(time * 3 + particleIndex * 0.2) * 0.2 + 1; // 0.6 to 1.0
      sizes[particleIndex] = this.originalSizes[particleIndex] * sizePulse;
    }

    // Mark attributes as needing update
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;
  }


  //animation loop

  private animationState = {
    timeline: 0,
    bobbing: {
      phase: 0,
      amplitude: 0.05
    },
    tilt: {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      isAnimating: false
    },
    camera: {
      distance: 3,
      targetDistance: 3,
      isAnimating: false
    }
  };
  
  // Enhanced animation method with GSAP ==
  private updateModelAnimation() {
    if (!this.model) return;
    
    // Increment timeline
    this.animationState.timeline += 0.01;
    const timeline = this.animationState.timeline;
    
    // Every ~8 seconds, set new tilt targets for cinematic movement
    if (Math.floor(timeline * 60) % 80 === 0 && !this.animationState.tilt.isAnimating) {
      // Set new tilt targets within safe limits (max 60 degrees)
      this.animationState.tilt.targetX = (Math.random() - 0.8) * 0.8; // Max 0.8 radians (~45.8 degrees)
      this.animationState.tilt.targetY = (Math.random() - 0.7) * 0.8; // Max 0.8 radians (~45.8 degrees)
      
      // Animate to new tilt position using GSAP
      this.animationState.tilt.isAnimating = true;
      
      gsap.to(this.animationState.tilt, {
        x: this.animationState.tilt.targetX,
        y: this.animationState.tilt.targetY,
        duration: 2,
        ease: "power2.inOut",
        onComplete: () => {
          // Hold the position for a while
          setTimeout(() => {
            this.animationState.tilt.isAnimating = false;
          }, 2000);
        }
      });

      // Randomly trigger camera zoom
      if (Math.random() > 0.5 && !this.animationState.camera.isAnimating) {
        this.animationState.camera.isAnimating = true;
        this.animationState.camera.targetDistance = 2.5 + Math.random() * 1; // Zoom between 2.5 and 3.5
        
        gsap.to(this.animationState.camera, {
          distance: this.animationState.camera.targetDistance,
          duration: 2,
          ease: "power2.inOut",
          onComplete: () => {
            setTimeout(() => {
              // Return to original position
              gsap.to(this.animationState.camera, {
                distance: 3,
                duration: 2,
                ease: "power2.inOut",
                onComplete: () => {
                  this.animationState.camera.isAnimating = false;
                }
              });
            }, 2000);
          }
        });
      }
    }
    
    // Apply gentle bobbing motion
    this.animationState.bobbing.phase += 0.01;
    const bobAmount = Math.sin(this.animationState.bobbing.phase) * this.animationState.bobbing.amplitude;
    
    // Apply rotation and position
    this.model.rotation.x = this.animationState.tilt.x;
    this.model.rotation.y = this.animationState.tilt.y;
    this.model.position.y = 1.8 + bobAmount;
    
    // Update camera position with zoom
    if (this.camera) {
      this.camera.position.set(0, 1.3, this.animationState.camera.distance);
      this.camera.lookAt(0, 1.3, 0);
    }
  }
  private animate = () => {
    if (!this.scene || !this.camera) return;
    this.animationFrameId = requestAnimationFrame(this.animate);
  
    // Update model with cinematic animation
    this.updateModelAnimation();
    
    // Update particles
    this.updateParticles();

    // Update distortion effect
    this.updateDistortionEffect();
   
    // Use the composer if available, otherwise fall back to the renderer
    if (this.composer) {
      this.composer.render();
    } else if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private updateDistortionEffect() {
    if (!this.waterPass || this.isMobile) return;

    this.ngZone.runOutsideAngular(() => {
      this.distortionTime += 0.016;
      this.waterPass!.uniforms['time'].value = this.distortionTime;

      if (this.isActive) {
        this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.2;
      } else {
        this.momentum = Math.max(this.momentum * 0.99, 0);
        this.currentIntensity = Math.max(this.currentIntensity * 0.99, 0);
        
        if (this.currentIntensity < 0.01 && this.momentum < 0.01 && this.waterPass) {
          this.waterPass.uniforms['isActive'].value = 0;
          this.momentum = 0;
        }
      }

      if (this.waterPass) {
        this.waterPass.uniforms['intensity'].value = this.currentIntensity;
      }
    });
  }

  private onWindowResize = () => {
    if (!this.camera || !this.renderer || !this.container) return;
    
    // Check if container has valid dimensions
    if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
      return;
    }

    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);

    if (this.composer) {
      this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
  };

  ngOnDestroy() {
    if (this.isBrowser) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }

      // Clean up Three.js resources
      if (this.scene) {
        this.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      }
      
      if (this.composer) {
        this.composer.dispose();
      }
      
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      }
    }
  }
}
