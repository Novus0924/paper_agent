#!/bin/bash
# v24 C3 监控页 Trace 确定性测试（长等待）
cd "C:/Users/ASUS/Desktop/黑客松/paper_agent"
PCLI=./.qa-pcli/node_modules/.bin/playwright-cli
rs() { sed -n '/### Result/,/^### /p' | sed -n '2p'; }
ev() { $PCLI eval "$1" 2>&1 | rs; }

$PCLI open --browser=msedge "http://127.0.0.1:5174/monitor/run-20261011-190412-7o3vm8" >/dev/null 2>&1
for w in 4 10 20; do
  sleep 4
  echo "t=${w}s: trace条目=$(ev "() => document.querySelectorAll('[class*=traceItem]').length") | activity=$(ev "() => document.querySelectorAll('[class*=traceActivity],[class*=traceItem]').length")"
done
echo "=== 双栏 grid ==="
ev "() => { var g=Array.from(document.querySelectorAll('div')).filter(function(d){var cs=getComputedStyle(d);return cs.display==='grid'&&cs.gridTemplateColumns.split(' ').length>=2;}); return g.length? getComputedStyle(g[0]).gridTemplateColumns : 'NO_GRID'; }"
echo "=== 步骤列表(含耗时) ==="
ev "() => { var items=Array.from(document.querySelectorAll('[class*=stepItem],[class*=stepRow],[class*=step]')).map(function(e){return e.innerText.replace(/\n/g,' ').trim().slice(0,50);}).filter(Boolean); return items.slice(0,10).join(' ## ') || 'NONE'; }"
echo "=== 顶部统计(总进度/总耗时/步骤完成) ==="
ev "() => { var t=document.body.innerText; var m=t.match(/已完成\s*\d+\s*\/\s*\d+|总耗时[^\n]{0,12}|\d+\s*\/\s*\d+\s*步|进度/g); return (m||[]).join(' | ')||'NONE'; }"
echo "=== Trace 空态文案 ==="
ev "() => { var t=document.body.innerText; return t.includes('暂无过程记录')?'HAS_EMPTY_TEXT':'(有内容)'; }"
$PCLI screenshot --filename=qa_evidence/v24_monitor_trace.png >/dev/null 2>&1 && echo "shot saved"
$PCLI console 2>&1 | grep -E "Total messages|\[ERROR\]" | head -6
$PCLI close >/dev/null 2>&1
echo DONE
