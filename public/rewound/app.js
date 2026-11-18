(function(){
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var io=function(cb,opt){return 'IntersectionObserver' in window?new IntersectionObserver(cb,opt):null};
var motion=document.documentElement.classList.contains('motion');
var clamp=function(v){return v<0?0:v>1?1:v},ease=function(t){return t*t*(3-2*t)};
// the local nav: see-through over the welcome film, hidden on the way down, back on the way up
var ln=document.querySelector('.ln'),home=document.body.classList.contains('home'),lastY=window.scrollY;
function navFrame(y){if(!ln)return;ln.classList.toggle('top',home&&y<12);if(y>lastY+4&&y>160){ln.classList.add('hide')}else if(y<lastY-4||y<160){ln.classList.remove('hide')}lastY=y}
// the welcome film settles from full screen into a card
var track=document.querySelector('.hero-track'),hfilm=track&&track.querySelector('.hero-film'),hvid=hfilm&&hfilm.querySelector('video'),hcopy=track&&track.querySelector('.hero-copy'),hshade=track&&track.querySelector('.hero-shade');
function heroFrame(){
  if(!motion||!track)return;
  var vh=window.innerHeight,vw=document.documentElement.clientWidth,r=track.getBoundingClientRect(),p=clamp(-r.top/Math.max(1,track.offsetHeight-vh)),e=ease(clamp(p*1.25));
  var cw=Math.min(vw*.875,1260),ch=Math.min(vw<=734?cw*1.25:cw*9/16,vh*.78),it=(vh-ch)/2*e,il=(vw-cw)/2*e,rad=28*e;
  var clip='inset('+it.toFixed(1)+'px '+il.toFixed(1)+'px round '+rad.toFixed(1)+'px)';hfilm.style.clipPath=clip;hfilm.style.webkitClipPath=clip;
  if(hvid)hvid.style.transform='scale('+(1.14-.14*e).toFixed(4)+')';
  if(hshade)hshade.style.opacity=(1-e).toFixed(3);
  if(hcopy){hcopy.style.opacity=(1-clamp(p*2.6)).toFixed(3);hcopy.style.transform='translateY('+(-90*p).toFixed(1)+'px) scale('+(1-.06*p).toFixed(4)+')'}
}
// chapters: each one sticks while the next slides over it; the covered one shrinks and dims with the overlap
var stacks=[].slice.call(document.querySelectorAll('.stack'));
function stackLayout(){if(!motion)return;var vh=window.innerHeight;stacks.forEach(function(s){s.style.setProperty('--top',Math.min(0,vh-s.offsetHeight)+'px')})}
function stackFrame(){if(!motion)return;var vh=window.innerHeight;for(var i=0;i<stacks.length;i++){var n=stacks[i+1],q=n?clamp((vh-n.getBoundingClientRect().top)/vh):0;q=Math.round(q*1000)/1000;if(stacks[i]._q!==q){stacks[i]._q=q;stacks[i].style.setProperty('--q',q)}}}
var ticking=false;
function frame(){ticking=false;var y=window.scrollY;navFrame(y);heroFrame();stackFrame()}
window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(frame)}},{passive:true});
window.addEventListener('resize',function(){stackLayout();frame()});
window.addEventListener('load',function(){stackLayout();frame()});
if('ResizeObserver' in window){var ro=new ResizeObserver(function(){stackLayout();frame()});stacks.forEach(function(s){ro.observe(s)})}
stackLayout();frame();
// headlines and blocks rise in once
var rv=io(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');rv.unobserve(e.target)}})},{rootMargin:'0px 0px -12% 0px'});
[].forEach.call(document.querySelectorAll('.reveal'),function(el){rv?rv.observe(el):el.classList.add('in')});
// films play only while on screen
var fio=io(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting&&!reduce){if(!v.src&&v.dataset.src)v.src=v.dataset.src;var p=v.play();p&&p.catch(function(){})}else{v.pause()}})},{threshold:.25});
[].forEach.call(document.querySelectorAll('video[data-auto]'),function(v){if(fio)fio.observe(v)});
// highlights gallery: each film plays once, then the next card comes in
var hl=document.querySelector('[data-hl]');
if(hl){
  var list=hl.querySelector('.hl-list'),items=[].slice.call(list.children),dots=[].slice.call(hl.querySelectorAll('.dots button')),pp=hl.querySelector('.pp');
  var cur=0,auto=!reduce,seen=false,raf=0,lock=0;
  function vid(i){return items[i].querySelector('video')}
  function bar(){var v=vid(cur);var d=dots[cur].querySelector('i');d.style.setProperty('--p',v.duration?v.currentTime/v.duration:0);raf=requestAnimationFrame(bar)}
  function show(i){
    cur=i;
    dots.forEach(function(b,j){b.setAttribute('aria-current',j===i?'true':'false');if(j!==i)b.querySelector('i').style.setProperty('--p',0)});
    items.forEach(function(it,j){var v=vid(j);if(j!==i){v.pause();if(v.currentTime)v.currentTime=0}});
    var v=vid(i);if(!v.src)v.src=v.dataset.src;
    cancelAnimationFrame(raf);
    if(auto&&seen){var p=v.play();p&&p.catch(function(){});raf=requestAnimationFrame(bar)}
  }
  function go(i){lock=Date.now();list.scrollTo({left:items[i].offsetLeft-items[0].offsetLeft,behavior:reduce?'auto':'smooth'});show(i)}
  items.forEach(function(it,j){vid(j).addEventListener('ended',function(){if(j===cur&&auto)go((cur+1)%items.length)})});
  dots.forEach(function(b,j){b.addEventListener('click',function(){go(j)})});
  pp.addEventListener('click',function(){auto=!auto;pp.innerHTML=auto?pp.dataset.pause:pp.dataset.play;pp.setAttribute('aria-label',auto?pp.dataset.lpause:pp.dataset.lplay);if(auto){show(cur)}else{vid(cur).pause();cancelAnimationFrame(raf)}});
  if(!auto){pp.innerHTML=pp.dataset.play;pp.setAttribute('aria-label',pp.dataset.lplay)}
  var t=0;list.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(function(){if(Date.now()-lock<700)return;var w=items[1].offsetLeft-items[0].offsetLeft,i=Math.round(list.scrollLeft/w);if(i!==cur)show(Math.max(0,Math.min(items.length-1,i)))},120)},{passive:true});
  var hio=io(function(es){seen=es[0].isIntersecting;if(seen){show(cur)}else{vid(cur).pause();cancelAnimationFrame(raf)}},{threshold:.35});
  hio?hio.observe(list):(seen=true,show(0));
}
})();
(function(){
var root=document.querySelector('[data-try]');if(!root)return;
var S=JSON.parse(root.getAttribute('data-s'));
var stage=root.querySelector('.stage'),cvs=stage.querySelector('canvas'),poster=stage.querySelector('img'),status=root.querySelector('[data-status]');
var lname=root.querySelector('[data-lname]'),lgroup=root.querySelector('[data-lgroup]'),file=root.querySelector('input[type=file]');
var chips=[].slice.call(root.querySelectorAll('[data-look]'));
var CK=null,data=null,gr=null,surface=null,img=null,child=null,W=0,H=0,cur=+root.getAttribute('data-start')||0,effects={},raf=0,last=0,shown=false,boot=null,clock=1.7;
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function say(t,err){status.textContent=t||'';status.classList.toggle('err',!!err)}
function log(e){if(window.console)console.error('[rewound try]',e)}
function script(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.async=true;s.onload=ok;s.onerror=function(){no(new Error('script'))};document.head.appendChild(s)})}
// the photo is opened by the browser itself (an <img>: HEIC in Safari, EXIF rotation everywhere), scaled down to at most
// 1080 px on its long side (the app's preview size), and handed to CanvasKit as pixels
function decode(blob){
  return new Promise(function(ok,no){var u=URL.createObjectURL(blob),im=new Image();im.onload=function(){ok(im)};im.onerror=function(){URL.revokeObjectURL(u);no(new Error('decode'))};im.src=u})
  .then(function(im){
    var w0=im.naturalWidth,h0=im.naturalHeight;if(!w0||!h0)throw new Error('decode');
    var k=Math.min(2,1080/Math.max(w0,h0)),w=Math.max(2,Math.round(w0*k)),h=Math.max(2,Math.round(h0*k));
    var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(im,0,0,w,h);URL.revokeObjectURL(im.src);
    var sk=CK.MakeImageFromCanvasImageSource(c);if(!sk)throw new Error('decode');return {sk:sk,w:w,h:h};
  });
}
function use(p){
  if(child){child.delete();child=null}if(img){img.delete();img=null}
  img=p.sk;W=p.w;H=p.h;cvs.width=W;cvs.height=H;
  if(surface){surface.delete();surface=null}
  surface=CK.MakeOnScreenGLSurface(gr,W,H,CK.ColorSpace.SRGB);if(!surface)throw new Error('webgl');
  child=img.makeShaderOptions(CK.TileMode.Clamp,CK.TileMode.Clamp,CK.FilterMode.Linear,CK.MipmapMode.None);
  stage.style.aspectRatio=W+' / '+H;poster.hidden=true;cvs.hidden=false;loop();
}
function start(){
  if(boot)return boot;
  say(S.loading);
  boot=Promise.all([
    fetch('/rewound/try/looks.json').then(function(r){if(!r.ok)throw new Error('looks');return r.json()}),
    (window.CanvasKitInit?Promise.resolve():script('/rewound/try/canvaskit.js')).then(function(){return CanvasKitInit({locateFile:function(f){return '/rewound/try/'+f}})})
  ]).then(function(r){
    data=r[0];CK=r[1];
    var ctx=CK.GetWebGLContext(cvs,{antialias:0,preserveDrawingBuffer:1});
    if(!ctx)throw new Error('webgl');
    gr=CK.MakeWebGLContext(ctx);if(!gr)throw new Error('webgl');
    return fetch('/rewound/try/sample.jpg').then(function(r){return r.blob()}).then(decode).then(use);
  }).then(function(){say('')},function(e){log(e);boot=null;say(String(e&&e.message)==='webgl'?S.errWebgl:S.errFormat,true);throw e});
  return boot;
}
function render(t){
  if(!surface||!child)return;
  var L=data.looks[cur],eff=effects[L.key];
  if(!eff){eff=effects[L.key]=CK.RuntimeEffect.Make(data.shaders[L.key])}
  if(!eff)return;
  var u=[];
  for(var i=0;i<eff.getUniformCount();i++){var n=eff.getUniformName(i);if(n==='res'){u.push(W,H)}else if(n==='time'){u.push(t)}else if(n==='seed'){u.push(.37)}else{u.push(L.u[n]||0)}}
  var sh=eff.makeShaderWithChildren(u,[child]),p=new CK.Paint();p.setShader(sh);surface.getCanvas().drawPaint(p);surface.flush();sh.delete();p.delete();
}
function tick(ts){raf=requestAnimationFrame(tick);if(ts-last<33)return;last=ts;clock=1.7+ts/1000;render(clock)}
function loop(){cancelAnimationFrame(raf);raf=0;if(!data||!surface)return;if(data.looks[cur].animated&&!reduce&&shown&&!document.hidden){raf=requestAnimationFrame(tick)}else{render(clock)}}
function pick(i){
  cur=i;chips.forEach(function(b,j){b.setAttribute('aria-checked',j===i?'true':'false')});
  lname.textContent=chips[i].getAttribute('data-name');lgroup.textContent=chips[i].getAttribute('data-group');
  start().then(loop,function(){});
}
function openFile(f){
  if(!f)return;
  var heic=/hei[cf]/i.test((f.type||'')+' '+(f.name||''));
  say(S.opening);
  start().then(function(){return decode(f)}).then(function(p){use(p);say('')}).catch(function(e){log(e);say(String(e&&e.message)==='webgl'?S.errWebgl:heic?S.errHeic:S.errFormat,true)});
}
chips.forEach(function(b,i){b.addEventListener('click',function(){pick(i)})});
file.addEventListener('change',function(){var f=file.files&&file.files[0];file.value='';openFile(f)});
['dragenter','dragover'].forEach(function(n){stage.addEventListener(n,function(e){e.preventDefault();stage.classList.add('drag')})});
['dragleave','drop'].forEach(function(n){stage.addEventListener(n,function(e){e.preventDefault();stage.classList.remove('drag')})});
stage.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];openFile(f)});
root.querySelector('[data-sample]').addEventListener('click',function(){say(S.opening);start().then(function(){return fetch('/rewound/try/sample.jpg')}).then(function(r){return r.blob()}).then(decode).then(function(p){use(p);say('')}).catch(function(e){log(e);say(S.errFormat,true)})});
root.querySelector('[data-save]').addEventListener('click',function(){
  start().then(function(){
    render(clock);
    cvs.toBlob(function(b){if(!b)return;var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='rewound-'+data.looks[cur].name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},4000)},'image/jpeg',.92);
  },function(){});
});
cvs.addEventListener('webglcontextlost',function(e){e.preventDefault();cancelAnimationFrame(raf);surface=null;gr=null;boot=null;poster.hidden=false;cvs.hidden=true});
document.addEventListener('visibilitychange',loop);
if('IntersectionObserver' in window){new IntersectionObserver(function(es){shown=es[0].isIntersecting;if(shown&&!boot)start().catch(function(){});loop()},{rootMargin:'400px 0px'}).observe(root)}else{shown=true;start().catch(function(){})}
})();
