export type State = [number, number, number, number];
export type Params = {l1:number;l2:number;m1:number;m2:number;g:number};
export const defaults: Params = {l1:1,l2:1,m1:1,m2:1,g:9.81};
export const rad=(d:number)=>d*Math.PI/180;
export const deg=(r:number)=>r*180/Math.PI;
export const wrap=(r:number)=>((r+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
// Euler–Lagrange mass matrix, angles absolute and measured from downward vertical.
export function derivative(s:State,p:Params):State {
 const [a,b,u,v]=s, d=a-b, c=Math.cos(d), sn=Math.sin(d);
 const A=(p.m1+p.m2)*p.l1*p.l1, B=p.m2*p.l1*p.l2*c, D=p.m2*p.l2*p.l2;
 const f=-p.m2*p.l1*p.l2*sn*v*v-(p.m1+p.m2)*p.g*p.l1*Math.sin(a);
 const h=p.m2*p.l1*p.l2*sn*u*u-p.m2*p.g*p.l2*Math.sin(b), det=A*D-B*B;
 return [u,v,(D*f-B*h)/det,(A*h-B*f)/det];
}
export function rk4(s:State,dt:number,p:Params=defaults):State {
 const a=derivative(s,p), add=(k:State,f:number)=>s.map((v,i)=>v+dt*f*k[i]) as State;
 const b=derivative(add(a,.5),p), c=derivative(add(b,.5),p), d=derivative(add(c,1),p);
 return s.map((v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6) as State;
}
// One stepper per worker; reusable Float64 scratch avoids allocations in the hot loop.
// rk4 remains the readable reference implementation and regression oracle.
export function createRK4Stepper(p:Params,dt:number){
 const A=(p.m1+p.m2)*p.l1*p.l1,C=p.m2*p.l1*p.l2,D=p.m2*p.l2*p.l2;
 const G1=(p.m1+p.m2)*p.g*p.l1,G2=p.m2*p.g*p.l2,k=new Float64Array(16);
 function stage(a:number,b:number,u:number,v:number,o:number){
  const sn=Math.sin(a-b),B=C*Math.cos(a-b),f=-C*sn*v*v-G1*Math.sin(a),h=C*sn*u*u-G2*Math.sin(b),det=A*D-B*B;
  k[o]=u;k[o+1]=v;k[o+2]=(D*f-B*h)/det;k[o+3]=(A*h-B*f)/det;
 }
 return (s:Float64Array|State,o=0)=>{
  const a=s[o],b=s[o+1],u=s[o+2],v=s[o+3],half=dt*.5;
  stage(a,b,u,v,0);
  stage(a+half*k[0],b+half*k[1],u+half*k[2],v+half*k[3],4);
  stage(a+half*k[4],b+half*k[5],u+half*k[6],v+half*k[7],8);
  stage(a+dt*k[8],b+dt*k[9],u+dt*k[10],v+dt*k[11],12);
  s[o]=a+dt*(k[0]+2*k[4]+2*k[8]+k[12])/6;
  s[o+1]=b+dt*(k[1]+2*k[5]+2*k[9]+k[13])/6;
  s[o+2]=u+dt*(k[2]+2*k[6]+2*k[10]+k[14])/6;
  s[o+3]=v+dt*(k[3]+2*k[7]+2*k[11]+k[15])/6;
 };
}
export function energy(s:State,p:Params=defaults) {
 const [a,b,u,v]=s;
 const kinetic=.5*(p.m1+p.m2)*p.l1*p.l1*u*u+.5*p.m2*p.l2*p.l2*v*v+p.m2*p.l1*p.l2*u*v*Math.cos(a-b);
 const potential=-(p.m1+p.m2)*p.g*p.l1*Math.cos(a)-p.m2*p.g*p.l2*Math.cos(b);
 return {kinetic,potential,total:kinetic+potential};
}
export function geometry(s:State,p:Params=defaults){const x=p.l1*Math.sin(s[0]),y=p.l1*Math.cos(s[0]);return [x,y,x+p.l2*Math.sin(s[1]),y+p.l2*Math.cos(s[1])];}
export type Bounds={x0:number;x1:number;y0:number;y1:number};
export const fullBounds:Bounds={x0:-180,x1:180,y0:-180,y1:180};
// Pixel centres sample the interior; top is positive theta2, as in Cartesian axes.
export function anglesAt(x:number,y:number,n:number,b:Bounds):State{return [rad(b.x0+(x+.5)/n*(b.x1-b.x0)),rad(b.y1-(y+.5)/n*(b.y1-b.y0)),0,0];}
export function flipCrossing(a:State,b:State,dt:number):number|null {
 let f=Infinity;
 for(let i=0;i<2;i++){
  if(Math.abs(a[i])>Math.PI) return 0;
  if(b[i]>Math.PI&&a[i]<=Math.PI) f=Math.min(f,(Math.PI-a[i])/(b[i]-a[i]));
  if(b[i]<-Math.PI&&a[i]>=-Math.PI) f=Math.min(f,(-Math.PI-a[i])/(b[i]-a[i]));
 }
 return isFinite(f)?Math.max(0,Math.min(1,f))*dt:null;
}
export function energyDrift(s:State,initial:State,p:Params){return 100*(energy(s,p).total-energy(initial,p).total)/Math.max(Math.abs(energy(initial,p).total),(p.m1+p.m2)*p.g*p.l1+p.m2*p.g*p.l2,1e-10);}
