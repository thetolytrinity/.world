import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

/*** Base */

// Debug
const gui = new GUI({
    width: 200,
    title: 'admin',
})
gui.hide ()

// Debug object for GUI controls
const debugObject = {
    wireframe:false,
    pixelDensity: 1.45,
    color: 0x020201, // SPOTLIGHT COLOR

}

// keydown event to hide/show admin
let guiVisible = false // TRACKING STATE

window.addEventListener('keydown', (event) => {
    if (event.key === 'h') {
        guiVisible = !guiVisible // FLIPPING STATE
        if (guiVisible) {
            gui.show()
        } else {
            gui.hide()
        }
    }
})
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#e3efff')

/*** AVATAR - TUMPZ */

// MODEL 
let tumpz = null;
let tumpzMixer = null;
const loader = new GLTFLoader();

loader.load (`models/tumpz_.glb`, (gltf) =>
{
    tumpz = gltf.scene
    tumpz.scale.set (.7, .7, .7 ) //HAVE TO SCALE PLACEHOLDER MODEL FOR NOW

    scene.add(tumpz)
    
  const headNode = tumpz.getObjectByName('Head') || tumpz.getObjectByName('head') || tumpz;
  headNode.add(presenceOrb);
  presenceOrb.position.set(0.25, 0.2, 0.0); // tweak offset as needed
    
  // --- Animation setup ---
  if (gltf.animations && gltf.animations.length) {
    tumpzMixer = new THREE.AnimationMixer(tumpz);
    const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle');
    if (idleClip) {
      const action = tumpzMixer.clipAction(idleClip);
      action.play();
    } else {
      console.warn('No idle animation found in GLB');
    }
  }
});

// ONLINE PRESENCE TETHER

const presenceMat = new THREE.MeshBasicMaterial ({ color : 0x444444 });
const presenceOrb = new THREE.Mesh(
    new THREE.SphereGeometry (0.03, 16, 16),
    presenceMat
);

// --- Presence API endpoints ---
const PRESENCE_BASE = import.meta.env.DEV
  ? '/presence' // use Vite proxy in dev
  : 'https://tumpz-presence.thetolytrinity.workers.dev'; // real Worker in prod

const PRESENCE_URL_STATUS = `${PRESENCE_BASE}/api/status`;
const PRESENCE_URL_PING   = `${PRESENCE_BASE}/api/ping`;

// --- Presence tiers (now/recent/gone)
const COLOR_NOW    = 0x00ff66; // green
const COLOR_RECENT = 0xffcc00; // yellow
const COLOR_STALE  = 0x444444; // grey
const FRESH_MS  = 5  * 60 * 1000;  // "online now" window (5 min)
const RECENT_MS = 30 * 60 * 1000;  // "active recently" (30 min)

// --- Presence logic ---
function setPresenceFromLastSeen(lastSeen) {
  const t = Date.parse(lastSeen || 0);
  if (isNaN(t)) { presenceMat.color.set(COLOR_STALE); return; }
  const age = Date.now() - t;
  if (age <= FRESH_MS)       presenceMat.color.set(COLOR_NOW);
  else if (age <= RECENT_MS) presenceMat.color.set(COLOR_RECENT);
  else                       presenceMat.color.set(COLOR_STALE);
}

async function refreshPresence() {
  try {
    const r = await fetch(PRESENCE_URL_STATUS, { cache: 'no-store' });
    if (!r.ok) throw new Error('status ' + r.status);
    const data = await r.json();
    console.log('[presence] status payload:', data);

    if (typeof data.online === 'boolean' && data.lastSeen) {
      // If the Worker eventually sends both, prefer lastSeen tiering
      setPresenceFromLastSeen(data.lastSeen);
    } else if (data.lastSeen) {
      setPresenceFromLastSeen(data.lastSeen);
    } else if (typeof data.online === 'boolean') {
      presenceMat.color.set(data.online ? COLOR_NOW : COLOR_STALE);
    } else {
      presenceMat.color.set(COLOR_STALE);
    }

    const deltaMin = data.lastSeen ? ((Date.now() - Date.parse(data.lastSeen)) / 60000).toFixed(1) : 'n/a';
    console.log('[presence] lastSeen Δmin =', deltaMin);
  } catch (e) {
    console.warn('[presence] using offline fallback:', e?.message || e);
    presenceMat.color.set(COLOR_STALE);
  }
}

// run once and then poll
refreshPresence();
setInterval(refreshPresence, 15000);

const presenceFolder = gui.addFolder('Presence');
presenceFolder.add(presenceOrb, 'visible').name('Show orb');

// Dev-only manual ping so main site stays read-only in production
if (import.meta.env.DEV) {
    presenceFolder.add({ ping: () => {
      fetch(PRESENCE_URL_PING, { method: 'POST' })
        .then(() => { console.log('[presence] dev pinged'); refreshPresence(); })
        .catch((e) => console.error('[presence] ping failed', e));
    }}, 'ping').name('Dev ping');
}

/*** LIGHTS */
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
scene.add(hemi);

// Ambient light
const ambient = new THREE.AmbientLight(0x404040, 0.5);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 5);
dir.castShadow = false;
scene.add(ambient, dir);


// Spot Light
const spotLight = new THREE.SpotLight(debugObject.color, 4.5, 10, Math.PI * 0.1, 0.25, 1)
spotLight.position.set(0, 2, 3)
spotLight.target.position.x = - 0.75
scene.add (spotLight)
scene.add (spotLight.target)

spotLight.color.set(debugObject.color)

const spotLightHelper = new THREE.SpotLightHelper(spotLight)
spotLightHelper.visible = false
scene.add(spotLightHelper)

//GUI for LIGHTING

const spotFolder = gui.addFolder ('SpotLight')
const parameters = {
    angle: THREE.MathUtils.radToDeg(spotLight.angle) // convert current angle to degrees
}

spotFolder.addColor(debugObject, 'color').name('Spot Color').onChange((v) => {
    spotLight.color.set(v)
    spotLightHelper.update()
})
spotFolder.add (spotLight, 'intensity') .min(0) .max(25) .step(0.001)
spotFolder.add (spotLight, 'distance') .min(1) .max(10) .step(0.001)
spotFolder.add(parameters, 'angle').min(1).max(90).step(1).name('Spot Angle (deg)').onChange(() => {
    spotLight.angle = THREE.MathUtils.degToRad(parameters.angle)
    spotLightHelper.update()
})
spotFolder.add (spotLight, 'penumbra') .min(0) .max(1) .step(0.001)
spotFolder.add (spotLight, 'decay') .min(0) .max(1) .step(0.001)
spotFolder.add (spotLightHelper, 'visible') 

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const visuals = gui.addFolder('renderer')
visuals.add(debugObject, 'pixelDensity')
    .min(1)
    .max(8)
    .step(0.1)
    .name('pixelation')
    .onChange(updatePixelation)

//AUTO RESIZING FUNCTION
window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer with current pixel density
    updatePixelation()
})

/**
 * Camera
 */

// Base camera
const camera = new THREE.PerspectiveCamera(55, sizes.width / sizes.height, 0.1, 100)
//camera.position.x = 4
camera.position.y = 0.75
camera.position.z = 3
scene.add(camera)


// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// --- Default view snapshot (captured on load) ---
const defaultView = { pos: new THREE.Vector3(), target: new THREE.Vector3() }
defaultView.pos.copy(camera.position)
defaultView.target.copy(controls.target)

//Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false
})
renderer.setPixelRatio(1) // HD SMOOTHING OFF
renderer.domElement.style.imageRendering = 'pixelated'
renderer.domElement.style.width = '100%'
renderer.domElement.style.height = '100%'

function updatePixelation() {
    if (!renderer) return
    // Low resolution render > upscale via CSS
    renderer.setPixelRatio(1) // crisp pixel output
    renderer.setSize(
        sizes.width / debugObject.pixelDensity,
        sizes.height / debugObject.pixelDensity,
        false
    )
}

// Initial sizing based on current pixel density
updatePixelation()

function frameFront(object, opts = {}) {
  if (!object) return;

  const targetYOffset = opts.targetYOffset ?? debugObject.frameYOffset ?? 0;
  const keepViewDir = opts.keepViewDir ?? true; // default: preserve current angle

  // Ensure world transforms up to date
  object.updateWorldMatrix(true, true);

  // Bounds
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 2;

  // Fit distance with padding
  const fov = camera.fov * Math.PI / 180;
  let distance = (maxDim * 1.15) / (2 * Math.tan(fov / 2));
  distance = THREE.MathUtils.clamp(distance, controls.minDistance || 0, controls.maxDistance || distance);

  // Target with Y offset
  const target = center.clone();
  target.y += targetYOffset;

  // Keep current viewing direction (don’t snap to head-on)
  let newPos;
  if (keepViewDir) {
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    if (!isFinite(dir.lengthSq()) || dir.lengthSq() === 0) dir.set(0, 0, 1);
    newPos = target.clone().addScaledVector(dir, distance);
  } else {
    newPos = new THREE.Vector3(target.x, target.y, target.z + distance);
  }

  // Apply
  controls.target.copy(target);
  camera.position.copy(newPos);
  camera.lookAt(target);
  controls.update();
}

/** MOUSE CLICK FUNCTION */

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2() // 'Normalised Device Coordinates'

function toNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 +1

}

// --- Prevent single-click firing on double-click ---
let singleClickTimer = null
const CLICK_DELAY = 250

renderer.domElement.addEventListener('pointerup', (event) => {
    if (!tumpz || isFocused) return
    if (singleClickTimer) clearTimeout(singleClickTimer)
    const e = { clientX: event.clientX, clientY: event.clientY }
    singleClickTimer = setTimeout(() => {
        toNDC({ clientX: e.clientX, clientY: e.clientY })
        raycaster.setFromCamera(ndc, camera)
        const hits = raycaster.intersectObject(tumpz, true)
        if (hits.length) {
            toggleFocus()
        }
        singleClickTimer = null
    }, CLICK_DELAY)
})

//  --- Double click focused model to restore default view
renderer.domElement.addEventListener('dblclick', (event) => {
    if (singleClickTimer) { clearTimeout(singleClickTimer); singleClickTimer = null }
    if (!isFocused || !tumpz) return
    toNDC(event)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObject(tumpz, true)
    if (hits.length) {
        restoreDefaultView()
        isFocused = false
    }
})

// --- Toggle Focus Helper
let isFocused = false
const savedView = { pos: new THREE.Vector3(), target: new THREE.Vector3() }

function saveView() {
    savedView.pos.copy(camera.position)
    savedView.target.copy(controls.target)
}

function restoreDefaultView() {
    controls.target.copy(defaultView.target)
    camera.position.copy(defaultView.pos)
    camera.lookAt(defaultView.target)
    controls.update()
}

function toggleFocus() {
    if (isFocused) return
    saveView()
    frameFront(tumpz)
    isFocused = true
}

// --- HDRI / WORLD LIGHTING ---
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0

const pmrem = new THREE.PMREMGenerator(renderer)

new RGBELoader()
  .load('hdris/overcast_heath.hdr', (hdr) => {
    const envMap = pmrem.fromEquirectangular(hdr).texture
    scene.environment = envMap
    // scene.background = envMap // SHOW HDRI
    hdr.dispose()
    pmrem.dispose()
  })

  // --- Camera GUI ---
const camFolder = gui.addFolder('Camera');

const cam = {
  // live values
  fov: camera.fov,
  x: camera.position.x,
  y: camera.position.y,
  z: camera.position.z,
  tx: controls.target.x,
  ty: controls.target.y,
  tz: controls.target.z,

  // helpers
  apply() {
    camera.position.set(cam.x, cam.y, cam.z);
    controls.target.set(cam.tx, cam.ty, cam.tz);
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
    controls.update();
  },
  reset() {
    controls.target.copy(defaultView.target);
    camera.position.copy(defaultView.pos);
    cam.fov = camera.fov;
    cam.x = camera.position.x; cam.y = camera.position.y; cam.z = camera.position.z;
    cam.tx = controls.target.x; cam.ty = controls.target.y; cam.tz = controls.target.z;
    camera.updateProjectionMatrix();
    controls.update();
    camCtrls.forEach(c => c.updateDisplay());
  },
  frameTumpz() {
    frameFront(tumpz);
    // sync GUI with the new view
    cam.fov = camera.fov;
    cam.x = camera.position.x; cam.y = camera.position.y; cam.z = camera.position.z;
    cam.tx = controls.target.x; cam.ty = controls.target.y; cam.tz = controls.target.z;
    camCtrls.forEach(c => c.updateDisplay());
  },
  copyToConsole() {
    console.log('camera', camera.position);
    console.log('target', controls.target);
    console.log('fov', camera.fov);
  }
};

const camCtrls = [
  camFolder.add(cam, 'fov', 20, 100, 1).name('FOV').onChange(cam.apply),
  camFolder.add(cam, 'x', -10, 10, 0.01).name('pos.x').onChange(cam.apply),
  camFolder.add(cam, 'y', -10, 10, 0.01).name('pos.y').onChange(cam.apply),
  camFolder.add(cam, 'z', -10, 10, 0.01).name('pos.z').onChange(cam.apply),
  camFolder.add(cam, 'tx', -10, 10, 0.01).name('target.x').onChange(cam.apply),
  camFolder.add(cam, 'ty', -10, 10, 0.01).name('target.y').onChange(cam.apply),
  camFolder.add(cam, 'tz', -10, 10, 0.01).name('target.z').onChange(cam.apply),
];

camFolder.add(controls, 'enableDamping').name('damping');
camFolder.add(controls, 'enablePan').name('pan');
camFolder.add(controls, 'minDistance', 0.1, 10, 0.1).name('minDist');
camFolder.add(controls, 'maxDistance', 1, 50, 0.1).name('maxDist');
camFolder.add(cam, 'frameTumpz').name('Frame Tumpz');
camFolder.add(cam, 'reset').name('Reset view');
camFolder.add(cam, 'copyToConsole').name('Copy to console');

/**
 * Animate
 */
const timer = new Timer()

const tick = () =>
{
    // Timer
    timer.update()
    const delta = timer.getDelta(); // seconds

  // Drive the mixer every frame
  if (tumpzMixer) tumpzMixer.update(delta);

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)

    // online presence orb
    const isOnline = presenceMat.color.getHex() === 0x00ff66;
if (isOnline) {
  const s = 1 + 0.08 * Math.sin(performance.now()/250);
  presenceOrb.scale.set(s, s, s);
} else {
  presenceOrb.scale.set(1,1,1);
}
}

tick()


// --- Keyboard shortcuts ---
window.addEventListener('keydown', (event) => {
    // Allow admin toggle (handled above)
    if (event.key === 'h') return

    // Prevent interfering with input fields etc, except allow when canvas is focused
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) {
        // allow when focus is on the WebGL canvas
        if (document.activeElement !== renderer.domElement) return
    }

    // Frame front view (F) — toggle behavior
    if (event.key === 'f' || event.key === 'F') {
        if (isFocused) {
            restoreDefaultView()
            isFocused = false
        } else {
            toggleFocus()
        }
    }
    // ... other key handlers ...

    
})