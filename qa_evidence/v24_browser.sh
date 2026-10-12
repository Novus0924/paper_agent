#!/bin/bash
# v24 前端推翻重做 终验：深色视觉 + 默认Live/Demo + 顶层布局
cd "C:/Users/ASUS/Desktop/黑客松/paper_agent"
PCLI=./.qa-pcli/node_modules/.bin/playwright-cli
rs() { sed -n '/### Result/,/^### /p' | sed -n '2p'; }
ev() { $PCLI eval "$1" 2>&1 | rs; }
shot() { $PCLI screenshot --filename="qa_evidence/$1" >/dev/null 2>&1 && echo "  [shot] $1"; }

# 对比度计算（WCAG 相对亮度）
CONTRAST='(function(){function L(c){var m=c.match(/[\d.]+/g).map(Number);var s=m.slice(0,3).map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];}window.__c=function(fg,bg){var a=L(fg),b=L(bg);var hi=Math.max(a,b),lo=Math.min(a,b);return ((hi+0.05)/(lo+0.05)).toFixed(2);};return "ok";})()'
# 找可见文本元素并与其背景算对比
SAMPLE='(function(){function visibleBg(el){var e=el;while(e){var bg=getComputedStyle(e).backgroundColor;if(bg&&bg!=="rgba(0, 0, 0, 0)"&&bg!=="transparent")return bg;e=e.parentElement;}return "rgb(10,13,19)";}var out=[];var els=Array.from(document.querySelectorAll("main p, main h1, main h2, main h3, main span, main td, main li")).filter(function(e){return e.innerText&&e.innerText.trim().length>1&&e.offsetParent!==null;});els.slice(0,400).forEach(function(e){var cs=getComputedStyle(e);var fg=cs.color;var bg=visibleBg(e);var fs=parseFloat(cs.fontSize);out.push({t:e.innerText.trim().slice(0,24),fg:fg,bg:bg,r:window.__c(fg,bg),fs:fs});});return JSON.stringify(out);})()'

echo "########## C1 默认 Live（无 ?mode） ##########"
$PCLI open --browser=msedge "http://127.0.0.1:5174/" >/dev/null 2>&1
sleep 4
echo "URL/胶囊:"; ev "() => 'url='+location.href+' | pressed='+document.querySelector('[aria-pressed=\"true\"]')?.innerText"
echo "DEMO条:"; ev "() => document.querySelector('[role=note]')?'HAS':'NO_DEMO_BAR'"
echo "布局:"; ev "() => 'headerH='+document.querySelector('header').getBoundingClientRect().height+' asideW='+document.querySelector('aside,nav').getBoundingClientRect().width"
echo "模式组:"; ev "() => Array.from(document.querySelectorAll('[role=group] button')).slice(0,2).map(b=>b.innerText).join('/')"
echo "状态点:"; ev "() => document.querySelector('[role=group] [role=img]')?.getAttribute('aria-label')"
shot "v24_live_default.png"

echo "########## C2 深色视觉（逐页） ##########"
$PCLI eval "$CONTRAST" >/dev/null 2>&1
for spec in "/:overview" "/monitor/run-20261011-190412-7o3vm8:monitor" "/report/run-20261011-190412-7o3vm8:report" "/library:library" "/new:new"; do
  path="${spec%%:*}"; name="${spec##*:}"
  $PCLI goto "http://127.0.0.1:5174${path}" >/dev/null 2>&1
  sleep 3
  echo "--- /${name} ---"
  echo "  骨架bg: $(ev "() => { var b=getComputedStyle(document.body).backgroundColor; var m=document.querySelector('main'); var h=document.querySelector('header'); var a=document.querySelector('aside,nav'); return 'body='+b+' | main='+(m?getComputedStyle(m).backgroundColor:'?')+' | header='+(h?getComputedStyle(h).backgroundColor:'?')+' | aside='+(a?getComputedStyle(a).backgroundColor:'?'); }")"
  echo "  浅色残留检测: $(ev "() => { var bad=[]; document.querySelectorAll('main *').forEach(function(e){ if(e.offsetParent===null)return; var bg=getComputedStyle(e).backgroundColor; var m=bg.match(/rgb\((\d+), (\d+), (\d+)\)/); if(m){ var r=+m[1],g=+m[2],b=+m[3]; var lum=(0.2126*r+0.7152*g+0.0722*b); if(lum>200) bad.push(e.tagName+'.'+(e.className&&e.className.toString().slice(0,20))+'='+bg); } }); return bad.length? bad.slice(0,6).join(' ; '):'NONE'; }")"
  echo "  对比度抽检(正文/次级): $(ev "$SAMPLE" | python -c "import sys,json; d=json.loads(sys.stdin.read().strip().strip('\"')); d=[x for x in d if x['r'] and float(x['r'])>0]; d.sort(key=lambda x:float(x['r'])); print('min='+str(d[0]['r'])+' ['+d[0]['t'][:16]+'] | examples=' + ' , '.join(x['r'] for x in d[:6]))" 2>/dev/null)"
  shot "v24_${name}.png"
done

echo "########## C3 监控页 Agent Trace ##########"
$PCLI goto "http://127.0.0.1:5174/monitor/run-20261011-190412-7o3vm8" >/dev/null 2>&1
sleep 4
echo "PageTitle/Lead: $(ev "() => { var h=document.querySelector('h2'); var p=document.querySelector('main p'); return (h?h.innerText:'?'); }")"
echo "双栏 traceGrid 存在: $(ev "() => { var g=Array.from(document.querySelectorAll('div')).filter(d=>{var cs=getComputedStyle(d);return cs.display==='grid'&&cs.gridTemplateColumns.split(' ').length>=2;}); return g.length? ('gridCols='+g[0].style.gridTemplateColumns+' computed='+getComputedStyle(g[0]).gridTemplateColumns):'NO_GRID'; }")"
echo "Trace 条目数: $(ev "() => { var t=document.body.innerText; var m=t.match(/活动|工具|思考/g); return document.querySelectorAll('[class*=traceItem]').length; }")"
echo "Trace 条目明细(kind/文本/耗时): $(ev "() => { var its=Array.from(document.querySelectorAll('[class*=traceItem]')).map(function(i){return i.innerText.replace(/\n/g,' ').slice(0,70);}); return 'n='+its.length+' || '+its.slice(0,12).join(' ## '); }")"
echo "总进度/总耗时: $(ev "() => { var t=document.body.innerText; var prog=(t.match(/已完成\s*\d+\s*\/\s*\d+|总耗时[^\n]*|progress/g)||[]).join(' | '); return prog||'NONE'; }")"
shot "v24_monitor_trace.png"

echo "########## C4 报告页 研究过程 ##########"
$PCLI goto "http://127.0.0.1:5174/report/run-20261011-190412-7o3vm8" >/dev/null 2>&1
sleep 4
echo "研究过程标题存在: $(ev "() => document.body.innerText.includes('研究过程')?'YES':'NO'")"
echo "折叠区可展开: $(ev "() => { var b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('完整时间线')||x.innerText.includes('研究过程')); var det=document.querySelector('details'); return 'btn='+(b?b.innerText.trim():'NONE')+' | details='+(det?(det.open?'open':'closed'):'NONE'); }")"
# 尝试展开
$PCLI eval "() => { var b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('完整时间线')); if(b){b.click(); return 'clicked';} return 'no-btn'; }" >/dev/null 2>&1
sleep 1
echo "展开后Trace条目: $(ev "() => 'n='+document.querySelectorAll('[class*=traceItem]').length+' | thinkChip='+(document.body.innerText.match(/思考\s*\d+\s*段/)||['?'])[0]")"
shot "v24_report_process.png"

echo "########## C6 console ##########"
$PCLI console 2>&1 | grep -E "Total messages|\[ERROR\]|Uncaught|TypeError" | head -10
$PCLI close >/dev/null 2>&1
echo "DONE"
