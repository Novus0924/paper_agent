#!/bin/bash
# v24 对比度 + 浅色残留采样（逐页），结果写 qa_evidence/v24_contrast_<page>.json
cd "C:/Users/ASUS/Desktop/黑客松/paper_agent"
PCLI=./.qa-pcli/node_modules/.bin/playwright-cli
rs() { sed -n '/### Result/,/^### /p' | sed -n '2p'; }
SAMPLE='(function(){function L(c){var m=c.match(/[\d.]+/g).map(Number);var s=m.slice(0,3).map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}function C(a,b){var x=L(a),y=L(b),hi=Math.max(x,y),lo=Math.min(x,y);return ((hi+0.05)/(lo+0.05)).toFixed(2);}function vbg(el){var e=el;while(e){var bg=getComputedStyle(e).backgroundColor;if(bg&&bg!=="rgba(0, 0, 0, 0)"&&bg!=="transparent")return bg;e=e.parentElement;}return "rgb(10,13,19)";}var out=[];var els=Array.from(document.querySelectorAll("main p, main h2, main h3, main span, main td, main a, main li, main button")).filter(function(e){return e.innerText&&e.innerText.trim().length>2&&e.offsetParent!==null;});els.slice(0,400).forEach(function(e){var cs=getComputedStyle(e);out.push([e.innerText.trim().slice(0,18),cs.color,vbg(e),C(cs.color,vbg(e)),Math.round(parseFloat(cs.fontSize))]);});return JSON.stringify(out);})()'
$PCLI open --browser=msedge "http://127.0.0.1:5174/" >/dev/null 2>&1
sleep 4
for spec in "/:overview" "/monitor/run-20261011-190412-7o3vm8:monitor" "/report/run-20261011-190412-7o3vm8:report" "/library:library" "/new:new"; do
  path="${spec%%:*}"; name="${spec##*:}"
  $PCLI goto "http://127.0.0.1:5174${path}" >/dev/null 2>&1
  sleep 3
  $PCLI eval "$SAMPLE" 2>&1 | rs > "qa_evidence/v24_contrast_${name}.json"
  echo "sampled $name"
done
$PCLI close >/dev/null 2>&1
echo DONE
