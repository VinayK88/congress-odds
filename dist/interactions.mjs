// Small progressive enhancements; all original controls remain usable without this module.
const source=document.querySelector('#source'),switcher=document.querySelector('#source-switcher');
for(const option of source.options){
 const button=document.createElement('button');button.type='button';button.textContent=option.text;button.dataset.source=option.value;
 button.addEventListener('click',()=>{source.value=option.value;source.dispatchEvent(new Event('change',{bubbles:true}));});switcher.append(button);
}
function syncSource(){for(const button of switcher.children)button.setAttribute('aria-pressed',String(button.dataset.source===source.value));}
source.addEventListener('change',syncSource);syncSource();
const links=[...document.querySelectorAll('.explore-dock a')];
function updateSection(){
 let active=links[0];for(const link of links){const target=document.querySelector(link.hash);if(target&&target.getBoundingClientRect().top<=155)active=link;}
 for(const link of links){if(link===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
}
let ticking=false;window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{updateSection();ticking=false;});}},{passive:true});updateSection();
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){if(!reduceMotion.matches)entry.target.animate([{opacity:.55,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'ease-out'});observer.unobserve(entry.target);}}},{threshold:.08});document.querySelectorAll('.chamber,.comparison,.model-section,.history-section,.scenario-board').forEach(el=>observer.observe(el));}
