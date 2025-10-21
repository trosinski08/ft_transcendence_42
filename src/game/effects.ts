type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; type: 'spark'|'trail'|'explosion' };
type TrailItem = { x:number; y:number; life:number };
type Pickup = { x:number; y:number; r:number; type: string } | null;

let particles: Particle[] = [];
let ballTrail: TrailItem[] = [];
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let pickup: Pickup = null;
let puMsg: { text: string; until: number } | null = null;
let puEnabled = true;
let puIntervalMs = 12000;
let nextPuAt = 0;

export function setPuEnabled(v: boolean) { puEnabled = !!v; }
export function setPuIntervalMs(ms: number) { puIntervalMs = ms; }
export function getPickup() { return pickup; }
export function getPuMsg() { return puMsg; }
export function getParticles() { return particles; }
export function getBallTrail() { return ballTrail; }

export function addParticles(x:number,y:number,count:number,type:'spark'|'trail'|'explosion', color='#00ff6a'){
  for (let i=0;i<count;i++){
    const angle = (Math.PI*2*i)/count + Math.random()*0.5;
    const speed = 2 + Math.random()*3;
    particles.push({ x,y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 30+Math.random()*20, maxLife:50, size: 2+Math.random()*3, color, type });
  }
}
export function addScreenShake(intensity:number,duration:number){ screenShake.intensity = Math.max(screenShake.intensity, intensity); screenShake.duration = Math.max(screenShake.duration, duration); }

function spawnPickupInternal(W:number,H:number){
  const margin = 50;
  const x = margin + Math.random()*(W-2*margin);
  const y = margin + Math.random()*(H-2*margin);
  const types = ['FAST','SLOW','BIG','SMALL','POINT'];
  const type = types[Math.floor(Math.random()*types.length)];
  pickup = { x,y,r:8, type };
}

export function updateEffects(opts: { now:number; running:boolean; winner: string|null; ball: { x:number;y:number;r:number }; W:number; H:number; lastHit: 1|2|null }){
  const { now, running, winner, ball, W, H, lastHit } = opts;
  // update particles
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life--; p.vx *= 0.98; p.vy *= 0.98; return p.life>0;
  });
  // trail
  if (running && !winner) ballTrail.push({ x: ball.x, y: ball.y, life: 15 });
  ballTrail = ballTrail.filter(t => { t.life--; return t.life>0; });
  // screen shake
  if (screenShake.duration>0){ screenShake.duration--; const intensity = screenShake.intensity * (screenShake.duration/60); screenShake.x = (Math.random()-0.5)*intensity; screenShake.y = (Math.random()-0.5)*intensity; } else { screenShake.x = 0; screenShake.y = 0; }
  // power-up spawn and pickup detection
  if (!puEnabled) return null;
  if (!pickup && now >= nextPuAt){ spawnPickupInternal(W,H); nextPuAt = now + puIntervalMs; }
  if (pickup){ const dx = ball.x - pickup.x; const dy = ball.y - pickup.y; const rr = (ball.r + pickup.r)*(ball.r + pickup.r); if (dx*dx + dy*dy <= rr){ const collector:1|2 = lastHit ?? (opts.ball.x >= W/2 ? 1 : 2); const type = pickup.type; pickup = null; puMsg = { text: type, until: now + 1200 }; return { pickupCollected: { type, collector } }; } }
  return null;
}

export function drawParticles(ctx: CanvasRenderingContext2D | null){ if (!ctx) return; ballTrail.forEach((t)=>{ const alpha = t.life/15; ctx.save(); ctx.globalAlpha = alpha*0.6; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(t.x,t.y,2*alpha,0,Math.PI*2); ctx.fill(); ctx.restore(); }); particles.forEach(p=>{ const alpha = p.life/p.maxLife; ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = p.color; if (p.type==='explosion'){ ctx.beginPath(); ctx.arc(p.x,p.y,p.size*alpha,0,Math.PI*2); ctx.fill(); } else { ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size); } ctx.restore(); }); }
