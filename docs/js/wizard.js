(function(){
const PAGES = [
  {title:'What is ArchViz?', desc:'Problem, solution, who benefits'},
  {title:'Features Overview', desc:'6 views: spatial, sequence, story, benefits, KPI, PDF'},
  {title:'Architecture', desc:'Module stack, dep graph, tech pills'},
  {title:'JSON Basics', desc:'Root structure, minimal example'},
  {title:'Nodes & Connections', desc:'16 types, 9 tags, statuses'},
  {title:'Zones & Phases', desc:'10 zone types, nesting, phase system'},
  {title:'Sequence & Flows', desc:'Steps, popups, named flows, phase sync'},
  {title:'Story Mode', desc:'Problem, vision, phases, KPIs, idea cards'},
  {title:'Quick Start', desc:'jbang / Maven / 3 steps'},
  {title:'Live Examples', desc:'15 interactive diagrams to explore'},
];

const PAGE_FILES = [
  'pages/01-what-is-archviz.html',
  'pages/02-features-overview.html',
  'pages/03-architecture.html',
  'pages/04-json-basics.html',
  'pages/05-nodes-connections.html',
  'pages/06-zones-phases.html',
  'pages/07-sequence-flows.html',
  'pages/08-story-mode.html',
  'pages/09-quick-start.html',
  'pages/10-live-examples.html',
];

const pageCache = new Map();
let current = -1;
const visited = new Set();
const landing = document.getElementById('landingPage');
const bottombar = document.getElementById('bottombar');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dots = document.getElementById('progressDots');
const indicator = document.getElementById('stepIndicator');
const grid = document.getElementById('topicGrid');
const container = document.getElementById('pageContainer');

PAGES.forEach((p,i)=>{
  const c = document.createElement('div');
  c.className = 'topic-card';
  c.innerHTML = `<div class="topic-num">${i+1}</div><div class="topic-title">${p.title}</div><div class="topic-desc">${p.desc}</div>`;
  c.onclick = ()=> goToPage(i);
  grid.appendChild(c);
});

PAGES.forEach((_,i)=>{
  const d = document.createElement('div');
  d.className = 'progress-dot';
  d.title = PAGES[i].title;
  d.onclick = ()=> goToPage(i);
  dots.appendChild(d);
});

function goHome(){
  current = -1;
  container.classList.remove('active');
  container.innerHTML = '';
  landing.classList.add('active');
  bottombar.style.display = 'none';
  indicator.textContent = '';
}
window.goHome = goHome;

async function goToPage(idx){
  if(idx < 0 || idx >= PAGES.length) return;
  current = idx;
  visited.add(idx);

  if(!pageCache.has(idx)){
    const resp = await fetch(PAGE_FILES[idx]);
    pageCache.set(idx, await resp.text());
  }

  landing.classList.remove('active');
  container.innerHTML = `<div class="page-inner">${pageCache.get(idx)}</div>`;
  container.classList.add('active');

  bottombar.style.display = 'flex';
  prevBtn.disabled = idx === 0;
  nextBtn.textContent = idx === PAGES.length-1 ? '\u2302 Home' : 'Next \u2192';
  indicator.textContent = `${idx+1} / ${PAGES.length}: ${PAGES[idx].title}`;
  dots.querySelectorAll('.progress-dot').forEach((d,i)=>{
    d.classList.toggle('active', i===idx);
    d.classList.toggle('visited', visited.has(i) && i!==idx);
  });

  /* Animate pipeline steps if present on this page */
  const steps = container.querySelectorAll('.pl-step');
  if(steps.length > 0){
    steps.forEach((s,i)=>{s.classList.remove('on');setTimeout(()=>s.classList.add('on'),i*300);});
  }
}
window.goToPage = goToPage;

function prevPage(){ if(current > 0) goToPage(current-1); }
window.prevPage = prevPage;
function nextPage(){
  if(current === PAGES.length-1) goHome();
  else if(current >= 0) goToPage(current+1);
}
window.nextPage = nextPage;

document.addEventListener('keydown', e=>{
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();if(current>=0)nextPage();}
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();if(current>0)prevPage();}
  if(e.key==='Escape'||e.key==='Home'){e.preventDefault();goHome();}
});

/* ── Particle animation ── */
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight}
resize();window.addEventListener('resize',resize);
class P{
  constructor(){this.reset()}
  reset(){this.x=Math.random()*canvas.width;this.y=Math.random()*canvas.height;this.vx=(Math.random()-.5)*.25;this.vy=(Math.random()-.5)*.25;this.s=Math.random()*1.5+.5;this.a=Math.random()*.2+.05}
  update(){this.x+=this.vx;this.y+=this.vy;if(this.x<0||this.x>canvas.width)this.vx*=-1;if(this.y<0||this.y>canvas.height)this.vy*=-1}
  draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.s,0,Math.PI*2);ctx.fillStyle=`rgba(255,153,0,${this.a})`;ctx.fill()}
}
for(let i=0;i<50;i++)particles.push(new P());
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles.forEach(p=>{p.update();p.draw()});
  for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
    const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<120){ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle=`rgba(255,153,0,${.05*(1-d/120)})`;ctx.lineWidth=.5;ctx.stroke()}
  }
  requestAnimationFrame(animate);
}
animate();
})();
