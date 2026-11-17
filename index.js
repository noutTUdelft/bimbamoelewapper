function setup() {
  const canvas = createCanvas(600, 400);
  canvas.parent("canvas-container"); // places the canvas inside <main>
}

function draw() {
  background(30);
  fill(255, 100, 150);
  circle(mouseX, mouseY, 50);
}