export const MODEL_VERSION = 'magnetic-spherical-2';
export interface Magnet { x:number; y:number; k:number; color?:string }
export interface Physics { L:number; mass:number; g:number; h:number; gamma:number; magnets:Magnet[]; constraint?:'rod'|'string' }
export interface Criteria { radius:number; speed:number; acceleration:number; settle:number }
export interface Bounds { xmin:number; xmax:number; ymin:number; ymax:number }
export interface Config { physics:Physics; criteria:Criteria; dt:number; duration:number; vx:number; vy:number; n:number; bounds:Bounds; perturbation:number; divergenceHorizon:number; colourMode?:string; palette?:string; boardCoordinates?:'cartesian'|'polar'; velocityMode?:'cartesian'|'tangent'; meridionalSpeed?:number; azimuthalSpeed?:number; calibration?:{source:string;created:string;mass:number;coefficient:number;rmse:number;exponent:number} }
export interface Equilibrium { x:number; y:number; stable:boolean; eigenvalues:number[]; magnet:number; label:string }
export interface Checkpoint { s:Float64Array; t:number; outcome:number; candidate:number; settling:number; convergence:number; e0:number; scale:number; maxResidual:number; reversals:number; signs:number[]; pending:number[]; persist:number[]; taut:boolean; impacts:number; impactLoss:number }
export interface Sample { t:number; x:number; y:number; z:number; vx:number; vy:number; vz:number; speed:number; acceleration:number; kinetic:number; potential:number; energy:number; q:number; residual:number; length:number; tension:number; taut:number; impacts:number; impactLoss:number }
export const triangle = (r=.12,k=.02):Magnet[] => [0,1,2].map(i=>({x:r*Math.cos(Math.PI/2+i*2*Math.PI/3), y:r*Math.sin(Math.PI/2+i*2*Math.PI/3),k}));
export const defaults = ():Config => ({palette:'soft',physics:{L:1,mass:.1,g:9.81,h:.035,gamma:.65,magnets:triangle()}, criteria:{radius:.001,speed:.002,acceleration:.02,settle:.5},dt:.004,duration:30,vx:0,vy:0,n:100,bounds:{xmin:-.2,xmax:.2,ymin:-.2,ymax:.2},perturbation:1e-6,divergenceHorizon:5});
export function validate(c:Config) {
 const p=c.physics, b=c.bounds, r=c.criteria;
 const positive=[p.L,p.mass,p.h,c.dt,c.duration,r.radius,r.speed,r.acceleration,r.settle,c.perturbation,c.divergenceHorizon];
 if(positive.some(x=>!Number.isFinite(x)||x<=0)||!Number.isFinite(p.g)||p.g<0||!Number.isFinite(p.gamma)||p.gamma<0) throw Error('Length, mass, height, steps and tolerances must be positive; gravity and damping must be non-negative.');
 if(c.dt>.02||c.dt<.00001||c.duration>3600||c.duration<1||c.divergenceHorizon>3600) throw Error('Use Δt 0.00001–0.02 s, duration 1–3600 s and divergence horizon ≤3600 s.');
 if(![100,250,500,1000].includes(c.n)) throw Error('Unsupported resolution.');
 if(![b.xmin,b.xmax,b.ymin,b.ymax,b.xmax-b.xmin,b.ymax-b.ymin,c.vx,c.vy,p.g/p.L,p.h*p.h].every(Number.isFinite)||p.h*p.h===0||b.xmax<=b.xmin||b.ymax<=b.ymin) throw Error('Each maximum must exceed its minimum; coordinates, spans and derived constants must be finite.');
 if(p.magnets.length<1||p.magnets.length>16||p.magnets.some(m=>![m.x,m.y,m.k].every(Number.isFinite)||m.k<0||('repel' in m&&m.repel!==undefined&&m.repel!==false)||(m.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(m.color)))) throw Error('Use between 1 and 16 finite attractive magnets with non-negative strengths. Older repulsive investigations must be recreated with attraction; their results cannot be reused.');
 if(p.constraint!==undefined&&!['rod','string'].includes(p.constraint))throw Error('Unknown support model.');
 if(c.boardCoordinates!==undefined&&!['cartesian','polar'].includes(c.boardCoordinates))throw Error('Unknown board coordinates.');
 if(c.velocityMode!==undefined&&!['cartesian','tangent'].includes(c.velocityMode))throw Error('Unknown initial-velocity parameterisation.');
 if(c.velocityMode==='tangent'&&![c.meridionalSpeed,c.azimuthalSpeed].every(v=>typeof v==='number'&&Number.isFinite(v)))throw Error('Tangent speeds must be finite.');
 if(c.calibration!==undefined){const r=c.calibration;if(typeof r.source!=='string'||r.source.length>200||typeof r.created!=='string'||![r.mass,r.coefficient,r.rmse,r.exponent].every(Number.isFinite)||r.mass<=0||r.coefficient<=0||r.rmse<0)throw Error('Invalid calibration provenance.');}
 if(!Number.isFinite(c.perturbation+c.divergenceHorizon)||c.perturbation<1e-15) throw Error('Perturbation must be finite and at least 1e-15 m.');
 if(b.xmin+(b.xmax-b.xmin)/c.n===b.xmin||b.ymin+(b.ymax-b.ymin)/c.n===b.ymin) throw Error('Adjacent coordinates are indistinguishable in double precision.');
 const farX=Math.max(Math.abs(b.xmin),Math.abs(b.xmax)),farY=Math.max(Math.abs(b.ymin),Math.abs(b.ymax));
 if(Math.hypot(farX,farY)>=p.L)throw Error(`Map corners must satisfy x² + y² < L². This view reaches ${Math.hypot(farX,farY).toPrecision(6)} m horizontally, but the pendulum is ${p.L} m long. Reduce the ranges or increase L.`);
}
export function releaseZ(x:number,y:number,p:Physics){if(!Number.isFinite(x+y)||Math.hypot(x,y)>=p.L)throw Error(`Impossible release: require x² + y² < L² for a lower-hemisphere release (L = ${p.L} m).`);return -Math.sqrt((p.L-Math.hypot(x,y))*(p.L+Math.hypot(x,y)));}
// z is measured up from the pivot; magnet plane is z=−(L+h).
// h is clearance at the lowest point, rather than a constant separation.
export function derivative(s:Float64Array,p:Physics,out:Float64Array,constrained=true){
 const x=s[0],y=s[1],z=s[6],vx=s[2],vy=s[3],vz=s[7],v2=vx*vx+vy*vy+vz*vz;
 let fx=-p.gamma*vx,fy=-p.gamma*vy,fz=-p.g-p.gamma*vz;
 for(let i=0;i<p.magnets.length;i++){const m=p.magnets[i],dx=m.x-x,dy=m.y-y,dz=-(p.L+p.h)-z,d2=dx*dx+dy*dy+dz*dz,f=m.k/(d2*Math.sqrt(d2));fx+=f*dx;fy+=f*dy;fz+=f*dz;}
 const lambda=constrained?(x*fx+y*fy+z*fz+v2)/(p.L*p.L):0;
 out[0]=vx;out[1]=vy;out[2]=fx-lambda*x;out[3]=fy-lambda*y;out[4]=p.gamma*v2;out[5]=Math.hypot(vx,vy);out[6]=vz;out[7]=fz-lambda*z;
}
export function tensionPerMass(s:Float64Array,p:Physics){const x=s[0],y=s[1],z=s[6];let radial=-p.g*z-p.gamma*(x*s[2]+y*s[3]+z*s[7]);for(const m of p.magnets){const dx=m.x-x,dy=m.y-y,dz=-p.L-p.h-z,d=Math.hypot(dx,dy,dz);radial+=m.k*(x*dx+y*dy+z*dz)/d**3;}return (radial+s[2]**2+s[3]**2+s[7]**2)/p.L;}
export function angularPosition(thetaDegrees:number,azimuthDegrees:number,L:number):[number,number]{if(!Number.isFinite(thetaDegrees+azimuthDegrees)||thetaDegrees<0||thetaDegrees>=90)throw Error('Release angle must be 0 ≤ θ < 90° (lower hemisphere).');const theta=thetaDegrees*Math.PI/180,phi=azimuthDegrees*Math.PI/180;return [L*Math.sin(theta)*Math.cos(phi),L*Math.sin(theta)*Math.sin(phi)];}
export function tangentVelocity(x:number,y:number,z:number,meridional:number,azimuthal:number,L:number):[number,number,number]{const phi=Math.atan2(y,x),rho=Math.hypot(x,y),cos=-z/L,sin=rho/L;return [meridional*cos*Math.cos(phi)-azimuthal*Math.sin(phi),meridional*cos*Math.sin(phi)+azimuthal*Math.cos(phi),meridional*sin];}
export function project(s:Float64Array,p:Physics){const norm=Math.hypot(s[0],s[1],s[6]),scale=p.L/norm;s[0]*=scale;s[1]*=scale;s[6]*=scale;const radial=(s[0]*s[2]+s[1]*s[3]+s[6]*s[7])/(p.L*p.L);s[2]-=radial*s[0];s[3]-=radial*s[1];s[7]-=radial*s[6];}
export function force(x:number,y:number,p:Physics):[number,number] {
 if(Math.hypot(x,y)>=p.L)return [NaN,NaN];const state=new Float64Array([x,y,0,0,0,0,releaseZ(x,y,p),0]),out=new Float64Array(8);derivative(state,p,out);return [out[2],out[3]];
}
export function potential(x:number,y:number,p:Physics,z=releaseZ(x,y,p)){let u=p.g*(z+p.L);const height=p.L+p.h+z;for(const m of p.magnets)u-=m.k/Math.hypot(m.x-x,m.y-y,height);return u;}
export function jacobian(x:number,y:number,p:Physics):[number,number,number,number] {
 const eps=Math.min(1e-6*p.L,(p.L-Math.hypot(x,y))*.1);if(!(eps>0))return [NaN,NaN,NaN,NaN];const xp=force(x+eps,y,p),xm=force(x-eps,y,p),yp=force(x,y+eps,p),ym=force(x,y-eps,p);return [(xp[0]-xm[0])/(2*eps),(yp[0]-ym[0])/(2*eps),(xp[1]-xm[1])/(2*eps),(yp[1]-ym[1])/(2*eps)];
}
export function equilibria(p:Physics):Equilibrium[]{
 const extent=Math.max(.3,...p.magnets.map(m=>Math.hypot(m.x,m.y)*1.5));const seeds:[number,number][]=[[0,0],...p.magnets.map(m=>[m.x,m.y] as [number,number])];
 for(let i=0;i<=16;i++)for(let j=0;j<=16;j++)seeds.push([(i/16*2-1)*extent,(j/16*2-1)*extent]);
 const roots:Equilibrium[]=[];
 for(let [x,y] of seeds){
  if(Math.hypot(x,y)>=p.L*.999)continue;
  for(let it=0;it<80;it++){const [fx,fy]=force(x,y,p),[a,b,jc,d]=jacobian(x,y,p),det=a*d-b*jc;if(!Number.isFinite(det)||Math.abs(det)<1e-14)break;let dx=(d*fx-b*fy)/det,dy=(a*fy-jc*fx)/det;let cap=Math.min(1,.05/Math.hypot(dx,dy));while(Math.hypot(x-cap*dx,y-cap*dy)>=p.L*.999&&cap>1e-10)cap*=.5;dx*=cap;dy*=cap;x-=dx;y-=dy;if(Math.hypot(dx,dy)<1e-12)break;}
  if(!Number.isFinite(x+y)||Math.hypot(...force(x,y,p))>1e-7||roots.some(r=>Math.hypot(x-r.x,y-r.y)<1e-7))continue;
  const [a,b,jc,d]=jacobian(x,y,p),v=Math.sqrt(Math.max(0,(a-d)*(a-d)+4*b*jc)),eig=[(a+d-v)/2,(a+d+v)/2];
  let magnet=-1,distance=Infinity;for(let i=0;i<p.magnets.length;i++){const m=p.magnets[i];if(m.k===0)continue;const d=Math.hypot(x-m.x,y-m.y);if(d<distance){distance=d;magnet=i;}}
  if(magnet>=0&&distance>Math.max(.025,Math.hypot(p.magnets[magnet].x,p.magnets[magnet].y)*.55))magnet=-1;
  roots.push({x,y,stable:eig[1]<-1e-8,eigenvalues:eig,magnet,label:''});
 }
 roots.sort((a,b)=>a.magnet-b.magnet||a.x-b.x);let extra=0;for(const r of roots)r.label=r.magnet>=0?String.fromCharCode(65+r.magnet):`Other ${++extra}`;
 return roots;
}
// Eight RK4 variables: x,y,vx,vy,q,horizontal path,z,vz. Full 3D sphere,
// including crossings of the equator; the x/y chart is used only at release.
export class Integrator {
 p:Physics; scratch=Array.from({length:5},()=>new Float64Array(8));
 start=new Float64Array(8); trial=new Float64Array(8);
 constructor(p:Physics){this.p=p;}
 derivative(s:Float64Array,out:Float64Array){derivative(s,this.p,out);}
 rk(s:Float64Array,dt:number,constrained=true){const [a,b,c,d,tmp]=this.scratch;derivative(s,this.p,a,constrained);for(let i=0;i<8;i++)tmp[i]=s[i]+dt*.5*a[i];derivative(tmp,this.p,b,constrained);for(let i=0;i<8;i++)tmp[i]=s[i]+dt*.5*b[i];derivative(tmp,this.p,c,constrained);for(let i=0;i<8;i++)tmp[i]=s[i]+dt*c[i];derivative(tmp,this.p,d,constrained);for(let i=0;i<8;i++)s[i]+=dt/6*(a[i]+2*b[i]+2*c[i]+d[i]);if(constrained)project(s,this.p);}
 step(s:Float64Array,dt:number,cp?:Checkpoint){if(this.p.constraint!=='string'){this.rk(s,dt);return;}if(!cp)throw Error('String integration requires a checkpoint for slack/contact state.');let remaining=dt;
  for(let events=0;remaining>1e-12;events++){if(events>8)throw Error('Too many string events in one step; reduce Δt.');this.start.set(s);
   if(cp.taut&&tensionPerMass(s,this.p)<-1e-10){cp.taut=false;continue;}
   this.rk(s,remaining,cp.taut);
   const detaches=cp.taut&&tensionPerMass(s,this.p)<-1e-10,collides=!cp.taut&&Math.hypot(s[0],s[1],s[6])>this.p.L;
   if(!detaches&&!collides)return;
   let lo=0,hi=remaining;for(let k=0;k<36;k++){const mid=(lo+hi)/2;this.trial.set(this.start);this.rk(this.trial,mid,cp.taut);const crossed=detaches?tensionPerMass(this.trial,this.p)<0:Math.hypot(this.trial[0],this.trial[1],this.trial[6])>=this.p.L;if(crossed)hi=mid;else lo=mid;}
   s.set(this.start);this.rk(s,hi,cp.taut);remaining-=hi;
   if(detaches){cp.taut=false;continue;}
   const radial=(s[0]*s[2]+s[1]*s[3]+s[6]*s[7])/this.p.L,loss=.5*Math.max(0,radial)**2;project(s,this.p);s[4]+=loss;cp.impactLoss+=loss;cp.impacts++;cp.taut=tensionPerMass(s,this.p)>=0;
  }
 }
}
export function referenceStep(s:number[],dt:number,p:Physics):number[]{
 const f=(s:number[])=>{const r=[s[0],s[1],s[6]],v=[s[2],s[3],s[7]],F=v.map((v,i)=>-p.gamma*v-(i===2?p.g:0));for(const m of p.magnets){const d=[m.x-r[0],m.y-r[1],-p.L-p.h-r[2]],distance=Math.hypot(...d);for(let i=0;i<3;i++)F[i]+=m.k*d[i]/distance**3;}const radial=(r.reduce((a,x,i)=>a+x*F[i],0)+v.reduce((a,x)=>a+x*x,0))/p.L**2,a=F.map((x,i)=>x-radial*r[i]);return [v[0],v[1],a[0],a[1],p.gamma*v.reduce((a,x)=>a+x*x,0),Math.hypot(v[0],v[1]),v[2],a[2]];};
 const add=(a:number[],b:number[],k:number)=>a.map((x,i)=>x+k*b[i]);const a=f(s),b=f(add(s,a,dt/2)),c=f(add(s,b,dt/2)),d=f(add(s,c,dt)),out=new Float64Array(s.map((x,i)=>x+dt/6*(a[i]+2*b[i]+2*c[i]+d[i])));project(out,p);return Array.from(out);
}
export function initial(x:number,y:number,c:Config):Checkpoint {
 const z=releaseZ(x,y,c.physics),[vx,vy,vz]=c.velocityMode==='tangent'?tangentVelocity(x,y,z,c.meridionalSpeed??0,c.azimuthalSpeed??0,c.physics.L):[c.vx,c.vy,-(x*c.vx+y*c.vy)/z],s=new Float64Array([x,y,vx,vy,0,0,z,vz]),e0=.5*(vx*vx+vy*vy+vz*vz)+potential(x,y,c.physics,z);
 return {s,t:0,outcome:-1,candidate:-1,settling:0,convergence:NaN,e0,scale:Math.max(Math.abs(e0),c.physics.g/c.physics.L*.12**2,c.physics.magnets.reduce((a,m)=>a+m.k/c.physics.h,0),1e-6),maxResidual:0,reversals:0,signs:[0,0],pending:[0,0],persist:[0,0],taut:c.physics.constraint!=='string'||tensionPerMass(s,c.physics)>=0,impacts:0,impactLoss:0};
}
export function sample(cp:Checkpoint,p:Physics):Sample {const s=cp.s,k=.5*(s[2]**2+s[3]**2+s[7]**2),u=potential(s[0],s[1],p,s[6]),a=new Float64Array(8);derivative(s,p,a,cp.taut);return {t:cp.t,x:s[0],y:s[1],z:s[6],vx:s[2],vy:s[3],vz:s[7],speed:Math.sqrt(2*k),acceleration:Math.hypot(a[2],a[3],a[7]),kinetic:k,potential:u,energy:k+u,q:s[4],residual:(k+u+s[4]-cp.e0)/cp.scale,length:s[5],tension:cp.taut?p.mass*tensionPerMass(s,p):0,taut:cp.taut?1:0,impacts:cp.impacts,impactLoss:cp.impactLoss};}
export function advance(cp:Checkpoint,c:Config,eq:Equilibrium[],integrator:Integrator,target:number,budget=Infinity,stopAtCapture=true){
 let steps=0;
 while(cp.t<target-1e-11&&cp.outcome!==-2&&(!stopAtCapture||cp.outcome<0)&&steps++<budget){
  const dt=Math.min(c.dt,target-cp.t);try{integrator.step(cp.s,dt,cp);}catch{cp.outcome=-2;break;}cp.t+=dt;
  if(!cp.s.every(Number.isFinite)||Math.hypot(cp.s[0],cp.s[1])>1e8){cp.outcome=-2;break;}
  const s=cp.s,residual=Math.abs((.5*(s[2]*s[2]+s[3]*s[3]+s[7]*s[7])+potential(s[0],s[1],c.physics,s[6])+s[4]-cp.e0)/cp.scale);cp.maxResidual=Math.max(cp.maxResidual,residual);
  // Component reversal: |v| > .01 m/s, opposite sign sustained for .04 s.
  for(let j=0;j<2;j++){const v=cp.s[j+2],sign=Math.abs(v)>.01?Math.sign(v):0;if(!sign){cp.persist[j]=0;continue;}if(!cp.signs[j])cp.signs[j]=sign;if(sign!==cp.signs[j]){if(cp.pending[j]!==sign)cp.persist[j]=0;cp.pending[j]=sign;cp.persist[j]+=dt;if(cp.persist[j]>=.04){cp.reversals++;cp.signs[j]=sign;cp.persist[j]=0;}}else cp.persist[j]=0;}
  if(cp.outcome>=0)continue;
  const acceleration=integrator.scratch[4];derivative(cp.s,c.physics,acceleration,cp.taut);const speed=Math.hypot(cp.s[2],cp.s[3],cp.s[7]),acc=Math.hypot(acceleration[2],acceleration[3],acceleration[7]);
  let candidate=-1;if(cp.taut&&c.physics.gamma>0&&speed<c.criteria.speed&&acc<c.criteria.acceleration){for(let j=0;j<eq.length;j++){const e=eq[j];if(e.stable&&Math.hypot(cp.s[0]-e.x,cp.s[1]-e.y,cp.s[6]-releaseZ(e.x,e.y,c.physics))<c.criteria.radius){candidate=j;break;}}}
  if(candidate>=0){cp.settling=cp.candidate===candidate?cp.settling+dt:dt;cp.candidate=candidate;if(cp.settling>=c.criteria.settle){cp.outcome=candidate;cp.convergence=cp.t;}}else{cp.candidate=-1;cp.settling=0;}
 }
 return cp;
}
export function simulate(x:number,y:number,c:Config,eq=equilibria(c.physics).filter(e=>e.stable),cp=initial(x,y,c)){return advance(cp,c,eq,new Integrator(c.physics),c.duration);}
export function coordinate(index:number,n:number,b:Bounds):[number,number]{const col=index%n,row=Math.floor(index/n);return [b.xmin+(col+.5)*(b.xmax-b.xmin)/n,b.ymax-(row+.5)*(b.ymax-b.ymin)/n];}
export function pixel(x:number,y:number,n:number,b:Bounds){return Math.max(0,Math.min(n-1,Math.floor((b.ymax-y)/(b.ymax-b.ymin)*n)))*n+Math.max(0,Math.min(n-1,Math.floor((x-b.xmin)/(b.xmax-b.xmin)*n)));}
export function compatibleKey(c:Config){return JSON.stringify({model:MODEL_VERSION,physics:{...c.physics,magnets:c.physics.magnets.map(({color,...physical})=>physical)},criteria:c.criteria,dt:c.dt,vx:c.vx,vy:c.vy,velocityMode:c.velocityMode,meridionalSpeed:c.meridionalSpeed,azimuthalSpeed:c.azimuthalSpeed,n:c.n,bounds:c.bounds});}
export function phaseDistance(a:Float64Array,b:Float64Array,p:Physics){const tau=Math.sqrt(p.L/Math.max(p.g,1e-6));return Math.hypot(a[0]-b[0],a[1]-b[1],a[6]-b[6],tau*(a[2]-b[2]),tau*(a[3]-b[3]),tau*(a[7]-b[7]));}


