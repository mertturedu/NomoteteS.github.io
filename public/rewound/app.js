(function(){
var d=document,root=d.documentElement,reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var io=function(cb,opt){return 'IntersectionObserver' in window?new IntersectionObserver(cb,opt):null};
var clamp=function(v){return v<0?0:v>1?1:v};
var pad=function(n){return (n<10?'0':'')+n};
// the noise of the tape texture, made once
(function(){try{var c=d.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d'),im=x.createImageData(128,128);for(var i=0;i<im.data.length;i+=4){var v=Math.random()*255|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}x.putImageData(im,0,0);root.style.setProperty('--noise','url('+c.toDataURL()+')')}catch(e){}})();
// the date and time of the viewfinders, as the camcorder writes them (MMM.DD YYYY, h:mm AM/PM), and the running counters
var M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function clock(){var n=new Date(),h=n.getHours(),ap=h<12?'AM':'PM';h=h%12||12;
  [].forEach.call(d.querySelectorAll('[data-date]'),function(e){e.textContent=M[n.getMonth()]+'.'+pad(n.getDate())+' '+n.getFullYear()});
  [].forEach.call(d.querySelectorAll('[data-time]'),function(e){e.textContent=h+':'+pad(n.getMinutes())+' '+ap})}
clock();setInterval(clock,15000);
var tc0=Date.now();setInterval(function(){var s=Math.floor((Date.now()-tc0)/1000)+12;[].forEach.call(d.querySelectorAll('[data-tc]'),function(e){e.textContent=pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60)})},1000);
// the VCR display: tape counter from the scroll, PLAY / FF / REW from its speed and direction; it hides on the way down
var deck=d.querySelector('.deck'),st=deck&&deck.querySelector('.st'),ct=deck&&deck.querySelector('.ct'),wind=d.querySelector('.wind');
var home=d.body.classList.contains('home'),lastY=window.scrollY,lastT=performance.now(),vel=0,mode='',idle=0;
var G={play:st&&st.getAttribute('data-play'),ff:st&&st.getAttribute('data-ff'),rew:st&&st.getAttribute('data-rew'),stop:st&&st.getAttribute('data-stop')};
function setMode(m){if(m===mode||!st)return;mode=m;st.innerHTML=G[m]+'<span>'+(m==='play'?'PLAY':m==='ff'?'FF':m==='rew'?'REW':'STOP')+'</span>'}
function deckFrame(){
  var y=window.scrollY,t=performance.now(),dy=y-lastY,dt=Math.max(16,t-lastT);vel=vel*.6+(dy/dt)*.4;
  var h=Math.max(1,d.documentElement.scrollHeight-window.innerHeight),s=Math.round(clamp(y/h)*1800);
  if(ct)ct.textContent=Math.floor(s/3600)+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60);
  if(y<8)setMode('stop');else if(vel>1.1)setMode('ff');else if(vel<-1.1)setMode('rew');else setMode('play');
  if(deck){deck.classList.toggle('top',home&&y<12);if(dy>4&&y>200)deck.classList.add('hide');else if(dy<-4||y<200)deck.classList.remove('hide')}
  if(wind&&!reduce){var on=Math.abs(vel)>1.6;wind.style.opacity=on?Math.min(.9,(Math.abs(vel)-1.4)*.35).toFixed(2):'0';wind.classList.toggle('on',on)}
  lastY=y;lastT=t;clearTimeout(idle);idle=setTimeout(function(){vel=0;setMode(window.scrollY<8?'stop':'play');if(wind){wind.style.opacity='0';wind.classList.remove('on')}},180);
}
var ticking=false;window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){ticking=false;deckFrame()})}},{passive:true});
deckFrame();
// blocks come in with a tracking sweep; titles settle from a wide RGB shift
var rv=io(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');rv.unobserve(e.target)}})},{rootMargin:'0px 0px -10% 0px'});
[].forEach.call(d.querySelectorAll('.trk,.rvin'),function(el){rv?rv.observe(el):el.classList.add('in')});
// bluescreen title cards: channel static, then the title types in like a VCR OSD
var cio=io(function(es){es.forEach(function(e){if(!e.isIntersecting)return;cio.unobserve(e.target);var bs=e.target,h=bs.querySelector('h2'),full=h.getAttribute('data-t');
  bs.classList.add('on');if(reduce){h.textContent=full;return}h.innerHTML='<span class="cur"></span>';var i=0;
  setTimeout(function(){var t=setInterval(function(){i++;h.innerHTML='';h.appendChild(d.createTextNode(full.slice(0,i)));var c=d.createElement('span');c.className='cur';h.appendChild(c);if(i>=full.length){clearInterval(t);setTimeout(function(){c.remove()},1600)}},55)},420)})},{threshold:.45});
[].forEach.call(d.querySelectorAll('.bs'),function(b){cio?cio.observe(b):b.querySelector('h2').textContent=b.querySelector('h2').getAttribute('data-t')});
// films play only while on screen
var fio=io(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting&&!reduce){if(!v.src&&v.dataset.src)v.src=v.dataset.src;var p=v.play();p&&p.catch(function(){})}else{v.pause()}})},{threshold:.2});
[].forEach.call(d.querySelectorAll('video[data-auto]'),function(v){if(fio)fio.observe(v);else if(v.dataset.src)v.src=v.dataset.src});
// the shutter rolls the tape to the try-out
var sh=d.querySelector('.shutter');if(sh)sh.addEventListener('click',function(){var t=d.getElementById('try');if(t)t.scrollIntoView({behavior:reduce?'auto':'smooth'})});
// recordings: each film plays once, then the next tape comes in; REW / PLAY-PAUSE / FF
var hl=d.querySelector('[data-hl]');
if(hl){
  var list=hl.querySelector('.reel'),items=[].slice.call(list.children),pp=hl.querySelector('.pp'),cnt=hl.querySelector('.count');
  var cur=0,auto=!reduce,seen=false,lock=0;
  function vid(i){return items[i].querySelector('video')}
  function show(i){cur=i;if(cnt)cnt.textContent=(i+1)+'/'+items.length;
    items.forEach(function(it,j){var v=vid(j);if(j!==i){v.pause();if(v.currentTime)v.currentTime=0}});
    var v=vid(i);if(!v.src)v.src=v.dataset.src;if(auto&&seen){var p=v.play();p&&p.catch(function(){})}}
  function go(i){i=(i+items.length)%items.length;lock=Date.now();list.scrollTo({left:items[i].offsetLeft-items[0].offsetLeft,behavior:reduce?'auto':'smooth'});show(i)}
  items.forEach(function(it,j){var v=vid(j),o=it.querySelector('[data-vtc]');v.addEventListener('ended',function(){if(j===cur&&auto)go(cur+1)});
    v.addEventListener('timeupdate',function(){if(o){var s=Math.floor(v.currentTime);o.textContent='00:00:'+pad(s)}})});
  hl.querySelector('[data-prev]').addEventListener('click',function(){go(cur-1)});
  hl.querySelector('[data-next]').addEventListener('click',function(){go(cur+1)});
  function ppDraw(){pp.innerHTML=auto?pp.dataset.pause:pp.dataset.play;pp.setAttribute('aria-label',auto?pp.dataset.lpause:pp.dataset.lplay)}
  pp.addEventListener('click',function(){auto=!auto;ppDraw();if(auto)show(cur);else vid(cur).pause()});ppDraw();
  var t=0;list.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(function(){if(Date.now()-lock<700)return;var w=items[1].offsetLeft-items[0].offsetLeft,i=Math.round(list.scrollLeft/w);if(i!==cur)show(Math.max(0,Math.min(items.length-1,i)))},120)},{passive:true});
  var hio=io(function(es){seen=es[0].isIntersecting;if(seen)show(cur);else vid(cur).pause()},{threshold:.35});
  hio?hio.observe(list):(seen=true,show(0));
}
// the shelf: pulling a tape plays it on the monitor
var shelf=d.querySelector('[data-shelf]');
if(shelf){
  var mon=shelf.querySelector('.mon'),mimg=mon.querySelector('img'),sp=[].slice.call(shelf.querySelectorAll('.spine'));
  function pick(i){sp.forEach(function(b,j){b.setAttribute('aria-pressed',j===i?'true':'false')});var b=sp[i];
    mon.classList.remove('flip');void mon.offsetWidth;mon.classList.add('flip');
    setTimeout(function(){mimg.src=b.dataset.img;mimg.alt=b.dataset.look},reduce?0:120);
    mon.querySelector('[data-fam]').textContent=b.dataset.fam;mon.querySelector('[data-n]').textContent=b.dataset.n;mon.querySelector('[data-ch]').textContent='CH '+pad(i+1);mon.querySelector('[data-look]').textContent=b.dataset.look}
  sp.forEach(function(b,i){b.addEventListener('click',function(){pick(i)});b.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();sp[(i+1)%sp.length].focus();pick((i+1)%sp.length)}else if(e.key==='ArrowLeft'){e.preventDefault();var k=(i-1+sp.length)%sp.length;sp[k].focus();pick(k)}})});
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
