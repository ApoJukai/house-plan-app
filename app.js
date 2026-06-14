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
const SNAP_RADIUS = 20; // Pixels to trigger magnetic snap

// --- UI Elements ---
const btnDrawWall = document.getElementById('draw-wall-btn');
const btnSelect = document.getElementById('select-btn');
const btnClear = document.getElementById('clear-btn');
const btnAddDoor = document.getElementById('add-door-btn');
const btnAddWindow = document.getElementById('add-window-btn');

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

// --- Fixture Spawners (Doors & Windows) ---
btnAddDoor.addEventListener('click', () => {
    // A door is visually represented as an open arc or a distinct rectangle
    let door = new fabric.Rect({
        left: canvas.width / 2, top: canvas.height / 2,
        width: 40, height: 10, fill: '#ffcc00', stroke: '#333', strokeWidth: 2,
        originX: 'center', originY: 'center', class: 'door'
    });
    canvas.add(door);
    btnSelect.click(); // Auto-switch to select mode so user can move it
});

btnAddWindow.addEventListener('click', () => {
    // A window is visually represented as a light blue pane
    let windowRect = new fabric.Rect({
        left: canvas.width / 2, top: canvas.height / 2,
        width: 60, height: 8, fill: '#66ccff', stroke: '#333', strokeWidth: 2,
        originX: 'center', originY: 'center', class: 'window'
    });
    canvas.add(windowRect);
    btnSelect.click();
});

// --- Snapping Logic ---
function getSnappedCoordinates(x, y) {
    let snapX = x, snapY = y;
    let lines = canvas.getObjects('line');
    
    for (let i = 0; i < lines.length; i++) {
        let obj = lines[i];
        if (obj === line) continue; // Don't snap to the line we are currently drawing
        
        // Check distance to Point 1 of existing line
        if (Math.hypot(x - obj.x1, y - obj.y1) < SNAP_RADIUS) {
            return { x: obj.x1, y: obj.y1 };
        }
        // Check distance to Point 2 of existing line
        if (Math.hypot(x - obj.x2, y - obj.y2) < SNAP_RADIUS) {
            return { x: obj.x2, y: obj.y2 };
        }
    }
    return { x, y }; // Return original if no snap
}

// --- Drawing & Dimensioning Logic ---
canvas.on('mouse:down', function(o) {
    if (currentMode !== 'draw-wall') return;
    isDrawing = true;
    let pointer = canvas.getPointer(o.e);
    
    // Check snapping for starting point
    let startPt = getSnappedCoordinates(pointer.x, pointer.y);
    let points = [startPt.x, startPt.y, startPt.x, startPt.y];
    
    // Draw Line
    line = new fabric.Line(points, {
        strokeWidth: 8, fill: '#333', stroke: '#333',
        originX: 'center', originY: 'center', selectable: false, evented: false, class: 'wall'
    });
    
    // Draw Dimension Label
    dimensionText = new fabric.Text('0 px', {
        fontSize: 14, fill: '#007aff', backgroundColor: 'rgba(255,255,255,0.8)',
        originX: 'center', originY: 'center', selectable: false, evented: false
    });

    canvas.add(line, dimensionText);
});

canvas.on('mouse:move', function(o) {
    if (!isDrawing) return;
    let pointer = canvas.getPointer(o.e);
    
    // Check snapping for current mouse position
    let endPt = getSnappedCoordinates(pointer.x, pointer.y);
    
    line.set({ x2: endPt.x, y2: endPt.y });
    
    // Calculate Length and Angle for Dimensioning
    let dx = endPt.x - line.x1;
    let dy = endPt.y - line.y1;
    let length = Math.round(Math.sqrt(dx * dx + dy * dy));
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Keep text upright
    if (angle > 90 || angle < -90) angle += 180;

    dimensionText.set({
        text: length + ' px',
        left: line.x1 + dx / 2,
        top: line.y1 + dy / 2 - 15, // Offset slightly above the wall
        angle: angle
    });

    canvas.renderAll();
});

canvas.on('mouse:up', function(o) {
    if (!isDrawing) return;
    isDrawing = false;
    
    // Delete line if it's too short (accidental click)
    let length = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2));
    if (length < 15) {
        canvas.remove(line);
        canvas.remove(dimensionText);
    }
});
