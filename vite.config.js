import restart from 'vite-plugin-restart'

export default {
    root: 'src/', // Source files 
    publicDir: '../static/', // Path from "root" to static assets 
    base: './', // Required for GitHub Pages to use relative paths
    server: {
        host: true, // Open to local network and display URL
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env) // Open if not in CodeSandbox
    },
    build: {
        outDir: '../docs', // Output into docs/ for GitHub Pages
        emptyOutDir: true, // Empty the folder first
        sourcemap: true // Add sourcemap
    },
    plugins: [
        restart({ restart: [ '../static/**' ] }) // Restart server on static file change
    ]
}