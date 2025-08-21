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
    pixelDensity: 2,
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
    
})

/*** LIGHTS */
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
scene.add(hemi);

// Ambient light
const ambient = new THREE.AmbientLight(0x404040, 0.5);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 5);
dir.castShadow = false;
scene.add(ambient, dir);


//Spot Light
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
    .step(1)
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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
//camera.position.x = 4
//camera.position.y = 4
camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

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

// --- Frame Front function (robust) ---
function frameFront(object) {
    if (!object) return
    // Ensure world transforms are up-to-date (handles scaled/offset models)
    object.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 2

    // Distance: fit object with small padding
    const fov = camera.fov * Math.PI / 180
    let distance = (maxDim * 1.15) / (2 * Math.tan(fov / 2))
    distance = THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance)

    controls.target.copy(center)
    camera.position.set(center.x, center.y, center.z + distance)
    camera.lookAt(center)
    controls.update()
}

/** MOUSE CLICK FUNCTION */

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2() // 'Normalised Device Coordinates'

function toNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect()
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 +1

}

renderer.domElement.addEventListener ('pointerup', (event) => {
    if (!tumpz) return
    toNDC(event)
    raycaster.setFromCamera (ndc, camera)
    const hits = raycaster.intersectObject (tumpz, true)
    if (hits.length) {
        frameFront(tumpz)
    }
})

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

  

/**
 * Animate
 */
const timer = new Timer()

const tick = () =>
{
    // Timer
    timer.update()
    const elapsedTime = timer.getElapsed()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
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

    // Frame front view (F)
    if (event.key === 'f' || event.key === 'F') {
        frameFront(tumpz)
    }
    // ... other key handlers ...
})