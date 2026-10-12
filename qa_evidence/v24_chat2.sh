#!/bin/bash
# v24 C5 v2：报告页追问 + 刷新恢复（单会话内完成）
cd "C:/Users/ASUS/Desktop/黑客松/paper_agent"
PCLI=./.qa-pcli/node_modules/.bin/playwright-cli
rs() { sed -n '/### Result/,/^### /p' | sed -n '2p'; }
ev() { $PCLI eval "$1" 2>&1 | rs; }
shot() { $PCLI screenshot --filename="qa_evidence/$1" >/dev/null 2>&1 && echo "  [shot] $1"; }
MSG='(function(){var u=document.querySelectorAll("[class*=msgUser]").length;var a=document.querySelectorAll("[class*=msgAgent]").length;var ut=Array.from(document.querySelectorAll("[class*=msgUser]")).map(function(e){return e.innerText.replace(/\n/g," ").slice(0,26);});var at=Array.from(document.querySelectorAll("[class*=msgAgent]")).map(function(e){return e.innerText.replace(/\n/g," ").slice(0,26);});return "user="+u+" agent="+a+" | U["+ut.join(" ~ ")+"] | A["+at.join(" ~ ")+"]";})()'
CHIP='(function(){var t=document.body.innerText;return (t.match(/思考\s*\d+\s*段|工具\s*\d+\s*次|进展\s*\d+\s*条/g)||[]).join(" | ");})()'

$PCLI open --browser=msedge "http://127.0.0.1:5174/report/run-20261011-190412-7o3vm8" >/dev/null 2>&1
sleep 5
echo "=== T0 初次打开 ==="
echo "  消息: $(ev "$MSG")"
echo "  Trace条目: $(ev "() => document.querySelectorAll('[class*=traceItem]').length")"
echo "  研究过程: $(ev "$CHIP")"

echo "=== 发送追问 ==="
ev "(function(){var ta=document.getElementById('composer-textarea');var set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;set.call(ta,'请用一句话概括这批文献的方法学共性，并标注证据编号');ta.dispatchEvent(new Event('input',{bubbles:true}));return 'typed';})()"
sleep 1
ev "(function(){var b=document.querySelector('button[aria-label=\"发送\"]');if(!b)return 'NOBTN';b.click();return 'sent';})()"

echo "=== 轮询等待（≤110s） ==="
for i in $(seq 1 22); do
  sleep 5
  st=$(ev "() => 'user='+document.querySelectorAll('[class*=msgUser]').length+' agent='+document.querySelectorAll('[class*=msgAgent]').length+' trace='+document.querySelectorAll('[class*=traceItem]').length")
  echo "  [$i] $st"
  case "$st" in *"agent=1"*) echo "  -> assistant 回复已到"; break;; esac
done
echo "=== T1 追问后 ==="
echo "  消息: $(ev "$MSG")"
echo "  Trace条目: $(ev "() => document.querySelectorAll('[class*=traceItem]').length")"
echo "  研究过程: $(ev "$CHIP")"
shot "v24_chat_restore.png"

echo "=== 刷新 ==="
ev "() => { location.reload(); return 'reload'; }"
sleep 6
echo "=== T2 刷新后 ==="
echo "  消息: $(ev "$MSG")"
echo "  Trace条目: $(ev "() => document.querySelectorAll('[class*=traceItem]').length")"
echo "  研究过程: $(ev "$CHIP")"
shot "v24_chat_restore_after_reload.png"

echo "=== console ==="
$PCLI console 2>&1 | grep -E "Total messages|same key|\[ERROR\]|\[WARNING\]" | head -14
$PCLI close >/dev/null 2>&1
echo DONE
