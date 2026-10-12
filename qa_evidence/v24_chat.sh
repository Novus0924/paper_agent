#!/bin/bash
# v24 C5：报告页追问 + 刷新恢复；同时观测 Trace 填充 & 消息角色/重复键
cd "C:/Users/ASUS/Desktop/黑客松/paper_agent"
PCLI=./.qa-pcli/node_modules/.bin/playwright-cli
rs() { sed -n '/### Result/,/^### /p' | sed -n '2p'; }
ev() { $PCLI eval "$1" 2>&1 | rs; }
shot() { $PCLI screenshot --filename="qa_evidence/$1" >/dev/null 2>&1 && echo "  [shot] $1"; }

# 统计页面上的消息角色分布（用户气泡 / 助手文章 / 文本）
MSGSTAT='(function(){var u=document.querySelectorAll("[class*=msgUser]").length;var a=document.querySelectorAll("[class*=msgAgent]").length;var texts=Array.from(document.querySelectorAll("[class*=msgUser] [class*=bubble], [class*=msgAgent] [class*=markdown], [class*=msgAgent] p")).map(function(e){return e.innerText.trim().slice(0,30);}).filter(Boolean);return "userBubbles="+u+" agentArticles="+a+" | texts="+texts.join(" ~ ");})()'

$PCLI open --browser=msedge "http://127.0.0.1:5174/report/run-20261011-190412-7o3vm8" >/dev/null 2>&1
sleep 5
echo "=== 刷新前（初次打开） ==="
echo "研究过程 chips: $(ev "() => { var t=document.body.innerText; return (t.match(/思考\s*\d+\s*段|工具\s*\d+\s*次|进展\s*\d+\s*条/g)||[]).join(' | '); }")"
echo "Trace 条目: $(ev "() => document.querySelectorAll('[class*=traceItem]').length")"
echo "消息分布: $(ev "$MSGSTAT")"
echo "Composer 存在: $(ev "() => !!document.querySelector('#composer-textarea') ? 'YES' : 'NO'")"

echo "=== 发送追问 ==="
$PCLI eval "(function(){var ta=document.getElementById('composer-textarea'); if(!ta) return 'no-ta'; var setter=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set; setter.call(ta,'请用一句话概括这批文献的方法学共性，并标注证据编号'); ta.dispatchEvent(new Event('input',{bubbles:true})); return 'typed';})()" >/dev/null 2>&1
sleep 1
$PCLI eval "(function(){var b=document.querySelector('button[aria-label=\"发送\"],button[aria-label=\"Send\"]'); if(!b) return 'no-btn'; if(b.disabled) return 'disabled'; b.click(); return 'sent';})()" 2>&1 | rs

echo "=== 轮询等待 assistant 回复（≤100s） ==="
for i in $(seq 1 20); do
  sleep 5
  st=$(ev "() => { var a=document.querySelectorAll('[class*=msgAgent]').length; var u=document.querySelectorAll('[class*=msgUser]').length; var sp=!!document.querySelector('[class*=sending]'); return 'agent='+a+' user='+u+' sending='+sp; }")
  echo "  [$i] $st"
  case "$st" in *"agent=1"*) echo "  -> assistant 回复已到"; break;; esac
done
echo "=== 追问后 ==="
echo "消息分布: $(ev "$MSGSTAT")"
echo "研究过程 chips: $(ev "() => { var t=document.body.innerText; return (t.match(/思考\s*\d+\s*段|工具\s*\d+\s*次|进展\s*\d+\s*条/g)||[]).join(' | '); }")"
echo "Trace 条目: $(ev "() => document.querySelectorAll('[class*=traceItem]').length")"
shot "v24_chat_restore.png"

echo "=== 刷新页面 ==="
$PCLI eval "() => { location.reload(); return 'reloading'; }" >/dev/null 2>&1
sleep 6
echo "刷新后消息分布: $(ev "$MSGSTAT")"
echo "刷新后用户侧文本: $(ev "() => Array.from(document.querySelectorAll('[class*=msgUser]')).map(function(e){return e.innerText.replace(/\n/g,' ').slice(0,40);}).join(' ## ')")"
echo "刷新后助手侧文本: $(ev "() => Array.from(document.querySelectorAll('[class*=msgAgent]')).map(function(e){return e.innerText.replace(/\n/g,' ').slice(0,40);}).join(' ## ')")"
shot "v24_chat_restore_after_reload.png"

echo "=== console ==="
$PCLI console 2>&1 | grep -E "Total messages|same key|\[ERROR\]" | head -12
$PCLI close >/dev/null 2>&1
echo DONE
