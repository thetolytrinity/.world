import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

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

loader.load (`models/Runaway.glb`, (gltf) =>
{

    tumpz = gltf.scene
    tumpz.scale.set (.3, .3, .3 ) //HAVE TO SCALE PLACEHOLDER MODEL FOR NOW
    tumpz.position.set(0, 0, 0)

    scene.add(tumpz)
})

/**
 * Lights
 */

// Ambient light
const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 1.5)
directionalLight.position.set(3, 2, -8)
scene.add(directionalLight)

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
    renderer.setPixelRatio(1) // keep pixels crisp
    renderer.setSize(
        sizes.width / debugObject.pixelDensity,
        sizes.height / debugObject.pixelDensity,
        false
    )
}

// Initial sizing based on current pixel density
updatePixelation()

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