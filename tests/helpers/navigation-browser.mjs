import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { moduleLoader } from "./load-module.mjs";
const entry = fileURLToPath(new URL("../../src/app/InkNavigation.tsx", import.meta.url));
export function mountNavigation(sourcePath=entry) {
  let now=1000,id=0,path="/",refIndex=0,effectIndex=0,reduced=false;
  const frames=new Map(),timers=new Map(),de=new Map(),we=new Map(),refs=[],effects=[],pending=[],covers=[],observers=[],calls=[];
  const location=new URL("https://inkcrow.example/");
  class Element {
    closest() { return this.anchor ?? (this.href ? this : null); }
  }
  const anchor=(href,options={})=>Object.assign(new Element(), {href:new URL(href,location).href,target:"",hasAttribute(k){return Boolean(this[k]);},
    getBoundingClientRect:()=>({left:100,top:200,width:80,height:20})},options);
  const links=[anchor("/privacy/"),anchor("/terms/"),anchor("/#work"),anchor("https://outside.example/")];
  const router={push:href=>calls.push(["push",href]),prefetch:href=>calls.push(["prefetch",href])};
  const document={body:{appendChild(el){covers.push(el);}},
    querySelectorAll:()=>links.filter(a=>!a.target&&!a.download),
    addEventListener:(k,f)=>de.set(k,f),removeEventListener:k=>de.delete(k),
    createElement:()=>{const animations=[];const cover={className:"",dataset:{},style:{setProperty(k,v){this[k]=v;}},attrs:{},
      setAttribute(k,v){this.attrs[k]=v;},remove(){const i=covers.indexOf(this);if(i>=0)covers.splice(i,1);},
      getAnimations:()=>animations.filter(a=>!a.cancelled),
      animate(keyframes,options){let resolve,reject,settled=false;const finished=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
        const animation={keyframes,options,finished,cancelled:false,
          finish(){if(!settled){settled=true;resolve();}},cancel(){this.cancelled=true;if(!settled){settled=true;reject(Error("cancelled"));}}};
        animations.push(animation);return animation;},animations};return cover;}};
  const window={setTimeout(fn,delay){timers.set(++id,{fn,at:now+delay});return id;},scrollTo:opts=>calls.push(["scroll",opts]),
    addEventListener:(k,f)=>we.set(k,f),removeEventListener:k=>we.delete(k)};
  const load=moduleLoader({Element,URL,document,window,location,innerWidth:1440,innerHeight:900,matchMedia:()=>({matches:reduced}),
    requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),clearTimeout:id=>timers.delete(id),
    IntersectionObserver:class {constructor(fn){this.fn=fn;this.targets=new Set();observers.push(this);}observe(el){this.targets.add(el);}unobserve(el){this.targets.delete(el);}disconnect(){this.targets.clear();}}},
    {react:{useRef(value){const i=refIndex++;return refs[i]??(refs[i]={current:value});},useEffect(fn,deps){const i=effectIndex++,old=effects[i];if(!old||deps.some((d,j)=>d!==old.deps[j]))pending.push(()=>{old?.cleanup?.();effects[i]={deps,cleanup:fn()};});}},
      "next/navigation":{useRouter:()=>router,usePathname:()=>path},"react/jsx-runtime":{jsx(){},jsxs(){}}});
  const component=load(sourcePath).default;
  const render=()=>{refIndex=effectIndex=0;component();pending.splice(0).forEach(fn=>fn());};
  render();
  const hash=createHash("sha256"),snapshots=[];
  const record=()=>{const value={now,frames:frames.size,timers:[...timers.values()].map(t=>t.at),calls,covers:covers.map(c=>({className:c.className,data:c.dataset,style:c.style,attrs:c.attrs,
    animations:c.animations.map(a=>({keyframes:a.keyframes,options:a.options,cancelled:a.cancelled}))}))};const json=JSON.stringify(value);snapshots.push(JSON.parse(json));hash.update(json);};
  const flush=async()=>{await Promise.resolve();await Promise.resolve();};record();
  return {links,anchor,covers,calls,snapshots,location,get digest(){return hash.copy().digest("hex");},get frames(){return frames.size;},get timers(){return timers.size;},get listeners(){return de.size+we.size;},
    reduced(on){reduced=on;record();},intent(a=links[0],type="pointerover"){de.get(type)?.({target:a});record();},
    intersect(){observers.forEach(o=>o.fn([...o.targets].map(target=>({target,isIntersecting:true}))));record();},
    click(a=links[0],options={}){const event={target:a,button:0,detail:1,clientX:120,clientY:210,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...options};de.get("click")?.(event);record();return event.defaultPrevented;},
    lateIntersection(index=0){observers[index].fn([{target:links[0],isIntersecting:true}]);record();},
    async finish(){covers.at(-1)?.animations.at(-1)?.finish();await flush();record();},
    async route(href){location.href=new URL(href,location).href;path=location.pathname;render();await flush();record();},
    async back(href="/"){location.href=new URL(href,location).href;we.get("popstate")?.();path=location.pathname;render();await flush();record();},
    async advance(ms=16){now+=ms;const due=[...timers].filter(([,t])=>t.at<=now);due.forEach(([id,t])=>{timers.delete(id);t.fn();});const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));await flush();record();},
    async unmount(){effects.forEach(e=>e.cleanup?.());await flush();record();}
  };
}
export async function navigationScenario(mode,path) {
  const app=mountNavigation(path);app.intersect();app.intent();
  if(mode==="reduced")app.reduced(true);
  const target=mode==="hash"?app.anchor("/privacy/#details"):app.links[0];
  app.click(target,{detail:mode==="keyboard"?0:1});app.click(app.links[1]);
  if(mode==="back-cover"){await app.back();await app.finish();}
  else {
    await app.advance(80);await app.finish();
    if(mode==="slow")await app.advance(6200);
    if(mode==="unmount-wait"){await app.unmount();await app.finish();return app.digest;}
    await app.route(mode==="hash"?"/privacy/#details":"/privacy/");
    await app.advance();
    if(mode==="back-reveal")await app.back();
    else {await app.advance();await app.advance(250);await app.finish();}
  }
  await app.unmount();return app.digest;
}
