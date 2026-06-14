// Initialize Fabric Canvas
const canvas = new fabric.Canvas('main-canvas', {
    selection: false // Disable group selection while drawing
});

// Resize canvas to fill the screen
function resizeCanvas() {
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
    canvas.renderAll();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Application State
let currentMode = 'draw-wall'; // 'draw-wall' or 'select'
let isDrawing = false;
let line, isDown;

// UI Elements
const btnDrawWall = document.getElementById('draw-wall-btn');
const btnSelect = document.getElementById('select-btn');
const btnClear = document.getElementById('clear-btn');

// --- Tool Switching Logic ---
btnDrawWall.addEventListener('click', () => {
    currentMode = 'draw-wall';
    btnDrawWall.classList.add('active-tool');
    btnSelect.classList.remove('active-tool');
    canvas.selection = false; // Disable selecting objects
});

btnSelect.addEventListener('click', () => {
    currentMode = 'select';
    btnSelect.classList.add('active-tool');
    btnDrawWall.classList.remove('active-tool');
    canvas.selection = true; // Enable selecting and moving
    // Make all objects selectable
    canvas.getObjects().forEach(obj => {
        obj.set({ selectable: true, evented: true });
    });
});

btnClear.addEventListener('click', () => {
    if(confirm("Are you sure you want to clear the design?")) {
        canvas.clear();
    }
});

// --- Drawing Logic (Walls) ---
canvas.on('mouse:down', function(o) {
    if (currentMode !== 'draw-wall') return;
    
    isDrawing = true;
    let pointer = canvas.getPointer(o.e);
    let points = [pointer.x, pointer.y, pointer.x, pointer.y];
    
    // Create a new line (wall)
    line = new fabric.Line(points, {
        strokeWidth: 8,
        fill: '#333333',
        stroke: '#333333',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        strokeLineCap: 'round'
    });
    
    // Add custom property to identify it later
    line.set({ class: 'wall' }); 
    canvas.add(line);
});

canvas.on('mouse:move', function(o) {
    if (!isDrawing) return;
    let pointer = canvas.getPointer(o.e);
    
    // Update line coordinates
    line.set({ x2: pointer.x, y2: pointer.y });
    
    // Calculate Length (pixels)
    let dx = pointer.x - line.x1;
    let dy = pointer.y - line.y1;
    let lengthInPixels = Math.sqrt(dx * dx + dy * dy);
    
    // TODO: Render 'lengthInPixels' as text on the canvas
    
    canvas.renderAll();
});

canvas.on('mouse:up', function(o) {
    if (!isDrawing) return;
    isDrawing = false;
    
    // Optional: Delete lines that are too short (accidental clicks)
    let length = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2));
    if (length < 10) {
        canvas.remove(line);
    }
});
