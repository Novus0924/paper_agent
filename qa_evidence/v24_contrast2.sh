#!/bin/bash
# v24 对比度（含 alpha 合成）逐页采样
cd "C:/Users/ASUS/Desktop/黑客松/paper_agent"
PCLI=./.qa-pcli/node_modules/.bin/playwright-cli
rs() { sed -n '/### Result/,/^### /p' | sed -n '2p'; }
SAMPLE='(function(){function rgba(c){var m=(c||"").match(/[\d.]+/g);if(!m)return{r:0,g:0,b:0,a:0};return{r:+m[0],g:+m[1],b:+m[2],a:m.length>3?+m[3]:1};}function lum(o){var s=[o.r,o.g,o.b].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}function ratio(f,b){var x=lum(f),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return ((hi+0.05)/(lo+0.05)).toFixed(2);}function effBg(el){var stack=[];var e=el;while(e){var b=rgba(getComputedStyle(e).backgroundColor);if(b.a>0)stack.push(b);if(b.a>=1)break;e=e.parentElement;}stack.reverse();var cur={r:10,g:13,b:19};for(var i=0;i<stack.length;i++){var t=stack[i];cur={r:t.r*t.a+cur.r*(1-t.a),g:t.g*t.a+cur.g*(1-t.a),b:t.b*t.a+cur.b*(1-t.a)};}return cur;}var out=[];var els=Array.from(document.querySelectorAll("main p, main h2, main h3, main span, main td, main a, main li, main button")).filter(function(e){return e.innerText&&e.innerText.trim().length>2&&e.offsetParent!==null;});els.slice(0,400).forEach(function(e){var cs=getComputedStyle(e);var fg=rgba(cs.color);fg.a=1;var bg=effBg(e);out.push([e.innerText.trim().slice(0,18),cs.color,"rgb("+Math.round(bg.r)+","+Math.round(bg.g)+","+Math.round(bg.b)+")",ratio(fg,bg),Math.round(parseFloat(cs.fontSize))]);});return JSON.stringify(out);})()'
$PCLI open --browser=msedge "http://127.0.0.1:5174/" >/dev/null 2>&1
sleep 4
for spec in "/:overview" "/monitor/run-20261011-190412-7o3vm8:monitor" "/report/run-20261011-190412-7o3vm8:report" "/library:library" "/new:new"; do
  path="${spec%%:*}"; name="${spec##*:}"
  $PCLI goto "http://127.0.0.1:5174${path}" >/dev/null 2>&1
  sleep 3
  $PCLI eval "$SAMPLE" 2>&1 | rs > "qa_evidence/v24_contrast2_${name}.json"
  echo "sampled $name"
done
$PCLI close >/dev/null 2>&1
echo DONE
