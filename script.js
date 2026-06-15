const header = document.querySelector(".site-header");
const canvas = document.querySelector("#analysisCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

let width = 0;
let height = 0;
let motionPhase = 0;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const ratio = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawAnalysis() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, "#252115");
  sky.addColorStop(0.42, "#0b0a08");
  sky.addColorStop(1, "#000000");
  ctx.fillRect(0, 0, width, height);

  drawGrid();
  drawSignalRings();
  drawGolferTrace();
  drawMetrics();

  motionPhase += 0.012;
  requestAnimationFrame(drawAnalysis);
}

function drawGrid() {
  const spacing = Math.max(54, width * 0.07);
  ctx.strokeStyle = "rgba(246, 220, 137, 0.12)";
  ctx.lineWidth = 1;

  for (let x = -spacing; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(motionPhase) * 8, 0);
    ctx.lineTo(x - width * 0.12, height);
    ctx.stroke();
  }

  for (let y = spacing; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.cos(motionPhase) * 10);
    ctx.stroke();
  }
}

function drawSignalRings() {
  const x = width * 0.78;
  const y = height * 0.34;

  for (let i = 0; i < 5; i += 1) {
    const pulse = (Math.sin(motionPhase * 1.5 + i) + 1) * 0.5;
    ctx.strokeStyle = `rgba(246, 220, 137, ${0.14 + pulse * 0.16})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, width * (0.07 + i * 0.045 + pulse * 0.01), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGolferTrace() {
  const baseX = width * 0.66;
  const baseY = height * 0.72;
  const scale = Math.min(width, height) * 0.25;
  const sway = Math.sin(motionPhase) * scale * 0.018;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = Math.max(4, width * 0.004);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const headX = baseX + sway;
  const headY = baseY - scale * 1.18;
  const shoulderX = baseX - scale * 0.05;
  const shoulderY = baseY - scale * 0.9;
  const hipX = baseX + scale * 0.02;
  const hipY = baseY - scale * 0.48;

  ctx.beginPath();
  ctx.arc(headX, headY, scale * 0.09, 0, Math.PI * 2);
  ctx.stroke();

  line(shoulderX, shoulderY, hipX, hipY);
  line(shoulderX, shoulderY, shoulderX - scale * 0.34, shoulderY - scale * 0.16);
  line(shoulderX, shoulderY, shoulderX + scale * 0.28, shoulderY - scale * 0.22);
  line(hipX, hipY, hipX - scale * 0.2, baseY);
  line(hipX, hipY, hipX + scale * 0.18, baseY);

  ctx.strokeStyle = "rgba(246, 220, 137, 0.78)";
  ctx.lineWidth = Math.max(3, width * 0.003);
  ctx.beginPath();
  ctx.arc(shoulderX - scale * 0.04, shoulderY - scale * 0.04, scale * 0.66, -2.9, -0.28);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 248, 223, 0.5)";
  ctx.setLineDash([8, 10]);
  line(shoulderX - scale * 0.48, shoulderY - scale * 0.2, shoulderX + scale * 0.54, shoulderY - scale * 0.34);
  line(hipX - scale * 0.38, hipY, hipX + scale * 0.42, hipY - scale * 0.08);
  ctx.setLineDash([]);

  joint(headX, headY);
  joint(shoulderX, shoulderY);
  joint(hipX, hipY);
}

function drawMetrics() {
  const left = width * 0.58;
  const top = height * 0.18;
  const rows = ["Tempo 82", "Plane 74", "Balance 91"];

  ctx.font = "700 14px system-ui, sans-serif";
  rows.forEach((row, index) => {
    const y = top + index * 44;
    ctx.fillStyle = "rgba(0, 0, 0, 0.54)";
    ctx.fillRect(left, y, 132, 28);
    ctx.fillStyle = "#f6dc89";
    ctx.fillText(row, left + 14, y + 19);
  });
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function joint(x, y) {
  ctx.fillStyle = "#f6dc89";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 18);
}

if (header) {
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
}

if (canvas && ctx) {
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  drawAnalysis();
}
