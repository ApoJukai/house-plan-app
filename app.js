const canvas = new fabric.Canvas('main-canvas', { selection: false });

function resizeCanvas() {
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
    canvas.renderAll();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let currentMode = 'draw-wall'; 
let isDrawing = false;
let line, dimensionText;
const SNAP_RADIUS = 20;

const btnDrawWall = document.getElementById('draw-wall-btn');
const btnSelect = document.getElementById('select-btn');
const btnClear = document.getElementById('clear-btn');
const checkLayerArch = document.getElementById('layer-arch');
const checkLayerElec = document.getElementById('layer-elec');
const checkLayerPlumb = document.getElementById('layer-plumb');

// --- Tool Switcher ---
btnDrawWall.addEventListener('click', () => {
    currentMode = 'draw-wall'; btnDrawWall.classList.add('active-tool'); btnSelect.classList.remove('active-tool');
    canvas.selection = false; canvas.getObjects().forEach(obj => { if (obj.class === 'wall') obj.set('selectable', false); });
});

btnSelect.addEventListener('click', () => {
    currentMode = 'select'; btnSelect.classList.add('active-tool'); btnDrawWall.classList.remove('active-tool');
    canvas.selection = true; canvas.getObjects().forEach(obj => obj.set('selectable', true));
});

btnClear.addEventListener('click', () => { if(confirm("Clear canvas?")) canvas.clear(); });

// --- Layer Visibility Logic ---
function updateLayers() {
    canvas.getObjects().forEach(obj => {
        if (obj.layer === 'arch') obj.set('visible', checkLayerArch.checked);
        if (obj.layer === 'elec') obj.set('visible', checkLayerElec.checked);
        if (obj.layer === 'plumb') obj.set('visible', checkLayerPlumb.checked);
    });
    canvas.discardActiveObject(); canvas.renderAll();
}
checkLayerArch.addEventListener('change', updateLayers);
checkLayerElec.addEventListener('change', updateLayers);
checkLayerPlumb.addEventListener('change', updateLayers);

// --- Deletion Logic ---
window.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
            activeObjects.forEach(function(obj) {
                if (obj.class === 'wall' && obj.dimensionLabel) canvas.remove(obj.dimensionLabel);
                if (obj.class === 'dimension' && obj.wallLine) canvas.remove(obj.wallLine);
                canvas.remove(obj);
            });
            canvas.discardActiveObject(); canvas.renderAll();
        }
    }
});

// --- REUSABLE SPAWN FUNCTIONS (For UI and Script) ---
function spawnFixture(type, x, y) {
    let obj;
    if (type === 'door') {
        obj = new fabric.Rect({ left: x, top: y, width: 40, height: 10, fill: '#ffcc00', stroke: '#333', strokeWidth: 2, originX: 'center', originY: 'center', class: 'door', layer: 'arch' });
    } else if (type === 'window') {
        obj = new fabric.Rect({ left: x, top: y, width: 60, height: 8, fill: '#66ccff', stroke: '#333', strokeWidth: 2, originX: 'center', originY: 'center', class: 'window', layer: 'arch' });
    } else if (type === 'outlet') {
        obj = new fabric.Circle({ radius: 12, fill: '#ff3b30', left: x, top: y, originX: 'center', originY: 'center', class: 'outlet', layer: 'elec' });
    } else if (type === 'pipe') {
        obj = new fabric.Rect({ left: x, top: y, width: 80, height: 12, fill: '#007aff', originX: 'center', originY: 'center', class: 'pipe', layer: 'plumb' });
    }
    if (obj) { canvas.add(obj); canvas.renderAll(); }
}

function spawnWall(x1, y1, x2, y2) {
    let newWall = new fabric.Line([x1, y1, x2, y2], { strokeWidth: 8, fill: '#333', stroke: '#333', originX: 'center', originY: 'center', selectable: false, evented: false, class: 'wall', layer: 'arch' });
    
    let dx = x2 - x1, dy = y2 - y1;
    let length = Math.round(Math.sqrt(dx * dx + dy * dy));
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle > 90 || angle < -90) angle += 180;

    let newText = new fabric.Text(length + ' px', {
        left: x1 + dx / 2, top: y1 + dy / 2 - 15, angle: angle, fontSize: 14, fill: '#007aff', backgroundColor: 'rgba(255,255,255,0.8)', originX: 'center', originY: 'center', selectable: false, evented: false, class: 'dimension', layer: 'arch'
    });

    newWall.dimensionLabel = newText;
    newText.wallLine = newWall;
    canvas.add(newWall, newText);
    canvas.renderAll();
}

// UI Buttons calling spawn functions
document.getElementById('add-door-btn').addEventListener('click', () => { spawnFixture('door', canvas.width/2, canvas.height/2); btnSelect.click(); });
document.getElementById('add-window-btn').addEventListener('click', () => { spawnFixture('window', canvas.width/2, canvas.height/2); btnSelect.click(); });
document.getElementById('add-outlet-btn').addEventListener('click', () => { spawnFixture('outlet', canvas.width/2, canvas.height/2); btnSelect.click(); });
document.getElementById('add-pipe-btn').addEventListener('click', () => { spawnFixture('pipe', canvas.width/2, canvas.height/2); btnSelect.click(); });

// --- SCRIPT PARSER ENGINE (NEW) ---
document.getElementById('run-script-btn').addEventListener('click', () => {
    const scriptText = document.getElementById('script-input').value;
    const lines = scriptText.split('\n'); // Split into individual lines

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/); // Split by spaces
        const command = parts[0].toLowerCase();

        if (command === 'wall' && parts.length === 5) {
            spawnWall(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4]));
        } 
        else if (['door', 'window', 'outlet', 'pipe'].includes(command) && parts.length === 3) {
            spawnFixture(command, parseFloat(parts[1]), parseFloat(parts[2]));
        }
    });
});

// --- Mouse Drawing Logic ---
function getSnappedCoordinates(x, y) {
    let lines = canvas.getObjects('line');
    for (let i = 0; i < lines.length; i++) {
        let obj = lines[i];
        if (obj === line) continue; 
        if (Math.hypot(x - obj.x1, y - obj.y1) < SNAP_RADIUS) return { x: obj.x1, y: obj.y1 };
        if (Math.hypot(x - obj.x2, y - obj.y2) < SNAP_RADIUS) return { x: obj.x2, y: obj.y2 };
    }
    return { x, y }; 
}

canvas.on('mouse:down', function(o) {
    if (currentMode !== 'draw-wall' || !checkLayerArch.checked) return;
    isDrawing = true;
    let pointer = canvas.getPointer(o.e);
    let startPt = getSnappedCoordinates(pointer.x, pointer.y);
    
    line = new fabric.Line([startPt.x, startPt.y, startPt.x, startPt.y], { strokeWidth: 8, fill: '#333', stroke: '#333', originX: 'center', originY: 'center', selectable: false, evented: false, class: 'wall', layer: 'arch' });
    dimensionText = new fabric.Text('0 px', { fontSize: 14, fill: '#007aff', backgroundColor: 'rgba(255,255,255,0.8)', originX: 'center', originY: 'center', selectable: false, evented: false, class: 'dimension', layer: 'arch' });

    line.dimensionLabel = dimensionText; dimensionText.wallLine = line;
    canvas.add(line, dimensionText);
});

canvas.on('mouse:move', function(o) {
    if (!isDrawing) return;
    let pointer = canvas.getPointer(o.e);
    let endPt = getSnappedCoordinates(pointer.x, pointer.y);
    line.set({ x2: endPt.x, y2: endPt.y });
    
    let dx = endPt.x - line.x1, dy = endPt.y - line.y1;
    let length = Math.round(Math.sqrt(dx * dx + dy * dy));
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle > 90 || angle < -90) angle += 180;

    dimensionText.set({ text: length + ' px', left: line.x1 + dx / 2, top: line.y1 + dy / 2 - 15, angle: angle });
    canvas.renderAll();
});

canvas.on('mouse:up', function() {
    if (!isDrawing) return;
    isDrawing = false;
    let length = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2));
    if (length < 15) { canvas.remove(line); canvas.remove(dimensionText); }
});
