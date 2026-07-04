import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLayer } from '../shared/layer-factory.js';

/**
 * WYSIWYG preview: a plain Three.js scene where a trigger-textured plane
 * stands in for the tracked anchor. Layers are built by the same factory as
 * the AR viewer, so what you place here is exactly what tracks on the wall.
 */
export class Preview {
  constructor(container, scene, baseUrl) {
    this.container = container;
    this.sceneDef = scene;
    this.baseUrl = baseUrl;

    this.three = new THREE.Scene();
    this.three.background = new THREE.Color(0x1a1d23);
    this.three.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(1, 2, 3);
    this.three.add(dir);

    const aspectT = (scene.trigger.width || 3) / (scene.trigger.height || 4);
    const triggerPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1 / aspectT),
      new THREE.MeshBasicMaterial({ color: 0x2a2f38 })
    );
    triggerPlane.name = 'trigger';
    if (scene.trigger.image) {
      new THREE.TextureLoader().load(new URL(scene.trigger.image, baseUrl).href, (tx) => {
        tx.colorSpace = THREE.SRGBColorSpace;
        triggerPlane.material.map = tx;
        triggerPlane.material.color.set(0xffffff);
        triggerPlane.material.needsUpdate = true;
      });
    }
    this.three.add(triggerPlane);

    const grid = new THREE.GridHelper(4, 40, 0x33404f, 0x232833);
    grid.rotation.x = Math.PI / 2; // into the trigger plane's space (z = depth)
    grid.position.z = -0.001;
    this.three.add(grid);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    this.camera.position.set(0, 0, 1.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;

    this.anchorGroup = new THREE.Group(); // same role as MindAR's anchor.group
    this.three.add(this.anchorGroup);
    this.handles = [];

    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);

    this.clock = new THREE.Clock();
    this.tick = null; // set by main to run the shared Timeline during preview
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.tick?.(dt);
      this.orbit.update();
      this.renderer.render(this.three, this.camera);
    });
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /** (Re)build all layer objects from the scene definition. */
  rebuild() {
    for (const h of this.handles) {
      if (h.object3d) this.anchorGroup.remove(h.object3d);
      h.dispose();
    }
    this.handles = this.sceneDef.layers.map((l) => createLayer(l, this.baseUrl));
    for (const h of this.handles) {
      if (h.object3d) {
        h.object3d.userData.layerId = h.def.id;
        this.anchorGroup.add(h.object3d);
      }
      h.setOpacity(1); // editor shows everything; Preview-play runs the real timeline
    }
    return this.handles;
  }

  objectForLayer(id) {
    return this.handles.find((h) => h.def.id === id)?.object3d ?? null;
  }
}
