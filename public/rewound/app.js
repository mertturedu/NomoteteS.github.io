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
// recordings: each film plays once, then the next tape comes in; REW / PLAY-PAUSE / FF
var hl=d.querySelector('[data-hl]');
if(hl){
  var list=hl.querySelector('.reel'),items=[].slice.call(list.children),pp=hl.querySelector('.pp'),cnt=hl.querySelector('.count');
  var cur=0,auto=!reduce,seen=false,lock=0;
  function vid(i){return items[i].querySelector('video')}
  function show(i){cur=i;if(cnt)cnt.textContent=(i+1)+'/'+items.length;
    items.forEach(function(it,j){var v=vid(j);v.dataset.active=j===i?'1':'';if(j!==i){v.pause();if(v.currentTime)v.currentTime=0}});
    var v=vid(i);if(!v.src)v.src=v.dataset.src;if(auto&&seen){var p=v.play();p&&p.catch(function(){})}}
  function go(i){i=(i+items.length)%items.length;lock=Date.now();list.scrollTo({left:items[i].offsetLeft-items[0].offsetLeft,behavior:reduce?'auto':'smooth'});show(i)}
  items.forEach(function(it,j){var v=vid(j),o=it.querySelector('[data-vtc]');v.addEventListener('ended',function(){if(j===cur&&auto)go(cur+1)});
    v.addEventListener('timeupdate',function(){if(o){var s=Math.floor(v.currentTime);o.textContent='00:00:'+pad(s)}})});
  hl.querySelector('[data-prev]').addEventListener('click',function(){go(cur-1)});
  hl.querySelector('[data-next]').addEventListener('click',function(){go(cur+1)});
  function ppDraw(){pp.innerHTML=auto?pp.dataset.pause:pp.dataset.play;pp.setAttribute('aria-label',auto?pp.dataset.lpause:pp.dataset.lplay)}
  pp.addEventListener('click',function(){auto=!auto;vid(cur).dataset.hold=auto?'':'1';ppDraw();if(auto)show(cur);else vid(cur).pause()});ppDraw();
  var t=0;list.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(function(){if(Date.now()-lock<700)return;var w=items[1].offsetLeft-items[0].offsetLeft,i=Math.round(list.scrollLeft/w);if(i!==cur)show(Math.max(0,Math.min(items.length-1,i)))},120)},{passive:true});
  var hio=io(function(es){seen=es[0].isIntersecting;if(seen)show(cur);else vid(cur).pause()},{threshold:.35});
  hio?hio.observe(list):(seen=true,show(0));
}
// the shelf: a tape comes out and plays its film on the monitor
var shelf=d.querySelector('[data-shelf]');
if(shelf){
  var mon=shelf.querySelector('.mon'),mv=mon.querySelector('video'),tps=[].slice.call(shelf.querySelectorAll('.spine')),spr=shelf.querySelector('.spines'),mseen=false;
  function mplay(){if(!mseen||reduce)return mv.pause();if(!mv.src)mv.src=mv.dataset.src;var p=mv.play();p&&p.catch(function(){})}
  var mio=io(function(es){mseen=es[0].isIntersecting;mplay()},{threshold:.25});mio?mio.observe(mon):(mseen=true,mplay());
  function pick(i){spr.setAttribute('data-touched','');tps.forEach(function(b,j){b.setAttribute('aria-pressed',j===i?'true':'false')});var b=tps[i];
    b.classList.remove('out');void b.offsetWidth;b.classList.add('out');mon.classList.remove('flip');void mon.offsetWidth;mon.classList.add('flip');
    setTimeout(function(){mv.poster=b.dataset.poster;mv.src=b.dataset.src;mv.dataset.src=b.dataset.src;if(mseen&&!reduce){var p=mv.play();p&&p.catch(function(){})}},reduce?0:160);
    mon.querySelector('[data-fam]').textContent=b.dataset.fam;mon.querySelector('[data-n]').textContent=b.dataset.n;mon.querySelector('[data-ch]').textContent='CH '+pad(i+1);mon.querySelector('[data-look]').textContent=b.dataset.look;
    var r=mon.getBoundingClientRect();if(r.top<60||r.bottom>window.innerHeight)mon.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'})}
  tps.forEach(function(b,i){b.addEventListener('click',function(){pick(i)});b.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();tps[(i+1)%tps.length].focus();pick((i+1)%tps.length)}else if(e.key==='ArrowLeft'){e.preventDefault();var k=(i-1+tps.length)%tps.length;tps[k].focus();pick(k)}})});
}
// the sealed tapes are labelled with the coming months
[].forEach.call(d.querySelectorAll('[data-month]'),function(e){var n=new Date();n.setDate(1);n.setMonth(n.getMonth()+(+e.getAttribute('data-month')));e.textContent=M[n.getMonth()]+' '+n.getFullYear()});
// the opening: a tape drops into the deck, the deck says PLAY, the screen powers on, the picture rolls in
var vi=d.querySelector('.vcr-intro');
if(vi&&root.classList.contains('intro')){
  var lc=vi.querySelector('[data-vlcd]'),tm=[],over=false;
  function done(){if(over)return;over=true;tm.forEach(clearTimeout);root.classList.remove('intro');vi.remove();try{sessionStorage.setItem('rw-intro','1')}catch(e){}
    var h1=d.querySelector('.hero h1');if(h1){h1.classList.remove('in');void h1.offsetWidth;h1.classList.add('in')}}
  [[60,'s1'],[720,'s2'],[1260,'s3'],[1700,'s4'],[2300,'s5'],[2700,'s6']].forEach(function(s){tm.push(setTimeout(function(){vi.classList.add(s[1]);if(s[1]==='s3'&&lc)lc.innerHTML=lc.getAttribute('data-play')+'<span>PLAY</span>'},s[0]))});
  tm.push(setTimeout(done,3150));
  var skip=function(){if(over)return;tm.forEach(clearTimeout);vi.classList.add('s6');setTimeout(done,320)};
  vi.querySelector('.skip').addEventListener('click',skip);
  ['keydown','wheel','touchstart'].forEach(function(n){window.addEventListener(n,skip,{once:true,passive:true})});
  vi.addEventListener('click',skip);
}
// tube screens power on as they come in
var crt=io(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');crt.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
[].forEach.call(d.querySelectorAll('.crt'),function(el){crt?crt.observe(el):el.classList.add('on')});
// the channel number flashes up as a chapter starts
var chosd=d.querySelector('.chosd'),chio=io(function(es){es.forEach(function(e){if(!e.isIntersecting||!chosd)return;chosd.textContent='CH '+pad(+e.target.getAttribute('data-ch'));chosd.classList.remove('show');void chosd.offsetWidth;chosd.classList.add('show')})},{threshold:.5});
[].forEach.call(d.querySelectorAll('.bs[data-ch]'),function(b){if(chio)chio.observe(b)});
// Try it: the try-out lands in the middle of the screen
function toTry(e){var g=d.querySelector('.studio');if(!g)return;if(e)e.preventDefault();var r=g.getBoundingClientRect(),vh=window.innerHeight,top=r.top+window.scrollY,off=r.height<vh-90?(vh-r.height)/2+16:84;
  window.scrollTo({top:Math.max(0,top-off),behavior:reduce?'auto':'smooth'});try{history.replaceState(null,'','#try')}catch(_){}}
[].forEach.call(d.querySelectorAll('a[href$="#try"],[data-try-link]'),function(a){a.addEventListener('click',toTry)});
if(location.hash==='#try')window.addEventListener('load',function(){setTimeout(function(){toTry()},60)});
// a stacked film (the original above the look) drawn into a canvas: before / after and the intensity demo
function stack(box,paint){
  var v=box.querySelector('video'),cv=box.querySelector('canvas'),cx=cv.getContext('2d'),raf=0,seen=false;
  var dpr=Math.min(2,window.devicePixelRatio||1);function size(){var w=Math.max(2,Math.round(box.clientWidth*dpr)),h=Math.max(2,Math.round(box.clientHeight*dpr));if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h}
  function draw(){raf=requestAnimationFrame(draw);if(v.readyState<2||!v.videoWidth)return;size();var vw=v.videoWidth,vh=v.videoHeight/2,W=cv.width,H=cv.height,s=Math.max(W/vw,H/vh),sw=W/s,sh=H/s,sx=(vw-sw)/2,sy=(vh-sh)/2;
    cx.globalAlpha=1;cx.drawImage(v,sx,sy,sw,sh,0,0,W,H);paint(cx,function(){cx.drawImage(v,sx,sy+vh,sw,sh,0,0,W,H)},W,H)}
  function on(){if(!v.src)v.src=v.dataset.src;var p=v.play();p&&p.catch(function(){});cancelAnimationFrame(raf);raf=requestAnimationFrame(draw)}
  function off(){v.pause();cancelAnimationFrame(raf)}
  var o=io(function(es){seen=es[0].isIntersecting;seen&&!reduce?on():(seen?(v.src||(v.src=v.dataset.src),v.addEventListener('loadeddata',function(){draw();cancelAnimationFrame(raf)},{once:true})):off())},{threshold:.15});
  o?o.observe(box):on();size();window.addEventListener('resize',size);
  return {src:function(u){var t=v.currentTime;v.src=u;if(seen)on()}};
}
var ba=d.querySelector('[data-ba]');
if(ba){
  var split=.5,tabs=[].slice.call(d.querySelectorAll('[data-ba-src]')),line=ba.querySelector('.ba-line'),nm=ba.querySelector('[data-ba-name]');
  var sp=stack(ba,function(cx,look,W,H){var x=Math.round(split*W);cx.save();cx.beginPath();cx.rect(x,0,W-x,H);cx.clip();look();cx.restore()});
  function setX(x){split=Math.min(1,Math.max(0,x));ba.style.setProperty('--x',split);line.setAttribute('aria-valuenow',Math.round(split*100))}
  var drag=false;function at(e){var r=ba.getBoundingClientRect();setX((e.clientX-r.left)/r.width)}
  ba.addEventListener('pointerdown',function(e){drag=true;try{ba.setPointerCapture(e.pointerId)}catch(_){}at(e)});
  ba.addEventListener('pointermove',function(e){if(drag)at(e)});
  ['pointerup','pointercancel'].forEach(function(n){ba.addEventListener(n,function(){drag=false})});
  line.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setX(split+(e.key==='ArrowLeft'?-.05:.05))}});
  tabs.forEach(function(t){t.addEventListener('click',function(){tabs.forEach(function(b){b.setAttribute('aria-selected',b===t?'true':'false')});nm.textContent=t.getAttribute('data-ba-look');ba.classList.remove('flip');void ba.offsetWidth;ba.classList.add('flip');sp.src(t.getAttribute('data-ba-src'))})});
  // a hint of the line moving on first sight
  if(!reduce){var hio=io(function(es){if(!es[0].isIntersecting)return;hio.disconnect();var t0=performance.now();(function sw(t){var k=(t-t0)/1400;if(k>1||drag)return;setX(.5+Math.sin(k*Math.PI*2)*.18*(1-k));requestAnimationFrame(sw)})(t0)},{threshold:.6});hio&&hio.observe(ba)}
}
// scenes: switching the channel
var sc=d.querySelector('[data-scenes]');
if(sc){
  var mon2=sc.querySelector('.sc-mon'),sv=mon2.querySelector('video'),stabs=[].slice.call(sc.querySelectorAll('[data-sc]'));
  var sio=io(function(es){if(es[0].isIntersecting&&!reduce){if(!sv.src)sv.src=sv.dataset.src;var p=sv.play();p&&p.catch(function(){})}else sv.pause()},{threshold:.2});sio&&sio.observe(mon2);
  stabs.forEach(function(t){t.addEventListener('click',function(){stabs.forEach(function(b){b.setAttribute('aria-selected',b===t?'true':'false')});
    mon2.classList.remove('flip');void mon2.offsetWidth;mon2.classList.add('flip');
    setTimeout(function(){sv.poster=t.getAttribute('data-poster');sv.src=t.getAttribute('data-src');if(!reduce){var p=sv.play();p&&p.catch(function(){})}},reduce?0:140);
    mon2.querySelector('[data-scn]').textContent=t.querySelector('b').textContent.toUpperCase();mon2.querySelector('[data-sclook]').textContent=t.querySelector('em').textContent.toUpperCase()})});
}
// decades: the vertical scroll runs the reel sideways; the year counts up like a tape counter
var dec=d.querySelector('[data-dec]');
if(dec&&root.classList.contains('motion')){
  var tr=dec.querySelector('.dec-track'),cards=[].slice.call(tr.children),yr=dec.querySelector('[data-year]'),dl=dec.querySelector('[data-dlook]'),bar=dec.querySelector('[data-dbar]'),cur2=-1,span=0;
  function decLayout(){var last=cards[cards.length-1];span=Math.max(0,last.offsetLeft+last.offsetWidth-(window.innerWidth-cards[0].offsetLeft));dec.style.setProperty('--dech',(span+window.innerHeight*1.15)+'px')}
  function decFrame(){var r=dec.getBoundingClientRect(),tot=Math.max(1,dec.offsetHeight-window.innerHeight),p=clamp(-r.top/tot);tr.style.transform='translate3d('+(-span*p).toFixed(1)+'px,0,0)';bar.parentNode.style.setProperty('--p',p);
    var i=Math.min(cards.length-1,Math.round(p*(cards.length-1)));if(i!==cur2){cur2=i;yr.textContent=cards[i].getAttribute('data-y');dl.textContent=cards[i].getAttribute('data-l');yr.classList.remove('tick');void yr.offsetWidth;yr.classList.add('tick')}}
  decLayout();decFrame();window.addEventListener('resize',function(){decLayout();decFrame()});window.addEventListener('load',function(){decLayout();decFrame()});
  window.addEventListener('scroll',function(){requestAnimationFrame(decFrame)},{passive:true});
}
// Keep-alive: the films are loops that must never stand still. A browser may pause a video on its own (a long wait, a
// background tab, memory pressure, Low Power Mode) or drop its source: a looping video in view is started again, one that
// lost its source is reloaded. The reel's visitor-chosen pause (data-hold) and the reduced-motion setting are respected.
function alive(){
  if(reduce||d.hidden)return;
  [].forEach.call(d.querySelectorAll('video'),function(v){
    if(v.dataset.hold||!(v.loop||v.dataset.active)||v.offsetWidth<10)return;
    var r=v.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
    var src=v.getAttribute('src')||v.dataset.src;if(!src)return;
    if(!v.getAttribute('src'))v.setAttribute('src',src);
    if(v.error||v.networkState===3||(v.readyState===0&&v.networkState===0)){v.load()}
    if(v.paused||v.ended){var p=v.play();p&&p.catch(function(){})}
  });
}
setInterval(alive,2000);
['visibilitychange','pageshow','focus','online'].forEach(function(n){(n==='pageshow'||n==='focus'?window:d).addEventListener(n,function(){alive()})});
d.addEventListener('click',alive,{passive:true});d.addEventListener('touchstart',alive,{passive:true});
})();
(function(){
var d=document,reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var io=function(cb,opt){return 'IntersectionObserver' in window?new IntersectionObserver(cb,opt):null};
var boot=null,CK=null,DATA=null;
function script(src){return new Promise(function(ok,no){var s=d.createElement('script');s.src=src;s.async=true;s.onload=ok;s.onerror=function(){no(new Error('script'))};d.head.appendChild(s)})}
// CanvasKit and the looks, loaded once for the studio and the Adjust section
function load(){if(boot)return boot;boot=Promise.all([fetch('/rewound/try/looks.json').then(function(r){if(!r.ok)throw new Error('looks');return r.json()}),(window.CanvasKitInit?Promise.resolve():script('/rewound/try/canvaskit.js')).then(function(){return CanvasKitInit({locateFile:function(f){return '/rewound/try/'+f}})})]).then(function(r){DATA=r[0];CK=r[1];return r});boot.catch(function(){boot=null});return boot}
function log(e){if(window.console)console.error('[rewound]',e)}
// one WebGL canvas that draws a look of the app over a photo or a playing film, with the same uniforms as the app
function View(cv){
  var v={gr:null,surface:null,child:null,img:null,vimg:null,W:0,H:0,fx:{}};
  v.init=function(){var ctx=CK.GetWebGLContext(cv,{antialias:0,preserveDrawingBuffer:1});if(!ctx)throw new Error('webgl');v.gr=CK.MakeWebGLContext(ctx);if(!v.gr)throw new Error('webgl')};
  v.size=function(w,h){if(w===v.W&&h===v.H&&v.surface)return;cv.width=w;cv.height=h;if(v.vimg){v.vimg.delete();v.vimg=null}if(v.surface){v.surface.delete();v.surface=null}v.surface=CK.MakeOnScreenGLSurface(v.gr,w,h,CK.ColorSpace.SRGB);if(!v.surface)throw new Error('webgl');v.W=w;v.H=h};
  v.image=function(sk,w,h){if(v.child){v.child.delete();v.child=null}if(v.img)v.img.delete();v.img=sk;v.size(w,h);v.child=sk.makeShaderOptions(CK.TileMode.Clamp,CK.TileMode.Clamp,CK.FilterMode.Linear,CK.MipmapMode.None)};
  v.draw=function(L,vals,t,child){if(!v.surface)return;var e=v.fx[L.key];if(!e)e=v.fx[L.key]=CK.RuntimeEffect.Make(DATA.shaders[L.key]);if(!e)return;var u=[];
    for(var i=0;i<e.getUniformCount();i++){var n=e.getUniformName(i);if(n==='res')u.push(v.W,v.H);else if(n==='time')u.push(t);else if(n==='seed')u.push(.37);else if(vals&&vals[n]!=null)u.push(vals[n]);else u.push(L.u[n]||0)}
    var sh=e.makeShaderWithChildren(u,[child||v.child]),p=new CK.Paint();p.setShader(sh);v.surface.getCanvas().drawPaint(p);v.surface.flush();sh.delete();p.delete()};
  v.drawVideo=function(vid,L,vals,t){if(!v.surface||vid.readyState<2||!vid.videoWidth)return;var iw=vid.videoWidth,ih=vid.videoHeight;
    if(v.vimg&&v.surface.updateTextureFromSource){v.surface.updateTextureFromSource(v.vimg,vid)}else{if(v.vimg)v.vimg.delete();v.vimg=v.surface.makeImageFromTextureSource(vid,{width:iw,height:ih,alphaType:CK.AlphaType.Premul,colorType:CK.ColorType.RGBA_8888,colorSpace:CK.ColorSpace.SRGB})}
    if(!v.vimg)return;var k=Math.max(v.W/iw,v.H/ih),m=CK.Matrix.multiply(CK.Matrix.translated((v.W-iw*k)/2,(v.H-ih*k)/2),CK.Matrix.scaled(k,k));
    var ch=v.vimg.makeShaderOptions(CK.TileMode.Clamp,CK.TileMode.Clamp,CK.FilterMode.Linear,CK.MipmapMode.None,m);v.draw(L,vals,t,ch);ch.delete()};
  return v;
}
// a photo opened by the browser itself (HEIC in Safari, EXIF rotation everywhere), at most 1080 px on its long side
function decode(blob){
  return new Promise(function(ok,no){var u=URL.createObjectURL(blob),im=new Image();im.onload=function(){ok(im)};im.onerror=function(){URL.revokeObjectURL(u);no(new Error('decode'))};im.src=u})
  .then(function(im){var w0=im.naturalWidth,h0=im.naturalHeight;if(!w0||!h0)throw new Error('decode');var k=Math.min(2,1080/Math.max(w0,h0)),w=Math.max(2,Math.round(w0*k)),h=Math.max(2,Math.round(h0*k));
    var c=d.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(im,0,0,w,h);URL.revokeObjectURL(im.src);var sk=CK.MakeImageFromCanvasImageSource(c);if(!sk)throw new Error('decode');return {sk:sk,w:w,h:h}})}
function slow(p){return Promise.all([p,new Promise(function(r){setTimeout(r,reduce?0:900)})]).then(function(r){return r[0]})}
// the settings every look has (design of the app's Adjust panel): [uniform, label key, min, max, default]
var SETS=[['light',[['k','intensity',0,1,1],['aExp','exposure',-1,1,0],['aCon','contrast',-1,1,0]]],['colour',[['aSat','saturation',-1,1,0],['aTemp','warmth',-1,1,0],['aTint','tint',-1,1,0]]],['texture',[['aFade','fade',0,1,0],['aGrain','grain',0,1,0],['aVig','vignette',0,1,0]]]];
var SPEEDS=[0,.25,.5,1,2];
function slider(label,min,max,val,step,show,on){var l=d.createElement('label');l.className='slider';l.innerHTML='<span class="sl-head"><span></span><span class="v"></span></span><input type="range">';
  l.querySelector('.sl-head span').textContent=label;var inp=l.querySelector('input'),out=l.querySelector('.v');inp.min=min;inp.max=max;inp.step=step||(max-min)/200;inp.value=val;inp.setAttribute('aria-label',label);
  function upd(){var x=+inp.value;out.textContent=show(x);inp.style.setProperty('--v',(x-min)/(max-min))}upd();inp.addEventListener('input',function(){upd();on(+inp.value)});return l}
function pct(min,max){return function(x){return min<0?(x>0?'+':'')+Math.round(x*100):Math.round((x-min)/(max-min)*100)}}
function speedSeg(T,val,on){var w=d.createElement('div');w.className='seg';[T.hold,'¼','½','1×','2×'].forEach(function(t,i){var b=d.createElement('button');b.type='button';b.textContent=t;b.setAttribute('aria-pressed',SPEEDS[i]===val?'true':'false');
  b.addEventListener('click',function(){[].forEach.call(w.children,function(x){x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','true');on(SPEEDS[i])});w.appendChild(b)});return w}

// ───── the studio ─────
var st=d.querySelector('[data-studio]');
if(st){
  var S=JSON.parse(st.getAttribute('data-s')),T=S.t,stage=st.querySelector('.stage'),cv=stage.querySelector('canvas'),poster=stage.querySelector('img.poster'),status=st.querySelector('[data-status]');
  var lname=st.querySelector('[data-lname]'),lgroup=st.querySelector('[data-lgroup]'),chips=[].slice.call(st.querySelectorAll('[data-look]')),fams=[].slice.call(st.querySelectorAll('[data-fam]')),phs=[].slice.call(st.querySelectorAll('[data-photo]')),files=[].slice.call(st.querySelectorAll('input[type=file]')),adjBox=st.querySelector('[data-adjust]');
  var view=null,ready=null,cur=+st.getAttribute('data-start')||0,mem={},clock=1.7,last=0,lr=0,raf=0,holding=false,shown=false,ORIG=0;
  function say(t,err){status.textContent=t||'';status.classList.toggle('err',!!err)}
  function fx(n){stage.classList.remove(n);void stage.offsetWidth;stage.classList.add(n);setTimeout(function(){stage.classList.remove(n)},1100)}
  function vals(){return mem[cur]||(mem[cur]={})}
  function spd(){var s=vals().speed;return s==null?1:s}
  function render(){if(!view||!DATA)return;view.draw(holding?DATA.looks[ORIG]:DATA.looks[cur],holding?null:vals(),clock)}
  function tick(ts){raf=requestAnimationFrame(tick);var dt=last?Math.min(.1,(ts-last)/1000):0;last=ts;clock+=dt*spd();if(ts-lr<33)return;lr=ts;render()}
  function loop(){cancelAnimationFrame(raf);raf=0;last=0;if(!view||!view.surface||!DATA)return;if(DATA.looks[cur].animated&&!reduce&&shown&&!d.hidden&&spd()>0)raf=requestAnimationFrame(tick);else render()}
  function err(e,heic){log(e);say(String(e&&e.message)==='webgl'?S.errWebgl:heic?S.errHeic:S.errFormat,true)}
  function use(p){view.image(p.sk,p.w,p.h);stage.style.aspectRatio=p.w+' / '+p.h;stage.style.setProperty('--ar',p.w/p.h);poster.hidden=true;cv.hidden=false;loop()}
  function start(){if(ready)return ready;say(S.loading);
    ready=load().then(function(){ORIG=Math.max(0,DATA.looks.findIndex(function(l){return l.name==='Original'}));view=View(cv);view.init();return fetch(phs[0].getAttribute('data-src'))}).then(function(r){return r.blob()}).then(decode).then(function(p){use(p);say('');panel()},function(e){ready=null;err(e);throw e});return ready}
  function open(blob,heic){say(S.opening);stage.classList.add('loading');
    start().then(function(){return slow(decode(blob))}).then(function(p){stage.classList.remove('loading');use(p);if(!reduce)fx('roll');say('')}).catch(function(e){stage.classList.remove('loading');err(e,heic)})}
  // the Adjust panel: motion speed, the look's own settings, light, colour, texture; every look keeps its own
  function panel(){if(!adjBox||!DATA)return;var L=DATA.looks[cur],V=vals();adjBox.innerHTML='';
    function sec(title,body){var s=d.createElement('div');s.className='adj-sec';var h=d.createElement('h4');h.textContent=title;s.appendChild(h);body.forEach(function(b){s.appendChild(b)});adjBox.appendChild(s)}
    if(L.animated)sec(T.speed,[speedSeg(T,spd(),function(x){vals().speed=x;loop()})]);
    if(L.params.length)sec(T.look+' · '+L.name,L.params.map(function(p){return slider(p.label,p.min,p.max,V[p.u]!=null?V[p.u]:p.def,(p.max-p.min)/200,pct(p.min,p.max),function(x){vals()[p.u]=x;if(!raf)render()})}));
    SETS.forEach(function(g){sec(T[g[0]],g[1].map(function(a){return slider(T[a[1]]||S.intensity,a[2],a[3],V[a[0]]!=null?V[a[0]]:a[4],.01,pct(a[2],a[3]),function(x){vals()[a[0]]=x;if(!raf)render()})}))});
    var r=d.createElement('button');r.type='button';r.className='pill solid reset';r.textContent=T.reset;r.addEventListener('click',function(){mem[cur]={};panel();loop()});adjBox.appendChild(r)}
  function famOf(i){return chips[i].getAttribute('data-tab')}
  function showFam(f){fams.forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-fam')===f?'true':'false')});chips.forEach(function(c){c.hidden=c.getAttribute('data-tab')!==f})}
  function pick(i,dir){i=(i+chips.length)%chips.length;var was=cur;cur=i;chips.forEach(function(b,j){b.setAttribute('aria-checked',j===i?'true':'false')});
    lname.textContent=chips[i].getAttribute('data-name');lgroup.textContent=famOf(i);if(famOf(i)!==famOf(was)||chips[i].hidden)showFam(famOf(i));
    if(view&&!reduce&&i!==was){fx(dir?'swipe-'+(dir>0?'l':'r'):'switch')}start().then(function(){panel();loop()},function(){})}
  chips.forEach(function(b,i){b.addEventListener('click',function(){pick(i)})});
  fams.forEach(function(b){b.addEventListener('click',function(){showFam(b.getAttribute('data-fam'))})});
  phs.forEach(function(b){b.addEventListener('click',function(){phs.forEach(function(x){x.setAttribute('aria-checked',x===b?'true':'false')});fetch(b.getAttribute('data-src')).then(function(r){return r.blob()}).then(function(bl){open(bl)})})});
  files.forEach(function(file){file.addEventListener('change',function(){var f=file.files&&file.files[0];file.value='';if(!f)return;phs.forEach(function(x){x.setAttribute('aria-checked','false')});open(f,/hei[cf]/i.test((f.type||'')+' '+(f.name||'')))})});
  // swipe to change the look, press and hold to see the original (as in the app's viewfinder)
  var px=0,py=0,ht=0,moved=false,down=false;
  stage.addEventListener('pointerdown',function(e){if(e.button>0)return;down=true;moved=false;px=e.clientX;py=e.clientY;clearTimeout(ht);ht=setTimeout(function(){if(!moved&&down){holding=true;stage.classList.add('orig');render()}},260)});
  stage.addEventListener('pointermove',function(e){if(down&&(Math.abs(e.clientX-px)>10||Math.abs(e.clientY-py)>10))moved=true});
  function up(e){clearTimeout(ht);if(!down)return;down=false;if(holding){holding=false;stage.classList.remove('orig');render();return}var dx=e.clientX-px,dy=e.clientY-py;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.2)pick(cur+(dx<0?1:-1),dx<0?1:-1)}
  stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',function(){clearTimeout(ht);down=false;if(holding){holding=false;stage.classList.remove('orig');render()}});
  stage.addEventListener('contextmenu',function(e){e.preventDefault()});
  st.querySelector('[data-prevlook]').addEventListener('click',function(e){e.stopPropagation();pick(cur-1,-1)});
  st.querySelector('[data-nextlook]').addEventListener('click',function(e){e.stopPropagation();pick(cur+1,1)});
  d.addEventListener('keydown',function(e){if(!st.classList.contains('full')&&!st.contains(d.activeElement))return;var t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;if(e.key==='ArrowRight'){e.preventDefault();pick(cur+1,1)}else if(e.key==='ArrowLeft'){e.preventDefault();pick(cur-1,-1)}else if(e.key==='Escape'&&st.classList.contains('full'))full(false)});
  // tabs: Looks / Adjust
  var tabs=[].slice.call(st.querySelectorAll('[data-pane]'));tabs.forEach(function(b){b.addEventListener('click',function(){tabs.forEach(function(x){x.setAttribute('aria-selected',x===b?'true':'false')});[].forEach.call(st.querySelectorAll('.st-pane'),function(p){p.hidden=p.getAttribute('data-p')!==b.getAttribute('data-pane')})})});
  // full screen: the studio takes the whole window, the panel becomes a sheet
  function full(on){st.classList.toggle('full',on);d.documentElement.classList.toggle('st-open',on);if(on)start().catch(function(){})}
  st.querySelector('[data-full]').addEventListener('click',function(){full(!st.classList.contains('full'))});
  st.querySelector('[data-close]').addEventListener('click',function(){full(false)});
  ['dragenter','dragover'].forEach(function(n){stage.addEventListener(n,function(e){e.preventDefault();stage.classList.add('drag')})});
  ['dragleave','drop'].forEach(function(n){stage.addEventListener(n,function(e){e.preventDefault();stage.classList.remove('drag')})});
  stage.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)open(f,/hei[cf]/i.test((f.type||'')+' '+(f.name||'')))});
  st.querySelector('[data-save]').addEventListener('click',function(){start().then(function(){render();cv.toBlob(function(b){if(!b)return;var a=d.createElement('a');a.href=URL.createObjectURL(b);a.download='rewound-'+DATA.looks[cur].name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.jpg';d.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},4000)},'image/jpeg',.92)},function(){})});
  cv.addEventListener('webglcontextlost',function(e){e.preventDefault();cancelAnimationFrame(raf);view=null;ready=null;poster.hidden=false;cv.hidden=true});
  d.addEventListener('visibilitychange',loop);
  var o=io(function(es){shown=es[0].isIntersecting;if(shown&&!ready)start().catch(function(){});loop()},{rootMargin:'300px 0px'});o?o.observe(st):(shown=true,start().catch(function(){}));
  showFam(famOf(cur));
}

// ───── the Adjust section: the app's shaders on a playing film, with the app's settings ─────
var aj=d.querySelector('[data-adjv]');
if(aj){
  var AS=JSON.parse(aj.getAttribute('data-s')),vid=aj.querySelector('video'),cv2=aj.querySelector('canvas'),box=aj.querySelector('[data-adjset]'),lks=[].slice.call(aj.querySelectorAll('[data-adj-look]')),pctOut=aj.querySelector('[data-adj-pct]');
  var v2=null,on2=false,cur2=-1,vals2={},clock2=0,last2=0,lr2=0,raf2=0,sp2=1,seen2=false;
  function sets(){box.innerHTML='';var L=DATA.looks[cur2];
    var s1=d.createElement('div');s1.className='adj-sec';s1.innerHTML='<h4></h4>';s1.querySelector('h4').textContent=AS.t.speed;s1.appendChild(speedSeg(AS.t,sp2,function(x){sp2=x}));box.appendChild(s1);
    var s2=d.createElement('div');s2.className='adj-sec';s2.innerHTML='<h4></h4>';s2.querySelector('h4').textContent=AS.t.look+' · '+L.name;
    [['k',AS.intensity,0,1,1],['aExp',AS.t.exposure,-1,1,0],['aSat',AS.t.saturation,-1,1,0],['aTemp',AS.t.warmth,-1,1,0],['aGrain',AS.t.grain,0,1,0],['aVig',AS.t.vignette,0,1,0]].forEach(function(a){s2.appendChild(slider(a[1],a[2],a[3],vals2[a[0]]!=null?vals2[a[0]]:a[4],.01,pct(a[2],a[3]),function(x){vals2[a[0]]=x;if(a[0]==='k')pctOut.textContent=Math.round(x*100)+'%'}))});
    var own=[AS.intensity,AS.t.exposure,AS.t.saturation,AS.t.warmth,AS.t.grain,AS.t.vignette].map(function(x){return x.toLowerCase()});
    L.params.filter(function(p){return own.indexOf(p.label.toLowerCase())<0}).slice(0,2).forEach(function(p){s2.appendChild(slider(p.label,p.min,p.max,vals2[p.u]!=null?vals2[p.u]:p.def,(p.max-p.min)/200,pct(p.min,p.max),function(x){vals2[p.u]=x}))});box.appendChild(s2)}
  function pick2(name){var i=DATA.looks.findIndex(function(l){return l.name===name});if(i<0)return;cur2=i;vals2={};pctOut.textContent='100%';lks.forEach(function(b){b.setAttribute('aria-checked',b.getAttribute('data-adj-look')===name?'true':'false')});aj.classList.remove('flip');void aj.offsetWidth;aj.classList.add('flip');sets()}
  function frame2(ts){raf2=requestAnimationFrame(frame2);var dt=last2?Math.min(.1,(ts-last2)/1000):0;last2=ts;clock2+=dt*sp2;if(ts-lr2<33)return;lr2=ts;if(v2&&cur2>=0)v2.drawVideo(vid,DATA.looks[cur2],vals2,clock2)}
  function run(){cancelAnimationFrame(raf2);last2=0;if(seen2&&on2&&!d.hidden){var p=vid.play();p&&p.catch(function(){});raf2=requestAnimationFrame(frame2)}else vid.pause()}
  function go(){if(on2)return run();load().then(function(){v2=View(cv2);v2.init();var r=aj.querySelector('.adj-mon'),k=Math.min(1.5,window.devicePixelRatio||1);v2.size(Math.min(1280,Math.round(r.clientWidth*k)),Math.min(800,Math.round(r.clientHeight*k)));
    if(!vid.src)vid.src=vid.dataset.src;on2=true;aj.classList.add('live');pick2(lks[0].getAttribute('data-adj-look'));run()}).catch(function(e){log(e);aj.classList.add('nogl');if(!vid.src)vid.src=vid.dataset.src;var p=vid.play();p&&p.catch(function(){})})}
  lks.forEach(function(b){b.addEventListener('click',function(){if(DATA)pick2(b.getAttribute('data-adj-look'))})});
  d.addEventListener('visibilitychange',run);
  var o2=io(function(es){seen2=es[0].isIntersecting;if(seen2&&!reduce)go();else run()},{rootMargin:'200px 0px'});o2?o2.observe(aj):(seen2=true,go());
}
})();
