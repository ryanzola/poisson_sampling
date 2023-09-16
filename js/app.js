import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

import vertexParticles from './shader/particles/vertex.glsl';
import fragmentParticles from './shader/particles/fragment.glsl';

import vertexTube from './shader/tube/vertex.glsl';
import fragmentTube from './shader/tube/fragment.glsl';

import vertexCaustics from './shader/caustics/vertex.glsl';
import fragmentCaustics from './shader/caustics/fragment.glsl';

import sphere from '../img/sphere-normal.jpg';
import dots from '../img/dots.png';
import stripes from '../img/stripes.png';
import noise from '../img/noise.png';

const { sin, cos, PI } = Math;

// https://en.wikipedia.org/wiki/Trefoil_knot

export default class Sketch {
  constructor(options) {
    this.container = options.dom;
    this.scene = new THREE.Scene();

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x05233c, 1);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 1000);
    this.camera.position.z = 4;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.time = 0;
    this.mouse = new THREE.Vector2();

    // this.setupSettings();
    this.setupResize();
    this.resize();
    this.mouseEvents();
    this.addObjects();
    this.render()
  }

  setupSettings() {
    this.settings = {
      progress: 0,
    }

    this.gui = new GUI();
    this.gui.add(this.settings, 'progress', 0, 1, 0.01).onChange((val) => {
      this.material.uniforms.progress.value = val;

      this.material.needsUpdate = true;
    });
  }

  setupResize() {
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  mouseEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / this.width) * 2 - 1;
      this.mouse.y = -(e.clientY / this.height) * 2 + 1;
    });
  }

  addObjects() {
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        progress: { value: 0 },
        mouse: { value: new THREE.Vector2() },
        time: { value: 0 },
        uNormals: { value: new THREE.TextureLoader().load(sphere) }
      },
      vertexShader: vertexParticles,
      fragmentShader: fragmentParticles,
      depthTest: false,
      transparent: true,
    })

    let number = 10000

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(number * 3);
    this.randoms = new Float32Array(number * 3);
    this.sizes = new Float32Array(number * 1);

    for (let i = 0; i < number * 3; i++) {
      this.positions[i * 3 + 0] = (Math.random() - 0.5);
      this.positions[i * 3 + 1] = (Math.random() - 0.5);
      this.positions[i * 3 + 2] = (Math.random() - 0.5);

      this.randoms[i * 3 + 0] = Math.random();
      this.randoms[i * 3 + 1] = Math.random();
      this.randoms[i * 3 + 2] = Math.random();

      this.sizes[i + 0] = 0.5 + 0.5 * Math.random();

      this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
      this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(this.randoms, 3));
      this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    }

    this.mesh = new THREE.Points(this.geometry, this.material);

    this.scene.add(this.mesh);

    let points = []

    for(let i = 0; i < 100; i++) {
      let angle = 2 * PI * i / 100;

      let x = sin(angle) + 2.0 * sin(2.0 * angle);
      let y = cos(angle) - 2.0 * cos(2.0 * angle);
      let z = - sin(3.0 * angle);

      points.push(new THREE.Vector3(x, y, z));
    }

    let dotsTexture = new THREE.TextureLoader().load(dots);
    let stripesTexture = new THREE.TextureLoader().load(stripes);

    dotsTexture.wrapS = dotsTexture.wrapT = THREE.RepeatWrapping;
    stripesTexture.wrapS = stripesTexture.wrapT = THREE.RepeatWrapping;

    let curve = new THREE.CatmullRomCurve3(points);
    this.tubeGeo = new THREE.TubeGeometry(curve, 100, 0.4, 100, true);
    this.tubeMaterial = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      uniforms: {
        progress: { value: 0 },
        mouse: { value: new THREE.Vector2() },
        time: { value: 0 },
        uDots: { value: dotsTexture },
        uStripes: { value: stripesTexture }
      },
      vertexShader: vertexTube,
      fragmentShader: fragmentTube,
      transparent: true,
    })

    this.tube = new THREE.Mesh(this.tubeGeo, this.tubeMaterial);
    this.scene.add(this.tube);

    let noiseTexture = new THREE.TextureLoader().load(noise);
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

    let geo = new THREE.PlaneGeometry(20, 10)
    this.cau = new THREE.ShaderMaterial({
      side: THREE.FrontSide,
      uniforms: {
        progress: { value: 0 },
        mouse: { value: new THREE.Vector2() },
        time: { value: 0 },
        uDots: { value: dotsTexture },
        uStripes: { value: stripesTexture },
        uTexture: { value: noiseTexture }
      },
      vertexShader: vertexCaustics,
      fragmentShader: fragmentCaustics,
      transparent: true,
    })

    this.quad = new THREE.Mesh(geo, this.cau);
    this.quad.position.z = -2;

    this.scene.add(this.quad);

  }

  render() {
    this.time += 0.05;

    this.material.uniforms.mouse.value = this.mouse;
    this.material.uniforms.time.value = this.time * 0.5;

    this.tubeMaterial.uniforms.time.value = this.time * 0.5;

    this.cau.uniforms.time.value = this.time * 0.5;

    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.render.bind(this));
  }
}

new Sketch({ dom: document.getElementById('container') });