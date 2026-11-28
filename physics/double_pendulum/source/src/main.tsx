import React,{useEffect,useRef,useState,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {defaults,rad,deg,wrap,rk4,createRK4Stepper,energy,energyDrift,geometry,anglesAt,fullBounds,flipCrossing,type State,type Params,type Bounds} from './physics';
import {rgb,flipRGB,growthRGB,driftRGB,flipScale} from './palette';
import {AccuracyPanel} from './AccuracyPanel';
import {exportFigure,modeNames} from './export-map';
import {saveExperiment,listExperiments,loadExperiment,deleteExperiment,serialiseExperiment,parseExperiment,type Experiment,type ExperimentSummary} from './experiments';
import type {MapJob} from './map-types';
import {energyBarrier} from './energy-barrier';
import {MapPool} from './map-pool';
import {colourMap} from './map-colours';
import {angleFields,parseAngleFields,sameBounds,setupChanged,makeMapRun,visibleRegion,viewPoint,inspectPoint,type AngleFields,type MapRun} from './map-workspace';
import './style.css';
type Sample={t:number;s:State;k:number;v:number;e:number};
const modes=modeNames;
const descriptions=['Watch almost identical beginnings become different futures.','Follow the motion through angle space and conserved energy.','One field. Sixteen hundred independent experiments.','Explore the evolving landscape of initial conditions.','Discover the time hidden between release and first inversion.','Measure finite-time separation of nearby starts, independently of flips.'];
const fmt=(x:number,d=2)=>Number.isFinite(x)?x.toFixed(d):'—';
const axisFmt=(x:number,span:number)=>Number(x.toFixed(Math.min(12,Math.max(2,Math.ceil(-Math.log10(span))+2)))).toString();
function downloadBlob(name:string,blob:Blob){const url=URL.createObjectURL(blob);download(name,url);setTimeout(()=>URL.revokeObjectURL(url),1000);}
const cssRGB=(c:number[])=>`rgb(${c.join(',')})`;
const defaultRelease={p:defaults,dt:.004,duration:30};
const speedOptions=[.1,.25,.5,1,2,4];
const presets:Record<string,[number,number]>={regular:[8,12],large:[100,-20],sensitive:[170,170],opposing:[25,-25]};
const presetLabels=['Small-angle / regular','Large amplitude','Near inverted / sensitive','Opposing angles'];
const modeResolutions=(m:number)=>m===2?[10,20,40,100]:[40,100,250,500];
function SpeedControl({speed,onChange,label='Playback speed'}:{speed:number;onChange:(v:number)=>void;label?:string}){return <label>{label}<select value={speed} onChange={e=>onChange(+e.target.value)}>{speedOptions.map(v=><option key={v} value={v}>{v}×</option>)}</select></label>;}
function ReleaseControls({initial,onRelease}:{initial:State;onRelease:(a:number,b:number)=>void}){
 const [a,setA]=useState(String(deg(initial[0]))),[b,setB]=useState(String(deg(initial[1])));
 useEffect(()=>{setA(String(+deg(initial[0]).toFixed(8)));setB(String(+deg(initial[1]).toFixed(8)));},[initial]);
 return <form className="release-controls" onSubmit={e=>{e.preventDefault();onRelease(+a,+b);}}><div className="range-pair"><label>Release θ₁ (°)<input type="number" min="-180" max="180" step="any" required value={a} onChange={e=>setA(e.target.value)}/></label><label>Release θ₂ (°)<input type="number" min="-180" max="180" step="any" required value={b} onChange={e=>setB(e.target.value)}/></label></div><div className="release-actions"><select aria-label="Trajectory release preset" value="" onChange={e=>{const q=presets[e.target.value];if(q)onRelease(...q);}}><option disabled value="">Release preset…</option>{Object.keys(presets).map((key,i)=><option key={key} value={key}>{presetLabels[i]}</option>)}</select><button type="submit">Set release</button></div></form>;
}
function download(name:string,data:string){const a=document.createElement('a');a.href=data;a.download=name;a.click();}
function rod(ctx:CanvasRenderingContext2D,s:State,p:Params,x:number,y:number,scale:number,color:string,alpha=1){const [a,b,c,d]=geometry(s,p);ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+a*scale,y+b*scale);ctx.lineTo(x+c*scale,y+d*scale);ctx.stroke();ctx.fillStyle=color;for(const [xx,yy]of [[a,b],[c,d]]){ctx.beginPath();ctx.arc(x+xx*scale,y+yy*scale,Math.max(1.2,scale*.035),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
function Plot({samples,kind,wrapped=false}:{samples:Sample[];kind:string;wrapped?:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=ref.current!;const ctx=c.getContext('2d')!,w=c.width,h=c.height;ctx.clearRect(0,0,w,h);const pad=26;
 ctx.strokeStyle='#243042';ctx.lineWidth=1;ctx.font='10px monospace';ctx.fillStyle='#8190a5';
 for(let i=0;i<5;i++){const y=12+i*(h-36)/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-8,y);ctx.stroke();}
 if(samples.length<2)return;
 const angle=(x:number)=>deg(wrapped?wrap(x):x);
 const data=kind==='trajectory'?[samples.map(v=>[angle(v.s[0]),angle(v.s[1])])]:kind==='energy'?[samples.map(v=>[v.t,v.k]),samples.map(v=>[v.t,v.v]),samples.map(v=>[v.t,v.e])]:[samples.map(v=>[v.t,angle(v.s[0])]),samples.map(v=>[v.t,angle(v.s[1])])];
 const all=data.flat(),xs=all.map(v=>v[0]),ys=all.map(v=>v[1]);let loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
 if(kind==='trajectory'&&wrapped){loX=loY=-180;hiX=hiY=180;}if(hiY-loY<1e-5){loY-=1;hiY+=1;}
 ctx.fillText(fmt(hiY,0),0,16);ctx.fillText(fmt(loY,0),0,h-22);ctx.fillText(fmt(loX,1),pad,h-3);ctx.fillText(fmt(hiX,1),w-42,h-3);
 data.forEach((line,j)=>{ctx.strokeStyle=['#65e6cd','#b19aff','#f8ce78'][j];ctx.lineWidth=1.5;ctx.beginPath();line.forEach((v,i)=>{const x=pad+(v[0]-loX)/Math.max(hiX-loX,1e-9)*(w-pad-10),y=12+(hiY-v[1])/(hiY-loY)*(h-36);const prev=line[i-1];if(!i||(wrapped&&prev&&(Math.abs(v[1]-prev[1])>180||(kind==='trajectory'&&Math.abs(v[0]-prev[0])>180))))ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();});
 },[samples,kind,wrapped]);return <canvas ref={ref} width={330} height={kind==='trajectory'?190:132} className="plot"/>;
}
function App(){
 const [mode,setMode]=useState(3),[mapRunning,setMapRunning]=useState(false),[trajectoryRunning,setTrajectoryRunning]=useState(false),[a1,setA1]=useState(120),[a2,setA2]=useState(-20),[mapP,setMapP]=useState<Params>(defaults),[mapDt,setMapDt]=useState(.004),[speed,setSpeed]=useState(1),[mapDuration,setMapDuration]=useState(30),[resolution,setResolution]=useState(40),[palette,setPalette]=useState('Spectrum'),[count,setCount]=useState(50),[delta,setDelta]=useState(.01),[offset,setOffset]=useState(false),[trails,setTrails]=useState(true),[wrapped,setWrapped]=useState(true),[traceDuration,setTraceDuration]=useState(15),[help,setHelp]=useState(false),[bounds,setBounds]=useState<Bounds>(fullBounds),[revision,setRevision]=useState(0),[time,setTime]=useState(0),[progress,setProgress]=useState(0),[selected,setSelected]=useState<State>([rad(120),rad(-20),0,0]),[inspect,setInspect]=useState<State>(selected),[samples,setSamples]=useState<Sample[]>([]),[cursor,setCursor]=useState('Move over the field to inspect angles'),[interaction,setInteraction]=useState('inspect'),[recorded,setRecorded]=useState<number|null>(null),[error,setError]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null),detail=useRef<HTMLCanvasElement>(null),worker=useRef<MapPool|null>(null),image=useRef<HTMLCanvasElement|null>(null),grid=useRef<Float64Array|null>(null),flipTimes=useRef<Float64Array|null>(null),t=useRef(0),states=useRef<State[]>([]),current=useRef<State>(selected),history=useRef<Sample[]>([]),paths=useRef<number[][][]>([]),acc=useRef(0),lastSample=useRef(-1),startDrag=useRef<{x:number;y:number;px:number;py:number}|null>(null),selectionBox=useRef<{x:number;y:number;w:number;h:number}|null>(null),actualFlip=useRef<number|null>(null);
 const selectedIndex=useRef<number|null>(null);
 const [run,setRun]=useState<MapRun|null>(null),[mapReady,setMapReady]=useState(false),[trajectoryTime,setTrajectoryTime]=useState(0),[trajectorySpeed,setTrajectorySpeed]=useState(1);
 const [releaseJob,setReleaseJob]=useState<Pick<MapJob,'p'|'dt'|'duration'>>(defaultRelease);
 const [motionP,setMotionP]=useState<Params>(defaults),[motionDt,setMotionDt]=useState(.004),[motionDuration,setMotionDuration]=useState(30);
 const resolutionByMode=useRef<Record<number,number>>({});
 const [rangeFields,setRangeFields]=useState<AngleFields|null>(null),[durationField,setDurationField]=useState<string|null>(null);
 const [mapTool,setMapTool]=useState<'view'|'analysis'|'investigation'|null>(null),[trajectoryTab,setTrajectoryTab]=useState<'overview'|'diagnostics'|'validation'>('overview');
 const isMap=mode>=2,applied=run?.job??null,displayMode=applied?.mode??mode;
 const p=isMap?mapP:motionP,setP=isMap?setMapP:setMotionP,dt=isMap?mapDt:motionDt,setDt=isMap?setMapDt:setMotionDt,duration=isMap?mapDuration:motionDuration,setDuration=isMap?setMapDuration:setMotionDuration;
 const running=isMap?mapRunning:trajectoryRunning,displayTime=isMap?time:trajectoryTime;
 const displayDuration=isMap?(applied?.duration??duration):duration;
 const trajectoryP=isMap?releaseJob.p:p,trajectoryDt=isMap?releaseJob.dt:dt;
 const trajectoryDuration=isMap?releaseJob.duration:duration;
 const [perturbation,setPerturbation]=useState(1e-7),[showDrift,setShowDrift]=useState(false),[mapStats,setMapStats]=useState({maxDrift:0,badCells:0}),[tileStatus,setTileStatus]=useState('');
 const draft:MapJob={mode,n:resolution,bounds,p:mapP,dt:mapDt,duration:mapDuration,palette,perturbation};
 const validRange=!rangeFields||!!parseAngleFields(rangeFields);
 const validDuration=durationField===null||(durationField.trim()!==''&&Number.isInteger(+durationField)&&+durationField>=1&&+durationField<=3600);
 const rangePending=!!applied&&!sameBounds(applied.bounds,bounds),settingsPending=!!applied&&setupChanged(applied,draft);
 const pending=rangePending||settingsPending||!validRange||!validDuration;
 const mapComplete=mapReady&&!!applied&&time>=applied.duration-applied.dt*1e-6;

 const [savedList,setSavedList]=useState<ExperimentSummary[]>([]),[savedId,setSavedId]=useState(''),[saveName,setSaveName]=useState('My experiment'),[storageStatus,setStorageStatus]=useState(''),[selectedGrowth,setSelectedGrowth]=useState<number|null>(null),[selectedDrift,setSelectedDrift]=useState<number|null>(null);
 const activeJob=useRef<MapJob|null>(null),rawPixels=useRef<Uint8ClampedArray|null>(null),mapDrift=useRef<Float64Array|null>(null),mapGrowth=useRef<Float64Array|null>(null),saveClock=useRef(0),autoSaving=useRef(false),driftView=useRef(false),selectedRef=useRef<State>(selected);
 const viewRef=useRef({speed,showDrift,wrapped,traceDuration});viewRef.current={speed,showDrift,wrapped,traceDuration};const paletteRef=useRef(palette),pixelPalette=useRef('');paletteRef.current=palette;driftView.current=showDrift;selectedRef.current=selected;
 useEffect(()=>{listExperiments().then(setSavedList).catch(e=>setStorageStatus(String(e)));},[]);
 function refreshSaved(){return listExperiments().then(setSavedList);}
 function setRelease(a:number,b:number){
  if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>180||Math.abs(b)>180)return;
  clearPixel();
  if(!isMap){setA1(a);setA2(b);setRevision(v=>v+1);return;}
  setReleaseJob(applied??defaultRelease);setSelected([rad(a),rad(b),0,0]);setTrajectoryRunning(false);
 }
 function clearPixel(){selectedIndex.current=null;setSelectedGrowth(null);setSelectedDrift(null);setRecorded(null);fieldDirty.current=true;}
 function navigate(next:Bounds){setBounds(next);if(validRange)setRangeFields(null);fieldDirty.current=true;}
 function editRange(k:keyof Bounds,value:string){const fields={...(rangeFields??angleFields(bounds)),[k]:value};setRangeFields(fields);const next=parseAngleFields(fields);if(next){setBounds(next);fieldDirty.current=true;}}
 function changeMode(next:number){
  if(next===mode)return;
  if(isMap)resolutionByMode.current[mode]=resolution;
  if(next<2&&isMap)setMapRunning(false);
  if(next>=2&&!isMap){setTrajectoryRunning(false);clearPixel();setReleaseJob(applied??defaultRelease);setSelected([rad(a1),rad(a2),0,0]);}
  if(next>=2)setResolution(resolutionByMode.current[next]??(modeResolutions(next).includes(resolution)?resolution:40));
  setMode(next);if(next===1)setTrajectoryTab('diagnostics');fieldDirty.current=true;
 }
 function recalculate(){if(!isMap||!validRange||!validDuration)return;clearPixel();setMapReady(false);setRun(makeMapRun(draft));setMapRunning(true);}
 function restoreExperiment(e:Experiment){const j=e.job;setMode(j.mode);setMapP(j.p);setBounds(j.bounds);setRangeFields(null);setMapDt(j.dt);setMapDuration(j.duration);setDurationField(null);setResolution(j.n);setPalette(j.palette);setPerturbation(j.perturbation??1e-7);if(e.view){setSpeed(e.view.speed);setShowDrift(e.view.showDrift);setWrapped(e.view.wrapped);setTraceDuration(e.view.traceDuration);}clearPixel();setSelected(e.selected?.length===4?e.selected as State:[rad(a1),rad(a2),0,0]);setReleaseJob(j);setTrajectoryRunning(false);setMapReady(false);setRun(makeMapRun(j,e.checkpoint));setMapRunning(false);setStorageStatus(`Restored ${e.name} at ${fmt(e.checkpoint.time)} s. Map paused.`);fieldDirty.current=true;}
 async function persist(w:MapPool,j:MapJob,name:string,id:string){const savedAt=Date.now(),checkpoint=await w.getSnapshot();const e:Experiment={version:3,id,name:name.slice(0,120),savedAt,job:{...j},checkpoint,selected:[...selectedRef.current],view:{...viewRef.current}};await saveExperiment(e);await refreshSaved();setStorageStatus(`${id==='autosave'?'Autosaved':'Saved'} ${e.name} at ${fmt(checkpoint.time)} s.`);return e;}
 async function saveCurrent(){if(!worker.current||!activeJob.current)return;try{await persist(worker.current,activeJob.current,saveName||'Experiment',`saved-${Date.now()}`);}catch(e){setStorageStatus(String(e));}}
 async function downloadCurrent(){if(!worker.current||!activeJob.current)return;try{const e:Experiment={version:3,id:`file-${Date.now()}`,name:saveName||'Experiment',savedAt:Date.now(),job:{...activeJob.current},checkpoint:await worker.current.getSnapshot(),selected:[...selectedRef.current],view:{...viewRef.current}};downloadBlob('chaos-experiment.json',new Blob([serialiseExperiment(e)],{type:'application/json'}));}catch(e){setStorageStatus(String(e));}}
 function paintField(){if(!rawPixels.current||!image.current||!activeJob.current)return;const job={...activeJob.current,palette:paletteRef.current};const pixels=!driftView.current&&pixelPalette.current===paletteRef.current?new Uint8ClampedArray(rawPixels.current):colourMap(job,{states:grid.current,flips:flipTimes.current,growth:mapGrowth.current,peakDrift:mapDrift.current},driftView.current);image.current.getContext('2d')!.putImageData(new ImageData(pixels,job.n,job.n),0,0);fieldDirty.current=true;}
 useEffect(()=>{paintField();},[showDrift,palette]);
 function exportPNG(){const job=activeJob.current;if(isMap){if(!job||!mapReady)return;const output=document.createElement('canvas');output.width=output.height=800;const ctx=output.getContext('2d')!;ctx.fillStyle='#0d1420';ctx.fillRect(0,0,800,800);drawMap(ctx,job,job.bounds,800,800);const figure=exportFigure(output,{...job,palette:paletteRef.current},t.current,showDrift,mapStats.maxDrift);download('chaos-lab-annotated.png',figure.toDataURL());}else if(canvas.current){draw();download('chaos-lab.png',canvas.current.toDataURL());}}
 function exportMapCSV(){if(!activeJob.current||!mapReady)return;const j=activeJob.current,rows=['initial_theta1_deg,initial_theta2_deg,first_flip_s,log10_separation_growth,peak_energy_drift_percent,energy_forbids_flip_all_time'];for(let y=0;y<j.n;y++)for(let x=0;x<j.n;x++){const a=anglesAt(x,y,j.n,j.bounds),i=y*j.n+x;rows.push([deg(a[0]),deg(a[1]),flipTimes.current?.[i]??'',mapGrowth.current?.[i]??'',mapDrift.current?.[i]??'',j.mode===4?energyBarrier(a,j.p).neitherCanFlip:''].join(','));}downloadBlob('map-results.csv',new Blob([`# computed_time_s=${t.current}; dt_s=${j.dt}; duration_s=${j.duration}; resolution=${j.n}; mode=${modes[j.mode]}; bounds=${JSON.stringify(j.bounds)}; physics=${JSON.stringify(j.p)}; no recorded flip=-1
`+rows.join('\n')],{type:'text/csv'}));}

 const fieldDirty=useRef(true);
 const [engineInfo,setEngineInfo]=useState('Starting calculation engine…');
 const fastStep=useMemo(()=>createRK4Stepper(p,dt),[p,dt]);
 const inspectTime=useRef(0);
 function resetMotion(){setRevision(v=>v+1);}
 // A new map worker is created only when recalculate() or restoreExperiment() replaces run.
 useEffect(()=>{
  if(!run)return;
  const job:MapJob={...run.job,palette:paletteRef.current};
  const w=new MapPool();worker.current=w;activeJob.current=job;
  image.current=null;grid.current=null;flipTimes.current=null;rawPixels.current=null;mapDrift.current=null;mapGrowth.current=null;
  setMapReady(false);setTime(0);setProgress(0);setMapStats({maxDrift:0,badCells:0});setTileStatus('');setError('');setEngineInfo('Preparing map…');t.current=0;fieldDirty.current=true;saveClock.current=Date.now();
  const autosave=()=>{if(autoSaving.current)return;autoSaving.current=true;void persist(w,job,'Autosave','autosave').catch(e=>setStorageStatus(`Autosave unavailable: ${String(e)}`)).finally(()=>{autoSaving.current=false;});};
  w.onprogress=(done,total)=>setTileStatus(`${done}/${total} tiles in current batch`);
  w.onerror=e=>{setError(e.message||'Worker calculation failed');setMapRunning(false);};
  w.onmessage=e=>{const m=e.data;if(m.type==='done'){setMapRunning(false);autosave();return;}if(m.type!=='frame')return;
   if(!image.current){image.current=document.createElement('canvas');image.current.width=image.current.height=job.n;}
   rawPixels.current=m.pixels;pixelPalette.current=m.palette??'';grid.current=m.states??null;flipTimes.current=m.flips??null;mapDrift.current=m.peakDrift??null;mapGrowth.current=m.growth??null;
   setMapStats({maxDrift:m.maxDrift??0,badCells:m.badCells??0});paintField();
   const index=selectedIndex.current;if(index!==null){setSelectedDrift(m.peakDrift?.[index]??null);setSelectedGrowth(m.growth?.[index]??null);setRecorded(m.flips?.[index]??null);}
   setMapReady(true);setEngineInfo(`${m.workers} CPU worker${m.workers===1?'':'s'} · ${m.cacheStatus}`);t.current=m.time;setTime(m.time);setProgress(m.progress);
   if(Date.now()-saveClock.current>15000){saveClock.current=Date.now();autosave();}
  };
  w.postMessage({type:'init',job,resume:run.resume});
  if(run.play)w.postMessage({type:'play',speed});
  return ()=>{w.terminate();worker.current=null;};
 },[run]);
 useEffect(()=>{worker.current?.postMessage({type:mapRunning?'play':'pause',speed});},[mapRunning,speed]);
 useEffect(()=>{if(activeJob.current)activeJob.current.palette=palette;worker.current?.postMessage({type:'palette',palette});},[palette]);
 useEffect(()=>{fieldDirty.current=true;},[bounds,mode]);
 useEffect(()=>{
  if(isMap)return;
  const initial:State=[rad(a1),rad(a2),0,0];setSelected(initial);states.current=Array.from({length:mode===0?count:1},(_,i)=>[initial[0]+rad(i*delta),initial[1],0,0]);paths.current=[];setTrajectoryRunning(true);
 },[isMap,mode,revision,a1,a2,p,dt,count,delta]);
 useEffect(()=>{fieldDirty.current=true;current.current=[...selected];setInspect([...selected]);inspectTime.current=0;setTrajectoryTime(0);acc.current=0;history.current=[];setSamples([]);lastSample.current=-1;actualFlip.current=null;},[selected]);
 function advanceSingle(h:number){
  if(!isMap){states.current.forEach(s=>fastStep(s));current.current=states.current[0]??current.current;}
  else {const before=current.current,next=rk4(before,h,trajectoryP);if(actualFlip.current===null){const f=flipCrossing(before,next,h);if(f!==null)actualFlip.current=inspectTime.current+f;}current.current=next;}
  inspectTime.current+=h;
 }
 function addSample(){const clock=inspectTime.current;if(clock-lastSample.current<.035)return;lastSample.current=clock;const s=[...current.current] as State,e=energy(s,trajectoryP);history.current.push({t:clock,s,k:e.kinetic,v:e.potential,e:e.total});history.current=history.current.filter(v=>v.t>=clock-traceDuration).slice(-1800);}
 useEffect(()=>{
 let raf=0,last=performance.now(),ui=0,lastUiClock=-1;
 const frame=(now:number)=>{let elapsed=Math.min((now-last)/1000,.1);last=now;
  if(trajectoryRunning){acc.current+=elapsed*trajectorySpeed;let steps=0;while(acc.current>=trajectoryDt&&steps++<300){if(inspectTime.current>=trajectoryDuration-trajectoryDt*1e-6){setTrajectoryRunning(false);break;}advanceSingle(trajectoryDt);acc.current-=trajectoryDt;addSample();}}
  if(now-ui>80&&inspectTime.current!==lastUiClock){ui=now;lastUiClock=inspectTime.current;setInspect([...current.current]);setSamples([...history.current]);setTrajectoryTime(inspectTime.current);}
  draw();raf=requestAnimationFrame(frame);
 };raf=requestAnimationFrame(frame);return ()=>cancelAnimationFrame(raf);
 },[trajectoryRunning,isMap,mode,trajectorySpeed,trajectoryDt,trajectoryP,trajectoryDuration,trails,offset,palette,selected,traceDuration,bounds,count,run]);
 function drawMap(ctx:CanvasRenderingContext2D,job:MapJob,view:Bounds,w:number,h:number){
  const source=image.current,coverage=visibleRegion(job.bounds,view);if(!source||!coverage)return;
  if(job.mode===2&&grid.current&&!driftView.current){
   const b=job.bounds,n=job.n,cw=(b.x1-b.x0)/n*w/(view.x1-view.x0),ch=(b.y1-b.y0)/n*h/(view.y1-view.y0),x0=(b.x0-view.x0)*w/(view.x1-view.x0),y0=(view.y1-b.y1)*h/(view.y1-view.y0),scale=Math.min(cw,ch)*.42/(job.p.l1+job.p.l2);
   ctx.save();ctx.beginPath();ctx.rect(coverage.dx*w,coverage.dy*h,coverage.dw*w,coverage.dh*h);ctx.clip();
   const minX=Math.max(0,Math.floor(coverage.sx*n)),minY=Math.max(0,Math.floor(coverage.sy*n)),endX=Math.min(n,Math.ceil((coverage.sx+coverage.sw)*n)),endY=Math.min(n,Math.ceil((coverage.sy+coverage.sh)*n));
   for(let y=minY;y<endY;y++)for(let x=minX;x<endX;x++){const i=(y*n+x)*4,s=Array.from(grid.current.subarray(i,i+4)) as State;rod(ctx,s,job.p,x0+(x+.5)*cw,y0+(y+.5)*ch,scale,cssRGB(rgb(s[0],s[1],paletteRef.current)));}ctx.restore();
  }else{ctx.imageSmoothingEnabled=false;ctx.drawImage(source,coverage.sx*source.width,coverage.sy*source.height,coverage.sw*source.width,coverage.sh*source.height,coverage.dx*w,coverage.dy*h,coverage.dw*w,coverage.dh*h);}
 }
 function draw(){
  const c=canvas.current;if(!c)return;const ctx=c.getContext('2d')!,w=c.width,h=c.height;
  if(!isMap||fieldDirty.current||selectionBox.current){
  ctx.fillStyle='#0d1420';ctx.fillRect(0,0,w,h);
  if(isMap){const job=activeJob.current;if(job)drawMap(ctx,job,bounds,w,h);}
  else {
   ctx.strokeStyle='#1b2636';ctx.lineWidth=1;for(let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
   const columns=offset&&mode===0?Math.ceil(Math.sqrt(count)):1,cell=w/columns,scale=cell*.21/(p.l1+p.l2)*2;
   states.current.forEach((s,i)=>{const x=columns===1?w/2:(i%columns+.5)*cell,y=columns===1?h/2:(Math.floor(i/columns)+.5)*cell;const color=mode===1?'#65e6cd':`hsl(${165+i/Math.max(count-1,1)*160} 80% 70%)`;
    if(trails&&columns===1){const g=geometry(s,p);if(!paths.current[i])paths.current[i]=[];const path=paths.current[i];if(trajectoryRunning||!path.length)path.push([x+g[2]*scale,y+g[3]*scale]);if(path.length>240)path.shift();ctx.strokeStyle=color;ctx.globalAlpha=.25;ctx.lineWidth=1;ctx.beginPath();path.forEach((pt,j)=>j?ctx.lineTo(pt[0],pt[1]):ctx.moveTo(pt[0],pt[1]));ctx.stroke();ctx.globalAlpha=1;}
    rod(ctx,s,p,x,y,scale,color,columns===1&&count>100?.25:.8);
   });ctx.fillStyle='#b1bfd3';ctx.beginPath();ctx.arc(w/2,h/2,3,0,Math.PI*2);ctx.fill();
  }
  if(isMap&&selectedIndex.current!==null){const sx=(deg(selected[0])-bounds.x0)/(bounds.x1-bounds.x0)*w,sy=(bounds.y1-deg(selected[1]))/(bounds.y1-bounds.y0)*h;ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.beginPath();ctx.arc(sx,sy,7,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
  const box=selectionBox.current;if(box){ctx.fillStyle='#ffffff22';ctx.fillRect(box.x,box.y,box.w,box.h);ctx.strokeStyle='#fff';ctx.strokeRect(box.x,box.y,box.w,box.h);}
  fieldDirty.current=false;}
  const d=detail.current;if(d){const dc=d.getContext('2d')!;dc.clearRect(0,0,d.width,d.height);dc.strokeStyle='#243042';dc.setLineDash([3,4]);dc.beginPath();dc.moveTo(d.width/2,12);dc.lineTo(d.width/2,d.height-10);dc.stroke();dc.setLineDash([]);rod(dc,current.current,trajectoryP,d.width/2,d.height/2,d.height*.21/(trajectoryP.l1+trajectoryP.l2)*2,'#70e7ce');dc.fillStyle='#dce6f3';dc.beginPath();dc.arc(d.width/2,d.height/2,3,0,Math.PI*2);dc.fill();}
 }
 function stepMotion(){setTrajectoryRunning(false);for(let i=0;i<Math.round(.04/trajectoryDt)&&inspectTime.current<trajectoryDuration-trajectoryDt*1e-6;i++){advanceSingle(trajectoryDt);addSample();}setTrajectoryTime(inspectTime.current);setInspect([...current.current]);setSamples([...history.current]);draw();}
 function replay(){if(!isMap){resetMotion();return;}setSelected([...selected]);setTrajectoryRunning(true);}
 function toggleTrajectory(){if(!trajectoryRunning&&inspectTime.current>=trajectoryDuration-trajectoryDt*1e-6)replay();else setTrajectoryRunning(v=>!v);}
 function xy(e:React.PointerEvent<HTMLCanvasElement>){const r=e.currentTarget.getBoundingClientRect();return {x:Math.min(.999999,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(.999999,Math.max(0,(e.clientY-r.top)/r.height))};}
 function selectAt(x:number,y:number){
  const job=mapReady?applied:null,{initial,index}=inspectPoint(x,y,bounds,job);
  selectedIndex.current=index;setSelected(initial);setReleaseJob(job??defaultRelease);setTrajectoryRunning(false);
  setSelectedGrowth(index===null?null:mapGrowth.current?.[index]??null);setSelectedDrift(index===null?null:mapDrift.current?.[index]??null);setRecorded(index===null?null:flipTimes.current?.[index]??null);
 }
 function zoom(cx:number,cy:number,factor:number){const b=bounds,wx=(b.x1-b.x0)*factor,wy=(b.y1-b.y0)*factor,{theta1:x,theta2:y}=viewPoint(cx,cy,b);if(wx<1e-7||wy<1e-7||wx>360||wy>360)return;const x0=Math.max(-180,Math.min(180-wx,x-wx/2)),y0=Math.max(-180,Math.min(180-wy,y-wy/2));navigate({x0,x1:x0+wx,y0,y1:y0+wy});}
 const certificate=energyBarrier(selected,trajectoryP);
 const en=energy(inspect,trajectoryP),drift=energyDrift(inspect,selected,trajectoryP);
 const displayedFlip=certificate.neitherCanFlip?'Energy forbids a flip (all time)':isMap&&selectedIndex.current!==null&&displayMode===4&&recorded!==null?(recorded<0?`No flip by ${fmt(time,2)} s`:`${fmt(recorded,3)} s`):actualFlip.current!==null?`${fmt(actualFlip.current,3)} s`:'Not yet observed';
 return <div className="app">
  <header><div className="header-left"><a className="home-link" href="../../index.html" title="Back to the list of simulations">◂ All simulations</a><div className="brand"><span className="brand-mark">◌</span><div>Double Pendulum <strong>Chaos Lab</strong><small>DETERMINISTIC SYSTEMS · UNPREDICTABLE FUTURES</small></div></div></div><div className="header-actions"><span className="model-badge"><i/> IDEAL MODEL · NO FRICTION</span><button onClick={()=>setHelp(!help)}>ⓘ <span>Field notes</span></button></div></header>
  <nav aria-label="Simulation modes">{modes.map((name,i)=><button key={name} className={mode===i?'active':''} onClick={()=>changeMode(i)} aria-pressed={mode===i}><span>0{i+1}</span>{name}{i===3&&<em>LIVE</em>}</button>)}</nav>
  <div className="intro"><div><div className="eyebrow">EXPERIMENT 0{mode+1} / NONLINEAR DYNAMICS</div><h1>{modes[mode]}</h1><p>{descriptions[mode]}</p></div><div className="precision" title="Numbers are stored to about 16 significant figures; the motion is stepped forward with the Runge–Kutta (RK4) method, Δt seconds at a time">double precision <span>·</span> RK4 steps <span>·</span> Δt {isMap?(applied?.dt??dt):dt} s</div></div>
  <main>
   <aside className="controls panel"><div className="panel-heading">Setup <span>01</span></div>
    <div className="setup-fields">
     {isMap?<label>Resolution<select aria-label="Resolution" value={resolution} onChange={e=>setResolution(+e.target.value)}>{Array.from(new Set([...modeResolutions(mode),resolution])).sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} × {n}</option>)}</select></label>:mode===0?<><label>Pendulums<select value={count} onChange={e=>setCount(+e.target.value)}>{[2,10,50,100,1000].map(n=><option key={n}>{n}</option>)}</select></label><label>Adjacent θ₁ difference (°)<input type="number" min="0" step="any" value={delta} onChange={e=>setDelta(Math.max(0,+e.target.value))}/></label><div className="chips">{[1,.01,.0001,1e-8].map(v=><button key={v} className={delta===v?'chosen':''} onClick={()=>setDelta(v)}>{v===1e-8?'10⁻⁸':v}°</button>)}</div><label className="check"><input type="checkbox" checked={offset} onChange={e=>setOffset(e.target.checked)}/> Arranged view</label></>:null}
     {isMap?<label>Duration (s)<input aria-label="Map duration" aria-invalid={!validDuration} type="number" min="1" max="3600" step="1" value={durationField??duration} onBlur={()=>{if(validDuration)setDurationField(null);}} onChange={e=>{const v=e.target.value;setDurationField(v);if(v.trim()&&Number.isInteger(+v)&&+v>=1&&+v<=3600)setDuration(+v);}}/></label>:<label>Duration (s)<select value={duration} onChange={e=>setDuration(+e.target.value)}>{Array.from(new Set([15,30,70,120,duration])).sort((a,b)=>a-b).map(v=><option key={v}>{v}</option>)}</select></label>}
     {isMap&&!validDuration&&<p className="error" role="alert">Enter a whole number from 1 to 3,600 seconds.</p>}
     {mode===5&&<label>Nearby-start offset in θ₁ (rad)<select value={perturbation} onChange={e=>setPerturbation(+e.target.value)}>{[1e-4,1e-6,1e-7,1e-8,1e-10].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
     {isMap&&<p className="hint">Setup changes take effect when you recalculate the map.</p>}
     {!isMap&&<label className="check"><input type="checkbox" checked={trails} onChange={e=>setTrails(e.target.checked)}/> Motion trails</label>}
    </div>
    <details><summary>Advanced</summary>{(Object.keys(defaults) as (keyof Params)[]).map(key=><label key={key}>{{l1:'Rod 1 length (m)',l2:'Rod 2 length (m)',m1:'Mass 1 (kg)',m2:'Mass 2 (kg)',g:'Gravity (m/s²)'}[key]}<input type="number" min="0.1" max="30" step=".1" value={p[key]} onChange={e=>setP({...p,[key]:Math.max(.1,Math.min(30,+e.target.value))})}/></label>)}<label>RK4 time step<select value={dt} onChange={e=>setDt(+e.target.value)}>{[.008,.004,.002,.001].map(v=><option key={v}>{v}</option>)}</select></label><p className="hint">Rigid massless rods · point masses · no damping.</p></details>
   </aside>
   <section className="stage panel"><div className="stage-heading"><div><span className={`status-dot ${running?'on':''}`}/>{isMap?(applied?modes[displayMode]:'Map'):'Pendulum observatory'}</div><span>{isMap?(applied?`${applied.n} × ${applied.n}`:'Awaiting calculation'):`${mode===0?count:1} SYSTEM${mode===0?'S':''}`}</span></div>
   {isMap&&<div className="map-command"><button className="primary-action" disabled={!validRange||!validDuration} onClick={recalculate}>Recalculate map</button><label className="palette-select">Palette <select aria-label="Colour palette" value={palette} onChange={e=>setPalette(e.target.value)}>{['Spectrum','Ocean','Ember','ROYGBIV'].map(v=><option key={v}>{v}</option>)}</select></label></div>}
   {isMap&&<div className="map-notice" aria-live="polite">{rangePending&&<span className="pending-tag">New range not yet calculated</span>}{settingsPending&&<span className="pending-tag">Unapplied setup changes</span>}{!validRange&&<span className="pending-tag">Check angle ranges in View</span>}{!validDuration&&<span className="pending-tag">Check duration in Setup</span>}{!applied?<p>Choose a range and recalculate to sample it.</p>:rangePending?<p>Preview of calculated samples. Unsampled areas are blank.</p>:pending?<p>Showing the current calculation with its original settings.</p>:null}</div>}
   <div className={`field-layout${isMap?'':' no-axes'}`}>{isMap&&<span className="y-title">INITIAL θ₂ (°)</span>}<div className="field">{isMap&&<div className="axis-labels"><span>{axisFmt(bounds.y1,bounds.y1-bounds.y0)}°</span><span>{axisFmt((bounds.y0+bounds.y1)/2,bounds.y1-bounds.y0)}°</span><span>{axisFmt(bounds.y0,bounds.y1-bounds.y0)}°</span></div>}<canvas aria-label="Interactive pendulum simulation. Click to inspect, use region tool to zoom." ref={canvas} width="800" height="800"
    onPointerDown={e=>{if(!isMap)return;const q=xy(e);startDrag.current={...q,px:e.clientX,py:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(!isMap)return;const q=xy(e),a=viewPoint(q.x,q.y,bounds);setCursor(`θ₁ ${fmt(a.theta1,6)}°   /   θ₂ ${fmt(a.theta2,6)}°`);if(startDrag.current&&interaction==='zoom'){const d=startDrag.current;selectionBox.current={x:d.x*800,y:d.y*800,w:(q.x-d.x)*800,h:(q.y-d.y)*800};}}}
    onPointerUp={e=>{const q=xy(e),d=startDrag.current;startDrag.current=null;selectionBox.current=null;fieldDirty.current=true;if(!d||!isMap)return;const distance=Math.hypot(e.clientX-d.px,e.clientY-d.py);if(interaction==='zoom'&&distance>8){const lo=viewPoint(Math.min(q.x,d.x),Math.max(q.y,d.y),bounds),hi=viewPoint(Math.max(q.x,d.x),Math.min(q.y,d.y),bounds);if(hi.theta1-lo.theta1>=1e-7&&hi.theta2-lo.theta2>=1e-7)navigate({x0:lo.theta1,x1:hi.theta1,y0:lo.theta2,y1:hi.theta2});}else if(interaction==='pan'&&distance>8){const wx=bounds.x1-bounds.x0,wy=bounds.y1-bounds.y0,x=Math.max(-180,Math.min(180-wx,bounds.x0+(d.x-q.x)*wx)),y=Math.max(-180,Math.min(180-wy,bounds.y0+(q.y-d.y)*wy));navigate({x0:x,x1:x+wx,y0:y,y1:y+wy});}else selectAt(q.x,q.y);}}
    onPointerCancel={()=>{startDrag.current=null;selectionBox.current=null;fieldDirty.current=true;}}/>
    {isMap&&<><div className="x-labels"><span>{axisFmt(bounds.x0,bounds.x1-bounds.x0)}°</span><span>{axisFmt((bounds.x0+bounds.x1)/2,bounds.x1-bounds.x0)}°</span><span>{axisFmt(bounds.x1,bounds.x1-bounds.x0)}°</span></div><div className="x-title">INITIAL θ₁ (°)</div></>}
   </div></div>
   {isMap&&<><div className="canvas-tools"><div className="segmented">{['inspect','zoom','pan'].map(v=><button key={v} aria-pressed={interaction===v} title={v==='zoom'?'Drag a region to preview it':v} className={interaction===v?'chosen':''} onClick={()=>setInteraction(v)}>{v==='inspect'?'⌖':v==='zoom'?'⊞':'✥'} <span>{v}</span></button>)}</div><div><button onClick={()=>zoom(.5,.5,.5)} aria-label="Zoom in" title="Zoom in">＋</button><button onClick={()=>zoom(.5,.5,2)} aria-label="Zoom out" title="Zoom out">−</button><button onClick={()=>navigate({...fullBounds})} aria-label="Reset view" title="Reset view">⤢</button></div></div>
   <div className="map-tool-tabs" aria-label="Map tools">{(['view','analysis','investigation'] as const).map(v=><button key={v} aria-expanded={mapTool===v} aria-controls={`map-${v}`} className={mapTool===v?'chosen':''} onClick={()=>setMapTool(mapTool===v?null:v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div>
   <div className="map-tool-panel" id="map-view" hidden={mapTool!=='view'}><p className="hint">Angle ranges change the view only. Recalculate to sample this range.</p><div className="range-editor">{([{title:'θ₁ · horizontal',min:'x0',max:'x1'},{title:'θ₂ · vertical',min:'y0',max:'y1'}] as const).map(axis=><fieldset key={axis.min}><legend>{axis.title}</legend><div className="range-pair">{([axis.min,axis.max] as const).map((k,i)=><label key={k}>{i?'Maximum':'Minimum'} (°)<input aria-label={`${axis.title} ${i?'Maximum':'Minimum'}`} aria-invalid={!validRange} type="number" min="-180" max="180" step="any" value={(rangeFields??angleFields(bounds))[k]} onChange={e=>editRange(k,e.target.value)} onBlur={()=>{if(validRange)setRangeFields(null);}}/></label>)}</div></fieldset>)}</div>{!validRange&&<><p role="alert" className="error">Enter increasing ranges between −180° and +180°.</p><button onClick={()=>setRangeFields(null)}>Use current view</button></>}{applied&&rangePending&&<button onClick={()=>navigate({...applied.bounds})}>Show calculated range</button>}</div>
   <div className="map-tool-panel" id="map-analysis" hidden={mapTool!=='analysis'}><label className="check"><input type="checkbox" checked={showDrift} onChange={e=>setShowDrift(e.target.checked)}/> Show energy-drift map</label><p className={mapStats.badCells?'warn':'hint'}>{mapReady?`Peak drift: ${mapStats.maxDrift.toExponential(3)}% · ${mapStats.badCells.toLocaleString()} cells above 0.1% or non-finite.`:'Calculate a map to measure energy drift.'} {mapReady&&displayMode===4?'Measured through the first-flip step.':''}</p>{applied&&<p className="hint">{engineInfo}</p>}{applied?.mode===4&&<p className="hint">Energy bound: E &lt; −|A−B| guarantees neither rod can flip, where A=(m₁+m₂)gL₁ and B=m₂gL₂. Such cells are skipped and remain white; zero drift there means no steps were taken. Other white cells only mean no flip by the computed time. Select a cell to check its bound.</p>}</div>
   <div className="map-tool-panel" id="map-investigation" hidden={mapTool!=='investigation'}><p className="hint">Exports and checkpoints use the calculated range and settings. Checkpoints also autosave in this browser.</p><div className="compact-actions"><button disabled={!mapReady} onClick={exportPNG}>↓ Map PNG</button><button disabled={!mapReady} onClick={exportMapCSV}>↓ Map CSV</button></div><label>Name<input value={saveName} maxLength={120} onChange={e=>setSaveName(e.target.value)}/></label><div className="export-actions"><button disabled={!mapReady} onClick={saveCurrent}>Save map</button><button disabled={!mapReady} onClick={downloadCurrent}>↓ Checkpoint</button></div><label>Saved maps<select value={savedId} onChange={e=>setSavedId(e.target.value)}><option value="">Choose a saved experiment…</option>{savedList.map(e=><option key={e.id} value={e.id}>{e.name} · {fmt(e.time,1)} s</option>)}</select></label><div className="export-actions"><button disabled={!savedId} onClick={async()=>{try{restoreExperiment(await loadExperiment(savedId));}catch(e){setStorageStatus(String(e));}}}>Restore paused</button><button disabled={!savedId} onClick={async()=>{try{await deleteExperiment(savedId);setSavedId('');await refreshSaved();setStorageStatus('Saved experiment deleted.');}catch(e){setStorageStatus(String(e));}}}>Delete saved</button></div><label>Import checkpoint<input type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>64*1024*1024)throw new Error('File exceeds 64 MiB');restoreExperiment(parseExperiment(await f.text()));}catch(err){setStorageStatus(String(err));}e.target.value='';}}/></label><p className="hint" role="status">{storageStatus}</p></div></>}
   <div className="field-cursor">{isMap?cursor:'Zero friction. Zero air resistance. Gravity alone.'}</div>
   {isMap&&mapReady&&(showDrift?<div className="legend"><div className="spectrum" style={{background:`linear-gradient(90deg,${Array.from({length:16},(_,i)=>cssRGB(driftRGB(10**(-8+7*i/15),palette))).join(',')})`}}/><div className="legend-label"><span>PEAK ENERGY DRIFT · 10⁻⁸% → 0.1%</span><span>Magenta: above 0.1% / non-finite</span></div></div>:displayMode===5?<div className="legend"><div className="spectrum" style={{background:`linear-gradient(90deg,${Array.from({length:16},(_,i)=>cssRGB(growthRGB(i/15*8,palette))).join(',')})`}}/><div className="legend-label"><span>log₁₀(d(t)/ε) · 0 → 8</span><span>Colours saturate outside scale</span></div></div>:displayMode===4?<div className="legend"><div className="legend-label"><span>FIRST FLIP · SECONDS</span><span>□ No flip by {fmt(time,1)} s</span></div><div className="flip-gradient" style={{background:`linear-gradient(90deg, ${Array.from({length:16},(_,i)=>cssRGB(flipRGB(flipScale(i/15,palette)*displayDuration,displayDuration,palette))).join(',')})`}}/><div className="legend-label"><span>0</span><span>{fmt(displayDuration*(palette==='ROYGBIV'?.5:.25),1)}</span><span>{displayDuration} s · {palette==='ROYGBIV'?'linear scale':'√time scale'}</span></div></div>:<div className="legend"><div className="spectrum" style={{background:`linear-gradient(90deg,${Array.from({length:16},(_,i)=>cssRGB(rgb(i/15*Math.PI*2,0,palette))).join(',')})`}}/><div className="legend-label"><span>COLOUR = CURRENT (θ₁, θ₂)</span><span>Cyclic in both angles</span></div></div>)}
   <div className="transport">{isMap?<><button disabled={!applied||mapComplete||(!mapReady&&!mapRunning)} onClick={()=>setMapRunning(v=>!v)}>{mapRunning?'Ⅱ Pause map':'▶ Resume map'}</button><button disabled={!mapReady||mapComplete} onClick={()=>{setMapRunning(false);worker.current?.postMessage({type:'step'});}}>▹ Step map</button></>:<><button className="play" onClick={toggleTrajectory}>{trajectoryRunning?'Ⅱ Pause':'▶ Play'}</button><button onClick={stepMotion}>▹ Step</button><button onClick={resetMotion} aria-label="Restart motion">↻</button><button onClick={exportPNG}>↓ PNG</button></>}<div className="time"><strong>{fmt(displayTime,2)}<small> s</small></strong><span> / {displayDuration} s</span></div></div>
   {isMap&&applied&&<div className="progress" role="progressbar" aria-label="Map progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.round(time/displayDuration*100))}><div style={{width:`${Math.min(100,time/displayDuration*100)}%`}}/><span>{fmt((displayMode>=4?progress:time/displayDuration)*100,1)}% · {mapComplete?'Complete':mapRunning?(tileStatus||'Calculating'):'Paused'}</span></div>}
   {isMap&&applied&&displayMode<4&&<div className="map-speed"><SpeedControl speed={speed} onChange={setSpeed} label="Map speed"/></div>}
   {error&&<p role="alert" className="error">{error}</p>}
   <div className="stage-foot"><span>◉ {isMap?(mapComplete?'COMPLETE':mapRunning?'CALCULATING':applied?'PAUSED':'READY'):(trajectoryRunning?'PLAYING':'PAUSED')}</span><span>{isMap?'Click a point. Follow its story.':'Fixed time steps · independent of rendering'}</span></div>
   </section>
   <aside className="inspector panel"><div className="panel-heading">Trajectory <span>03</span></div><div className="selected-coords"><span>θ₁ <b>{fmt(deg(selected[0]),4)}°</b></span><span>θ₂ <b>{fmt(deg(selected[1]),4)}°</b></span></div><canvas ref={detail} width="330" height="230" className="detail-canvas" aria-label="Selected pendulum animation"/>
   <div className="trajectory-controls"><div className="trajectory-clock">t = {fmt(trajectoryTime,2)} s</div><div className="compact-actions"><button onClick={toggleTrajectory}>{trajectoryRunning?'Pause trajectory':'Play trajectory'}</button><button onClick={replay}>↻ Replay</button></div><div className="trajectory-speed"><SpeedControl speed={trajectorySpeed} onChange={setTrajectorySpeed} label="Speed"/></div></div>
   <div className="readouts"><div><small>{selectedIndex.current!==null?'MAP SAMPLE':'RELEASE'}</small><b>{selectedIndex.current!==null?modes[displayMode]:isMap?'Independent':'Motion experiment'}</b></div>{isMap&&displayMode===4&&<div><small>{selectedIndex.current!==null?'MAP FIRST FLIP':'TRAJECTORY FIRST FLIP'}</small><b>{displayedFlip}</b></div>}{isMap&&displayMode===5&&<div><small>log₁₀(d(t)/ε)</small><b>{selectedGrowth===null?'Select a map sample':fmt(selectedGrowth,4)}</b></div>}</div>
   <ReleaseControls initial={selected} onRelease={setRelease}/>
   <div className="trajectory-tabs" aria-label="Trajectory tools">{(['diagnostics','validation'] as const).map(v=><button key={v} className={trajectoryTab===v?'chosen':''} aria-expanded={trajectoryTab===v} aria-controls={`trajectory-${v}`} onClick={()=>setTrajectoryTab(trajectoryTab===v?'overview':v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div>
   <div id="trajectory-diagnostics" className="trajectory-tool" hidden={trajectoryTab!=='diagnostics'}>
    <div className="readouts"><div><small>θ₁ / θ₂</small><b>{fmt(deg(inspect[0]),1)}° / {fmt(deg(inspect[1]),1)}°</b></div><div><small>ω₁ / ω₂ · rad/s</small><b>{fmt(inspect[2])} / {fmt(inspect[3])}</b></div><div><small>TOTAL ENERGY</small><b>{fmt(en.total,4)} J</b></div><div><small>ENERGY DRIFT¹</small><b className={Math.abs(drift)>.1?'warn':'mint'}>{fmt(drift,6)}%</b></div>{selectedDrift!==null&&<div><small>PIXEL PEAK DRIFT</small><b>{selectedDrift.toExponential(3)}%</b></div>}</div>
    <div className="graph-heading"><strong>Angles over time</strong><span><i className="mint">●</i> θ₁ <i className="purple">●</i> θ₂</span></div><Plot samples={samples} kind="angle" wrapped={wrapped}/>
    <details><summary>Angle–angle trajectory</summary><Plot samples={samples} kind="trajectory" wrapped={wrapped}/></details>
    <details open={mode===1||undefined}><summary>Mechanical energy (J)</summary><Plot samples={samples} kind="energy"/><div className="legend-label"><span className="mint">Kinetic</span><span className="purple">Potential</span><span className="gold">Total</span></div></details>
    <label className="check"><input type="checkbox" checked={wrapped} onChange={e=>setWrapped(e.target.checked)}/> Wrap graphs to ±180°</label><label>Trace window<select value={traceDuration} onChange={e=>setTraceDuration(+e.target.value)}>{[5,15,30,70].map(v=><option key={v} value={v}>{v} s</option>)}</select></label>
    <div className="compact-actions"><button onClick={()=>{history.current=[];setSamples([]);}}>Clear trace</button><button onClick={()=>{const rows=['time_s,theta1_rad,theta2_rad,omega1_rad_s,omega2_rad_s,kinetic_J,potential_J,total_J',...history.current.map(v=>[v.t,...v.s,v.k,v.v,v.e].join(','))];download('pendulum.csv','data:text/csv;charset=utf-8,'+encodeURIComponent(rows.join('\n')));}}>↓ Trace CSV</button></div>
   </div>
   <div id="trajectory-validation" className="trajectory-tool" hidden={trajectoryTab!=='validation'}><AccuracyPanel initial={selected} p={trajectoryP} dt={trajectoryDt} time={trajectoryTime} embedded/></div>
   </aside>
  </main>
  <footer><span>CHAOS IS DETERMINISTIC. PREDICTION HAS LIMITS.</span><span>¹ Drift uses max(|E₀|, gravitational energy scale) for a stable zero-energy reference.</span></footer>
  {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section role="dialog" aria-modal="true" aria-label="Field notes" className="notes panel" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setHelp(false)}>× Close</button><div className="eyebrow">A SHORT GUIDE TO EXPLORATION</div><h2>Order lives inside chaos.</h2><p>A double pendulum is deterministic: identical initial conditions and parameters give identical trajectories. Its nonlinear coupling can amplify tiny initial differences, limiting practical prediction.</p><p>Low-energy motion is often nearly regular. At larger energies, coherent regions and intricate boundaries coexist. Smooth colours show neighbouring trajectories remain similar at the displayed time; they do not prove long-term stability.</p><p><strong>First flip is a diagnostic, not a test of chaos.</strong> It records the first continuous absolute angle to cross beyond ±180°. White means no flip during the chosen duration. Chaotic motion need not flip, and rotation need not imply chaos.</p><p>Energy limits which configurations are reachable. Kinetic and gravitational potential energy exchange while their sum remains nearly constant. Numerical drift is integration error, not friction.</p><p>Use <strong>Inspect</strong> to replay a pixel from rest; use <strong>Zoom</strong> and drag a region to preview it. Choose <strong>Recalculate map</strong> to sample that range. Trajectory playback and release edits are independent of the map. The live field advances at the worker’s achievable speed. First-flip generation can be paused and resumed. Larger fields take substantially longer.</p><p>The divergence map integrates a second trajectory offset in θ₁. It displays log₁₀ of dimensionless separation growth, with wrapped angle differences and velocities scaled by √(g/L₁). It does not renormalise neighbours, so growth can saturate; this is not a Lyapunov exponent or proof of chaos. The energy-drift map reports peak numerical energy error, including the primary trajectory only. Use the accuracy panel to compare Δt, Δt/2 and Δt/4 at a chosen horizon.</p><p>Model: rigid massless rods, point masses, planar motion, constant gravity, zero damping. Angles are absolute from downward vertical. All states use double precision; RK4 uses the selected fixed Δt.</p></section></div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);











