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