(function(){
var vf=document.querySelector('[data-vf]');
if(vf){
  var img=vf.querySelector('img'),nm=vf.querySelector('[data-name]'),gp=vf.querySelector('[data-group]');
  var chips=[].slice.call(document.querySelectorAll('[data-look]')),cur=0,t=null;
  function show(i){cur=i;var c=chips[i];img.src=c.getAttribute('data-src');img.alt=c.getAttribute('data-name');nm.textContent=c.getAttribute('data-name');gp.textContent=c.getAttribute('data-group');
    chips.forEach(function(b,j){b.setAttribute('aria-pressed',j===i?'true':'false')});}
  function stop(){if(t){clearInterval(t);t=null}}
  chips.forEach(function(b,i){b.addEventListener('click',function(){stop();show(i)})});
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce){t=setInterval(function(){show((cur+1)%chips.length)},3200)}
  chips.forEach(function(c){var s=new Image();s.src=c.getAttribute('data-src')});
}
var tc=document.querySelector('[data-tc]');
if(tc){var s=12;setInterval(function(){s=(s+1)%3600;var m=('0'+Math.floor(s/60)).slice(-2),x=('0'+(s%60)).slice(-2);tc.textContent='00:'+m+':'+x},1000)}
})();
(function(){
var root=document.querySelector('[data-try]');if(!root)return;
var cvs=root.querySelector('canvas'),poster=root.querySelector('[data-poster]'),msg=root.querySelector('[data-msg]');
var chips=[].slice.call(root.querySelectorAll('[data-t]')),file=root.querySelector('input[type=file]');
var tname=root.querySelector('[data-tname]'),tgroup=root.querySelector('[data-tgroup]');
var S={load:root.getAttribute('data-load'),err:root.getAttribute('data-err')};
var CK=null,data=null,surface=null,photo=null,img=null,W=0,H=0,cur=+root.getAttribute('data-start')||0,effects={},raf=0,last=0,visible=false,started=false,failed=false,ready=null;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function fail(){failed=true;msg.textContent=S.err;msg.hidden=false}
function loadScript(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function start(){
  if(started)return ready;started=true;msg.textContent=S.load;msg.hidden=false;
  ready=Promise.all([fetch('/rewound/try/looks.json').then(function(r){return r.json()}),loadScript('/rewound/try/canvaskit.js').then(function(){return CanvasKitInit({locateFile:function(f){return '/rewound/try/'+f}})})])
  .then(function(r){data=r[0];CK=r[1];return fetch('/rewound/try/sample.jpg').then(function(x){return x.arrayBuffer()})})
  .then(function(buf){var im=CK.MakeImageFromEncoded(buf);if(!im)throw 0;if(!setImage(im,720,960))throw 0;msg.hidden=true})
  .catch(fail);
  return ready;
}
function setImage(image,w,h){
  if(photo){photo.delete();photo=null}
  if(surface){surface.delete();surface=null}
  img=image;W=w;H=h;cvs.width=w;cvs.height=h;
  surface=CK.MakeWebGLCanvasSurface(cvs);
  if(!surface)return false;
  var k=Math.max(w/img.width(),h/img.height());
  photo=img.makeShaderCubic(CK.TileMode.Clamp,CK.TileMode.Clamp,0,0.5,CK.Matrix.multiply(CK.Matrix.translated((w-img.width()*k)/2,(h-img.height()*k)/2),CK.Matrix.scaled(k,k)));
  poster.hidden=true;cvs.hidden=false;
  loop();return true;
}
function render(t){
  if(!surface||!photo)return;
  var L=data.looks[cur],eff=effects[L.key];
  if(!eff){eff=effects[L.key]=CK.RuntimeEffect.Make(data.shaders[L.key]);}
  if(!eff){fail();return}
  var u=[];
  for(var i=0;i<eff.getUniformCount();i++){var n=eff.getUniformName(i);
    if(n==='res'){u.push(W,H)}else if(n==='time'){u.push(t)}else if(n==='seed'){u.push(0.37)}else{u.push(L.u[n]||0)}}
  var sh=eff.makeShaderWithChildren(u,[photo]),p=new CK.Paint();p.setShader(sh);
  surface.getCanvas().drawPaint(p);surface.flush();sh.delete();p.delete();
}
function tick(ts){raf=requestAnimationFrame(tick);if(ts-last<33)return;last=ts;render(ts/1000+1.7)}
function loop(){
  cancelAnimationFrame(raf);raf=0;
  if(!data||!surface||failed)return;
  if(data.looks[cur].animated&&!reduce&&visible&&!document.hidden){raf=requestAnimationFrame(tick)}else{render(1.7)}
}
function pick(i){
  cur=i;chips.forEach(function(b,j){b.setAttribute('aria-pressed',j===i?'true':'false')});
  var b=chips[i];tname.textContent=b.getAttribute('data-name');tgroup.textContent=b.getAttribute('data-group');
  if(started){loop()}else{start()}
}
chips.forEach(function(b,i){b.addEventListener('click',function(){pick(i)})});
if('IntersectionObserver' in window){
  new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible&&!started){start()}loop()},{rootMargin:'300px'}).observe(root);
}else{visible=true;start()}
document.addEventListener('visibilitychange',loop);
function useFile(f){
  start().then(function(){
    if(failed)return;
    var load=window.createImageBitmap?createImageBitmap(f,{imageOrientation:'from-image'}).catch(function(){return createImageBitmap(f)}):new Promise(function(ok,no){var im=new Image();im.onload=function(){ok(im)};im.onerror=no;im.src=URL.createObjectURL(f)});
    return load.then(function(bm){
      var bw=bm.width||bm.naturalWidth,bh=bm.height||bm.naturalHeight,k=Math.min(1,1080/Math.max(bw,bh)),w=Math.max(2,Math.round(bw*k)),h=Math.max(2,Math.round(bh*k));
      var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(bm,0,0,w,h);
      var im=CK.MakeImageFromCanvasImageSource(c);if(!im||!setImage(im,w,h))fail();
    });
  }).catch(fail);
}
file.addEventListener('change',function(){if(file.files&&file.files[0])useFile(file.files[0]);file.value=''});
root.querySelector('[data-sample]').addEventListener('click',function(){
  start().then(function(){if(failed)return;return fetch('/rewound/try/sample.jpg').then(function(r){return r.arrayBuffer()}).then(function(b){var im=CK.MakeImageFromEncoded(b);if(!im||!setImage(im,720,960))fail()})}).catch(fail);
});
root.querySelector('[data-save]').addEventListener('click',function(){
  start().then(function(){
    if(failed||!surface)return;render(1.7);
    var snap=surface.makeImageSnapshot(),bytes=snap.encodeToBytes();snap.delete();
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));a.download='rewound-'+data.looks[cur].name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png';
    document.body.appendChild(a);a.click();a.remove();
  });
});
})();