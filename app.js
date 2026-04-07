/**
 * Interactive Solar System Simulator
 * A fully interactive, physics-based solar system visualization
 * using HTML5 Canvas and vanilla JavaScript
 */

// ============================================================================
// CELESTIAL BODY CLASS
// ============================================================================

class CelestialBody {
    constructor(name, x, y, size, color, speed, type, data = {}) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.speed = speed;
        this.type = type; // 'star', 'planet', 'moon'
        
        // Orbital data
        this.orbitDistance = data.distance || 0;
        this.orbitalSpeed = data.orbitalSpeed || 0;
        this.mass = data.mass || 0;
        this.diameter = data.diameter || 0;
        this.period = data.period || 0;
        
        // Orbital mechanics
        this.angle = Math.random() * Math.PI * 2;
        this.centerX = 0;
        this.centerY = 0;
        
        // Trail visualization
        this.trail = [];
        this.maxTrailLength = 200;
        
        // Glow effect
        this.glowRadius = this.size * 1.5;
    }

    // Update position based on orbital mechanics
    update(speedMultiplier = 1) {
        if (this.type === 'planet') {
            this.angle += this.speed * speedMultiplier;
            this.x = this.centerX + Math.cos(this.angle) * this.orbitDistance;
            this.y = this.centerY + Math.sin(this.angle) * this.orbitDistance;
            
            // Add to trail
            if (this.trail.length === 0 || 
                Math.hypot(this.x - this.trail[this.trail.length - 1].x, 
                          this.y - this.trail[this.trail.length - 1].y) > 2) {
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > this.maxTrailLength) {
                    this.trail.shift();
                }
            }
        }
    }

    // Draw the body on canvas
    draw(ctx, showGlow = true) {
        // Draw glow effect for sun
        if (this.type === 'star' && showGlow) {
            ctx.fillStyle = `rgba(${this.color}, 0.1)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.glowRadius * 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = `rgba(${this.color}, 0.15)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.glowRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw planet/body
        ctx.fillStyle = `rgb(${this.color})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow edge
        ctx.strokeStyle = `rgba(${this.color}, 0.5)`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw orbit line
    drawOrbit(ctx, resolution = 120) {
        if (this.type !== 'planet') return;
        
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        
        for (let i = 0; i <= resolution; i++) {
            const angle = (i / resolution) * Math.PI * 2;
            const x = this.centerX + Math.cos(angle) * this.orbitDistance;
            const y = this.centerY + Math.sin(angle) * this.orbitDistance;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // Draw label text
    drawLabel(ctx, offsetX = 0, offsetY = 0) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.font = '11px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.name, this.x, this.y + this.size + 5);
    }

    // Draw trail
    drawTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.strokeStyle = `rgba(${this.color}, 0.3)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        
        for (let i = 1; i < this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.stroke();
    }

    // Check if point is inside this body (for clicking)
    contains(x, y) {
        return Math.hypot(x - this.x, y - this.y) <= this.size * 3;
    }

    // Clear trail
    clearTrail() {
        this.trail = [];
    }
}

// ============================================================================
// SOLAR SYSTEM CLASS
// ============================================================================

class SolarSystem {
    constructor() {
        this.bodies = [];
        this.selectedBody = null;
        this.initializeBodies();
    }

    initializeBodies() {
        // Sun (center)
        this.sun = new CelestialBody(
            'Sun',
            0, 0,
            25,
            '255, 200, 0',
            0,
            'star',
            { distance: 0, diameter: 1391000 }
        );
        this.bodies.push(this.sun);

        // Planet data: [name, orbitDistance (px), size, color, speed (radians/frame), data]
        const planets = [
            ['Mercury', 80, 4, '169, 169, 169', 0.04, { distance: 57.9, diameter: 3879, speed: 47.87, period: 88 }],
            ['Venus', 130, 7, '255, 200, 100', 0.015, { distance: 108.2, diameter: 12104, speed: 35.02, period: 225 }],
            ['Earth', 180, 7, '100, 150, 255', 0.01, { distance: 149.6, diameter: 12742, speed: 29.78, period: 365 }],
            ['Mars', 230, 5, '255, 100, 50', 0.008, { distance: 227.9, diameter: 6779, speed: 24.07, period: 687 }],
            ['Jupiter', 310, 16, '200, 150, 100', 0.002, { distance: 778.5, diameter: 139820, speed: 13.07, period: 4333 }],
            ['Saturn', 390, 14, '210, 180, 100', 0.0009, { distance: 1434, diameter: 116460, speed: 9.69, period: 10759 }],
            ['Uranus', 450, 10, '100, 200, 255', 0.0004, { distance: 2871, diameter: 50724, speed: 6.81, period: 30687 }],
            ['Neptune', 510, 10, '50, 100, 255', 0.0001, { distance: 4495, diameter: 49244, speed: 5.43, period: 60190 }]
        ];

        planets.forEach(([name, distance, size, color, speed, data]) => {
            const planet = new CelestialBody(
                name,
                this.sun.x + distance,
                this.sun.y,
                size,
                color,
                speed,
                'planet',
                { ...data, distance: distance }
            );
            planet.centerX = this.sun.x;
            planet.centerY = this.sun.y;
            this.bodies.push(planet);
        });
    }

    update(speedMultiplier = 1) {
        this.bodies.forEach(body => body.update(speedMultiplier));
    }

    draw(ctx, options = {}) {
        const { showOrbits = true, showLabels = true, showTrails = false, showGlow = true } = options;

        // Draw orbits
        if (showOrbits) {
            this.bodies.forEach(body => body.drawOrbit(ctx));
        }

        // Draw trails
        if (showTrails) {
            this.bodies.forEach(body => body.drawTrail(ctx));
        }

        // Draw bodies
        this.bodies.forEach(body => body.draw(ctx, showGlow));

        // Draw labels
        if (showLabels) {
            this.bodies.forEach(body => body.drawLabel(ctx));
        }

        // Highlight selected body
        if (this.selectedBody) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.selectedBody.x, this.selectedBody.y, this.selectedBody.size + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    selectBodyAt(x, y) {
        for (const body of this.bodies) {
            if (body.type !== 'star' && body.contains(x, y)) {
                this.selectedBody = body;
                return body;
            }
        }
        this.selectedBody = null;
        return null;
    }

    getBodyByName(name) {
        return this.bodies.find(b => b.name === name);
    }

    getPlanets() {
        return this.bodies.filter(b => b.type === 'planet');
    }
}

// ============================================================================
// RENDERER CLASS
// ============================================================================

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawStars() {
        const starCount = 500;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        
        // Use deterministic star positions based on screen position
        for (let i = 0; i < starCount; i++) {
            const seed = i + Math.floor(this.cameraX / 1000) + Math.floor(this.cameraY / 1000);
            const x = ((seed * 73856093) ^ this.cameraX) % this.width;
            const y = ((seed * 19349663) ^ this.cameraY) % this.height;
            const size = Math.sin(seed * 0.1) * 0.5 + 0.5;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.cameraX) * this.zoom + this.width / 2;
        const screenY = (worldY - this.cameraY) * this.zoom + this.height / 2;
        return [screenX, screenY];
    }

    screenToWorld(screenX, screenY) {
        const worldX = (screenX - this.width / 2) / this.zoom + this.cameraX;
        const worldY = (screenY - this.height / 2) / this.zoom + this.cameraY;
        return [worldX, worldY];
    }

    render(solarSystem, options = {}) {
        this.clear();
        this.drawStars();

        // Save context state
        this.ctx.save();

        // Apply camera transform
        this.ctx.translate(this.width / 2, this.height / 2);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // Draw solar system
        solarSystem.draw(this.ctx, options);

        // Restore context state
        this.ctx.restore();
    }

    panCamera(dx, dy) {
        this.cameraX -= dx / this.zoom;
        this.cameraY -= dy / this.zoom;
    }

    zoomIn(factor = 1.1, screenX = this.width / 2, screenY = this.height / 2) {
        const [worldX, worldY] = this.screenToWorld(screenX, screenY);
        this.zoom *= factor;
        this.zoom = Math.max(0.1, Math.min(this.zoom, 10));
        const [newScreenX, newScreenY] = this.worldToScreen(worldX, worldY);
        this.cameraX += (newScreenX - screenX) / this.zoom;
        this.cameraY += (newScreenY - screenY) / this.zoom;
    }

    focusOnBody(body) {
        this.cameraX = body.x;
        this.cameraY = body.y;
    }

    reset() {
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;
    }
}

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

class SimulationEngine {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.renderer = new Renderer(this.canvas);
        this.solarSystem = new SolarSystem();
        
        this.isRunning = false;
        this.speedMultiplier = 1;
        
        this.lastTime = Date.now();
        this.deltaTime = 0;
        
        this.settings = this.loadSettings();
        this.applySettings();
        
        this.setupEventListeners();
        this.animate();
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('pausePlayBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        // Sliders
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.speedMultiplier = parseFloat(e.target.value);
            document.getElementById('speedDisplay').textContent = this.speedMultiplier.toFixed(1) + 'x';
            this.settings.speed = this.speedMultiplier;
            this.saveSettings();
        });

        document.getElementById('zoomSlider').addEventListener('input', (e) => {
            const zoom = parseFloat(e.target.value);
            this.renderer.zoom = zoom;
            document.getElementById('zoomDisplay').textContent = zoom.toFixed(1) + 'x';
            this.settings.zoom = zoom;
            this.saveSettings();
        });

        // Checkboxes
        document.getElementById('showOrbits').addEventListener('change', (e) => {
            this.settings.showOrbits = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('showLabels').addEventListener('change', (e) => {
            this.settings.showLabels = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('showTrails').addEventListener('change', (e) => {
            this.settings.showTrails = e.target.checked;
            this.saveSettings();
        });

        // Follow mode
        document.getElementById('followselect').addEventListener('change', (e) => {
            if (e.target.value) {
                const body = this.solarSystem.getBodyByName(e.target.value);
                this.settings.followPlanet = e.target.value;
                if (body) {
                    this.renderer.focusOnBody(body);
                }
            } else {
                this.settings.followPlanet = '';
            }
            this.saveSettings();
        });

        // Canvas events
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());

        // Panel toggle
        document.getElementById('togglePanel').addEventListener('click', () => {
            const content = document.querySelector('.mission-control .panel-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('toggleBodies').addEventListener('click', () => {
            const content = document.querySelector('.celestial-bodies .bodies-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });

        // Info panel close
        document.querySelector('.close-btn').addEventListener('click', () => {
            document.getElementById('infoPanel').classList.add('hidden');
        });

        // Body list click events
        this.updateBodyList();
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const [worldX, worldY] = this.renderer.screenToWorld(
            e.clientX - rect.left,
            e.clientY - rect.top
        );

        const body = this.solarSystem.selectBodyAt(worldX, worldY);
        if (body) {
            this.showInfoPanel(body);
            this.highlightBodyInList(body.name);
        } else {
            document.getElementById('infoPanel').classList.add('hidden');
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        const rect = this.canvas.getBoundingClientRect();
        this.renderer.zoomIn(factor, e.clientX - rect.left, e.clientY - rect.top);
        
        // Update zoom slider
        document.getElementById('zoomSlider').value = this.renderer.zoom.toFixed(1);
        document.getElementById('zoomDisplay').textContent = this.renderer.zoom.toFixed(1) + 'x';
    }

    handleMouseDown(e) {
        if (e.button === 1) { // Middle mouse button
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
        }
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;
            this.renderer.panCamera(dx, dy);
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
        }
    }

    handleMouseUp() {
        this.isPanning = false;
    }

    togglePause() {
        this.isRunning = !this.isRunning;
        document.getElementById('pausePlayBtn').textContent = this.isRunning ? 'PAUSE' : 'PLAY';
    }

    reset() {
        this.renderer.reset();
        this.solarSystem.selectedBody = null;
        document.getElementById('zoomSlider').value = 1;
        document.getElementById('zoomDisplay').textContent = '1.0x';
        document.getElementById('infoPanel').classList.add('hidden');
    }

    showInfoPanel(body) {
        const panel = document.getElementById('infoPanel');
        document.getElementById('infoName').textContent = body.name;
        document.getElementById('infoDist').textContent = body.data?.distance?.toFixed(1) + ' million km' || 'N/A';
        document.getElementById('infoSpeed').textContent = body.data?.speed?.toFixed(2) + ' km/s' || 'N/A';
        document.getElementById('infoSize').textContent = (body.diameter || 0).toLocaleString() + ' km';
        document.getElementById('infoPeriod').textContent = (body.period || 0).toFixed(0) + ' days';
        document.getElementById('infoMass').textContent = (body.mass || 1).toFixed(2);
        
        panel.classList.remove('hidden');
    }

    highlightBodyInList(bodyName) {
        document.querySelectorAll('.body-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.name === bodyName) {
                item.classList.add('active');
            }
        });
    }

    updateBodyList() {
        const listContainer = document.getElementById('bodyList');
        listContainer.innerHTML = '';

        const planets = this.solarSystem.getPlanets();
        planets.forEach(planet => {
            const item = document.createElement('div');
            item.className = 'body-item';
            item.dataset.name = planet.name;
            item.innerHTML = `
                <div class="body-name">${planet.name}</div>
                <div class="body-info">
                    Distance: ${planet.orbitDistance.toFixed(0)}px
                </div>
            `;
            item.addEventListener('click', () => {
                this.solarSystem.selectBodyAt(planet.x, planet.y);
                this.showInfoPanel(planet);
                this.highlightBodyInList(planet.name);
                this.renderer.focusOnBody(planet);
            });
            listContainer.appendChild(item);
        });
    }

    animate() {
        const currentTime = Date.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update simulation
        if (this.isRunning) {
            this.solarSystem.update(this.speedMultiplier);
        }

        // Update follow mode
        const followSelect = document.getElementById('followselect').value;
        if (followSelect) {
            const body = this.solarSystem.getBodyByName(followSelect);
            if (body) {
                this.renderer.focusOnBody(body);
            }
        }

        // Get render settings
        const options = {
            showOrbits: document.getElementById('showOrbits').checked,
            showLabels: document.getElementById('showLabels').checked,
            showTrails: document.getElementById('showTrails').checked,
            showGlow: true
        };

        // Render
        this.renderer.render(this.solarSystem, options);

        requestAnimationFrame(() => this.animate());
    }

    loadSettings() {
        const saved = localStorage.getItem('solarSystemSettings');
        return saved ? JSON.parse(saved) : {
            speed: 1,
            zoom: 1,
            showOrbits: true,
            showLabels: true,
            showTrails: false,
            followPlanet: ''
        };
    }

    saveSettings() {
        localStorage.setItem('solarSystemSettings', JSON.stringify(this.settings));
    }

    applySettings() {
        document.getElementById('speedSlider').value = this.settings.speed;
        document.getElementById('speedDisplay').textContent = this.settings.speed.toFixed(1) + 'x';
        this.speedMultiplier = this.settings.speed;

        document.getElementById('zoomSlider').value = this.settings.zoom;
        document.getElementById('zoomDisplay').textContent = this.settings.zoom.toFixed(1) + 'x';
        this.renderer.zoom = this.settings.zoom;

        document.getElementById('showOrbits').checked = this.settings.showOrbits;
        document.getElementById('showLabels').checked = this.settings.showLabels;
        document.getElementById('showTrails').checked = this.settings.showTrails;
        document.getElementById('followselect').value = this.settings.followPlanet;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Start the simulation when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const engine = new SimulationEngine();
    
    // Pause initially for user to understand controls
    engine.togglePause();
});
