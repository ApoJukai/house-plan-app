const canvas = new fabric.Canvas('main-canvas', { selection: false });

function resizeCanvas() {
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
    canvas.renderAll();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- State ---
let currentMode = 'draw-wall'; 
let isDrawing = false;
let line, dimensionText;
const SNAP_RADIUS = 20;

// --- UI Elements ---
const btnDrawWall = document.getElementById('draw-wall-btn');
const btnSelect = document.getElementById('select-btn');
const btnClear = document.getElementById('clear-btn');
const btnAddDoor = document.getElementById('add-door-btn');
const btnAddWindow = document.getElementById('add-window-btn');
const btnAddOutlet = document.getElementById('add-outlet-btn'); // NEW
const btnAddPipe = document.getElementById('add-pipe-btn');     // NEW

// Layer Checkboxes
const checkLayerArch = document.getElementById('layer-arch');
const checkLayerElec = document.getElementById('layer-elec');
const checkLayerPlumb = document.getElementById('layer-plumb');

// --- Tool Switcher ---
btnDrawWall.addEventListener('click', () => {
    currentMode = 'draw-wall';
    btnDrawWall.classList.add('active-tool');
    btnSelect.classList.remove('active-tool');
    canvas.selection = false;
    canvas.getObjects().forEach(obj => { if (obj.class === 'wall') obj.set('selectable', false); });
});

btnSelect.addEventListener('click', () => {
    currentMode = 'select';
    btnSelect.classList.add('active-tool');
    btnDrawWall.classList.remove('active-tool');
    canvas.selection = true;
    canvas.getObjects().forEach(obj => obj.set('selectable', true));
});

btnClear.addEventListener('click', () => {
    if(confirm("Clear canvas?")) canvas.clear();
});

// --- KEYBOARD DELETION LOGIC (NEW) ---
window.addEventListener('keydown', function(e) {
    // Check if the user pressed Delete or Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            activeObjects.forEach(function(obj) {
                // If it's a wall, delete its attached text label too
                if (obj.class === 'wall' && obj.dimensionLabel) {
                    canvas.remove(obj.dimensionLabel);
                }
                // If it's a text label, delete its attached wall
                if (obj.class === 'dimension' && obj.wallLine) {
                    canvas.remove(obj.wallLine);
                }
                canvas.remove(obj);
            });
            canvas.discardActiveObject(); // Clear the selection box
            canvas.renderAll();
        }
    }
});

// --- LAYER VISIBILITY LOGIC (NEW) ---
function updateLayers() {
    canvas.getObjects().forEach(obj => {
        if (obj.layer === 'arch') obj.set('visible', checkLayerArch.checked);
        if (obj.layer === 'elec') obj.set('visible', checkLayerElec.checked);
        if (obj.layer === 'plumb') obj.set('visible', checkLayerPlumb.checked);
    });
    canvas.discardActiveObject(); // Prevents ghosts of hidden selected objects
    canvas.renderAll();
}

checkLayerArch.addEventListener('change', updateLayers);
checkLayerElec.addEventListener('change', updateLayers);
checkLayerPlumb.addEventListener('change', updateLayers);

// --- Fixture Spawners ---
btnAddDoor.addEventListener('click', () => {
    let door = new fabric.Rect({
        left: canvas.width / 2, top: canvas.height / 2, width: 40, height: 10, fill: '#ffcc00', stroke: '#333', strokeWidth: 2,
        originX: 'center', originY: 'center', class: 'door', layer: 'arch' // Tagged as Architecture
    });
    canvas.add(door);
    btnSelect.click(); 
});

btnAddWindow.addEventListener('click', () => {
    let windowRect = new fabric.Rect({
        left: canvas.width / 2, top: canvas.height / 2, width: 60, height: 8, fill: '#66ccff', stroke: '#333', strokeWidth: 2,
        originX: 'center', originY: 'center', class: 'window', layer: 'arch' // Tagged as Architecture
    });
    canvas.add(windowRect);
    btnSelect.click();
});

// Spawn Electrical Outlet
btnAddOutlet.addEventListener('click', () => {
    let outlet = new fabric.Circle({
        radius: 12, fill: '#ff3b30', left: canvas.width / 2, top: canvas.height / 2,
        originX: 'center', originY: 'center', class: 'outlet', layer: 'elec' // Tagged as Electrical
    });
    canvas.add(outlet);
    btnSelect.click();
});

// Spawn Plumbing Pipe
btnAddPipe.addEventListener('click', () => {
    let pipe = new fabric.Rect({
        width: 80, height: 12, fill: '#007aff', left: canvas.width / 2, top: canvas.height / 2,
        originX: 'center', originY: 'center', class: 'pipe', layer: 'plumb' // Tagged as Plumbing
    });
    canvas.add(pipe);
    btnSelect.click();
});

// --- Snapping Logic ---
function getSnappedCoordinates(x, y) {
    let snapX = x, snapY = y;
    let lines = canvas.getObjects('line');
    
    for (let i = 0; i < lines.length; i++) {
        let obj = lines[i];
        if (obj === line) continue; 
        
        if (Math.hypot(x - obj.x1, y - obj.y1) < SNAP_RADIUS) return { x: obj.x1, y: obj.y1 };
        if (Math.hypot(x - obj.x2, y - obj.y2) < SNAP_RADIUS) return { x: obj.x2, y: obj.y2 };
    }
    return { x, y }; 
}

// --- Drawing & Dimensioning Logic ---
canvas.on('mouse:down', function(o) {
    if (currentMode !== 'draw-wall') return;
    // Don't draw if the architecture layer is hidden
    if (!checkLayerArch.checked) {
        alert("Please enable the Architecture layer to draw walls.");
        return;
    }
    
    isDrawing = true;
    let pointer = canvas.getPointer(o.e);
    let startPt = getSnappedCoordinates(pointer.x, pointer.y);
    let points = [startPt.x, startPt.y, startPt.x, startPt.y];
    
    line = new fabric.Line(points, {
        strokeWidth: 8, fill: '#333', stroke: '#333',
        originX: 'center', originY: 'center', selectable: false, evented: false, 
        class: 'wall', layer: 'arch' // Tagged as Architecture
    });
    
    dimensionText = new fabric.Text('0 px', {
        fontSize: 14, fill: '#007aff', backgroundColor: 'rgba(255,255,255,0.8)',
        originX: 'center', originY: 'center', selectable: false, evented: false,
        class: 'dimension', layer: 'arch' // Tagged as Architecture
    });

    // Mutually link the wall and text so deleting one deletes both
    line.dimensionLabel = dimensionText;
    dimensionText.wallLine = line;

    canvas.add(line, dimensionText);
});

canvas.on('mouse:move', function(o) {
    if (!isDrawing) return;
    let pointer = canvas.getPointer(o.e);
    let endPt = getSnappedCoordinates(pointer.x, pointer.y);
    
    line.set({ x2: endPt.x, y2: endPt.y });
    
    let dx = endPt.x - line.x1;
    let dy = endPt.y - line.y1;
    let length = Math.round(Math.sqrt(dx * dx + dy * dy));
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;

    if (angle > 90 || angle < -90) angle += 180;

    dimensionText.set({
        text: length + ' px', left: line.x1 + dx / 2, top: line.y1 + dy / 2 - 15, angle: angle
    });

    canvas.renderAll();
});

canvas.on('mouse:up', function(o) {
    if (!isDrawing) return;
    isDrawing = false;
    
    let length = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2));
    if (length < 15) {
        canvas.remove(line);
        canvas.remove(dimensionText);
    }
});
