// The 3D view of one build. three.js is loaded only when a viewer is created.
import { sceneOf } from './pieces.js';
import { palette, roleHex } from './flat.js';

// The library is z-up and left-handed (x down-right, y down-left on screen); three.js is y-up and
// right-handed. Swapping y and z converts between them. A rotation would mirror every build.
export const toThree = ([x, y, z]) => [x, z, y];

// Where a solid's profile axes (u, v) and its push direction (t) point in three.js space.
export function solidBasis(axis) {
  const lib = axis === 'x' ? [[0, 1, 0], [0, 0, 1], [1, 0, 0]] : axis === 'y' ? [[1, 0, 0], [0, 0, 1], [0, 1, 0]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return lib.map(toThree);
}

export async function createViewer(canvas, build, colors) {
  const THREE = await import('three');
  const { OrbitControls } = await import('../vendor/three/OrbitControls.js');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fffbf4');   // Paper, the colour of the picture frame
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9cbb5', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(-0.4, 1, 0.7);
  scene.add(sun);

  const pal = palette(colors), wash = new THREE.Color('#fffbf4');
  const meshes = [];   // { piece, mesh, edges, color }
  for (const solid of sceneOf(build)) {
    const shape = new THREE.Shape(solid.profile.map(([u, v]) => new THREE.Vector2(u, v)));
    if (solid.hole) shape.holes.push(new THREE.Path(solid.hole.map(([u, v]) => new THREE.Vector2(u, v))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: solid.len, bevelEnabled: false, curveSegments: 1 });
    const [X, Y, Z] = solidBasis(solid.axis).map(v => new THREE.Vector3(...v));
    const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(...toThree(solid.o));
    geo.applyMatrix4(m);
    if (m.determinant() < 0) {   // the swap mirrors the shape, so turn its triangles back to face outward
      const pos = geo.attributes.position.array;
      for (let i = 0; i < pos.length; i += 9) for (let k = 0; k < 3; k++) { const t = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = t; }
    }
    geo.computeVertexNormals();
    const color = new THREE.Color(roleHex(pal, solid.role));
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: color.clone() }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.45) }));
    scene.add(mesh, edges);
    meshes.push({ piece: solid.piece, mesh, edges, color });
  }

  const box = new THREE.Box3();
  meshes.forEach(({ mesh }) => box.expandByObject(mesh));
  const center = box.getCenter(new THREE.Vector3()), radius = box.getSize(new THREE.Vector3()).length() / 2;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.6, 48), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(center.x, -0.1, center.z);
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(32, 1, 1, radius * 20);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(16)) * 0.98;
  // the same corner the flat drawings are seen from
  camera.position.copy(center).add(new THREE.Vector3(1, 0.82, 1).normalize().multiplyScalar(distance));
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.enablePan = false;
  controls.minDistance = radius * 1.2;
  controls.maxDistance = distance * 2;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;   // stay above the floor
  controls.update();

  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // on a tall screen, widen the view so the build still fits side to side
    camera.fov = camera.aspect >= 1 ? 32 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(16)) / camera.aspect));
    camera.updateProjectionMatrix();
    render();
  };
  controls.addEventListener('change', render);
  const watcher = new ResizeObserver(resize);
  watcher.observe(canvas);
  resize();

  return {
    // n = 0 shows the whole build; otherwise pieces 1..n, with earlier ones faded and piece n at full colour
    showThrough(n) {
      for (const { piece, mesh, edges, color } of meshes) {
        const visible = n === 0 || piece < n;
        mesh.visible = edges.visible = visible;
        mesh.material.color.copy(color);
        if (n !== 0 && piece >= 0 && piece < n - 1) mesh.material.color.lerp(wash, 0.6);
      }
      render();
    },
    // let go of the canvas and the graphics memory when the visitor goes back to the picture
    dispose() {
      watcher.disconnect();
      controls.dispose();
      for (const { mesh, edges } of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); edges.geometry.dispose(); edges.material.dispose(); }
      renderer.dispose();
    },
  };
}
