/* AP Stats practice app — vanilla JS, localStorage persistence */
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("apstat_" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("apstat_" + k, JSON.stringify(v)); }
};
// state: {mc: {qid: {pick, correct, ts}}, frDone: {qid:true}, learned: {ch:true}}
let progress = LS.get("progress", { mc: {}, frDone: {}, learned: {} });
const saveProgress = () => LS.set("progress", progress);

// 知识点章节 → 刷题小节（学完一章立即刷对应题）
const CH_TOPICS = {
  1: ["单变量数据分析", "双变量数据分析"],
  2: ["正态概率"],
  3: ["双变量数据分析"],
  4: ["抽样方法", "抽样偏差", "实验与观察研究"],
  5: ["基本概率规则"],
  6: ["随机变量", "二项与几何分布"],
  7: ["抽样分布"],
  8: ["比例的置信区间", "均值的置信区间", "确定样本量"],
  9: ["显著性检验逻辑", "比例的假设检验", "模拟中的P值"],
  10: ["均值的假设检验", "第一/二类错误与功效"],
  11: ["卡方检验"],
  12: ["斜率的假设检验", "斜率的置信区间"],
};

const app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- 首页 ---------- */
function viewHome() {
  const done = Object.keys(progress.mc).length;
  const correct = Object.values(progress.mc).filter(r => r.correct).length;
  const wrongIds = Object.entries(progress.mc).filter(([, r]) => !r.correct).map(([id]) => +id);
  const chapters = {};
  MC_QUESTIONS.forEach(q => { (chapters[q.chapter] ??= new Set()).add(q.topic); });
  let html = `<h1>AP 统计学 · 自学刷题</h1>
  <p class="sub">练习册全部 ${MC_QUESTIONS.length} 道选择题 + ${FR_QUESTIONS.length} 道简答题，按知识点分类，附中文解析。</p>
  <div class="pbar"><div style="width:${(done / MC_QUESTIONS.length * 100).toFixed(1)}%"></div></div>
  <div class="grid" style="margin-bottom:18px">
    <div class="card stat"><b>${done} / ${MC_QUESTIONS.length}</b>已做题数</div>
    <div class="card stat"><b>${done ? Math.round(correct / done * 100) : 0}%</b>正确率（${correct} 对）</div>
    <div class="card stat"><b>${wrongIds.length}</b>错题待复习 · <a href="#" onclick="go('wrong');return false">去复习</a></div>
  </div>
  <div class="card" style="background:#eff6ff;border-color:#bfdbfe">
    <b style="color:var(--blue)">💡 推荐学习动线</b><br>
    <span style="font-size:14px">到 <a href="#" onclick="go('knowledge');return false">知识点</a> 学一章 → 点章内「学完就刷题」立即练习 → 刷完看战绩，继续下一章。已学 ${Object.keys(progress.learned).length} / ${KNOWLEDGE.length} 章。</span>
  </div>
  <h1 style="font-size:16px;margin-top:16px">按知识点刷题</h1><p class="sub">也可以直接按小节刷题（已做对的排到队尾）。</p>`;
  for (const [ch, topics] of Object.entries(chapters)) {
    html += `<div class="card"><b>${esc(ch)}</b><div style="margin-top:8px">`;
    [...topics].forEach(t => {
      const ids = MC_QUESTIONS.filter(q => q.topic === t);
      const d = ids.filter(q => progress.mc[q.id]).length;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)">
        <span style="font-size:14px">${esc(t)} <span class="stat">（${d}/${ids.length}）</span></span>
        <button class="btn small" onclick="startPractice('${esc(t)}')">开始</button></div>`;
    });
    html += `</div></div>`;
  }
  app.innerHTML = html;
}

/* ---------- 选择题练习 ---------- */
let session = null;
function startPractice(topic, ids, fromCh) {
  let pool = ids ?? MC_QUESTIONS.filter(q => q.topic === topic).map(q => q.id);
  // 已做对的排后面（先做未做和错题）
  pool.sort((a, b) => (progress.mc[a]?.correct ? 1 : 0) - (progress.mc[b]?.correct ? 1 : 0));
  session = { ids: pool, i: 0, pick: undefined, topic, done: 0, correct: 0, fromCh: fromCh ?? null };
  go("practice");
}
function startFromChapter(ch, topic) {
  progress.learned[ch] = true;
  saveProgress();
  startPractice(topic, null, ch);
}
function renderPractice() {
  if (!session) { app.innerHTML = `<h1>选择题</h1><p class="sub">请从首页或错题本选择一个知识点开始。</p>` + '<button class="btn primary" onclick="go(\'home\')">返回首页</button>'; return; }
  const q = MC_QUESTIONS.find(x => x.id === session.ids[session.i]);
  const rec = progress.mc[q.id];
  const answered = !!rec && session.pick !== undefined;
  const picked = session.pick;
  let opts = "";
  for (const L of ["A", "B", "C", "D", "E"]) {
    if (!q.options[L]) continue;
    let cls = "opt";
    if (picked) {
      if (L === q.answer) cls += " right";
      else if (L === picked) cls += " wrong";
    } else if (picked === L) cls += " sel";
    opts += `<button class="${cls}" onclick="pick('${L}')"><span class="letter">${L}</span><span>${esc(q.options[L])}</span></button>`;
  }
  app.innerHTML = `
    <div class="filterbar">
      <span class="chip blue">${esc(q.chapter)}</span><span class="chip">${esc(q.topic)}</span>
      <span class="chip">第 ${session.i + 1} / ${session.ids.length} 题 · 编号 ${q.id}</span>
      ${q.answer ? "" : '<span class="chip" style="background:#fef2f2;color:#dc2626">本题缺答案</span>'}
      <span style="flex:1"></span>
      <button class="btn small" onclick="go('home')">退出</button>
    </div>
    <div class="card">
      <div class="stem">${esc(q.stem)}${q.image ? `<img class="qimg" src="${q.image}" loading="lazy">` : ""}</div>
      ${opts}
      ${picked ? `<div class="expl"><b>答案 ${q.answer ?? "：" + (q.explanation || "暂缺")}</b><br>${esc(q.explanation || "")}</div>
        <div class="qnav">
          <button class="btn" onclick="prevQ()">← 上一题</button>
          <span>${q.answer && picked === q.answer ? "✅ 回答正确" : q.answer ? "❌ 回答错误，已加入错题本" : ""}</span>
          <button class="btn primary" onclick="nextQ()">${session.i + 1 < session.ids.length ? "下一题 →" : "完成本节 ✓"}</button>
        </div>` : ""}
    </div>`;
}
function pick(L) {
  if (session.pick !== undefined) return;
  const q = MC_QUESTIONS.find(x => x.id === session.ids[session.i]);
  session.pick = L;
  session.done++; if (L === q.answer) session.correct++;
  progress.mc[q.id] = { pick: L, correct: L === q.answer, ts: Date.now() };
  saveProgress();
  // 原地更新，不重建容器（避免点击中的节点被移除）
  const qid = session.ids[session.i];
  document.querySelectorAll(".opt").forEach(el => {
    const letter = el.querySelector(".letter").textContent;
    el.onclick = null;
    if (letter === q.answer) el.classList.add("right");
    else if (letter === L) el.classList.add("wrong");
  });
  const card = document.querySelector(".card");
  const div = document.createElement("div");
  div.innerHTML = `<div class="expl"><b>答案 ${q.answer ?? "：" + (q.explanation || "暂缺")}</b><br>${esc(q.explanation || "")}</div>
    <div class="qnav">
      <button class="btn" onclick="prevQ()">← 上一题</button>
      <span>${q.answer && L === q.answer ? "✅ 回答正确" : q.answer ? "❌ 回答错误，已加入错题本" : ""}</span>
      <button class="btn primary" onclick="nextQ()">${session.i + 1 < session.ids.length ? "下一题 →" : "完成本节 ✓"}</button>
    </div>`;
  card.appendChild(div);
}
function nextQ() {
  session.pick = undefined;
  if (session.i + 1 < session.ids.length) { session.i++; renderPractice(); }
  else renderSessionSummary();
}
function renderSessionSummary() {
  const s = session;
  const wrong = s.done - s.correct;
  const ch = s.fromCh;
  const nextCh = ch && KNOWLEDGE.some(k => k.ch === ch + 1) ? ch + 1 : null;
  let html = `<h1>本节完成 🎉</h1>
  <p class="sub">${s.topic ? esc(s.topic) : ""} · 共 ${s.ids.length} 题</p>
  <div class="grid" style="margin-bottom:18px">
    <div class="card stat"><b>${s.done}</b>本次做题</div>
    <div class="card stat"><b>${s.done ? Math.round(s.correct / s.done * 100) : 0}%</b>正确率（${s.correct} 对）</div>
    <div class="card stat"><b>${wrong}</b>错题已收入错题本</div>
  </div>
  <div class="qnav">
    <button class="btn" onclick="go('wrong')">看错题解析</button>
    ${nextCh ? `<button class="btn primary" onclick="go('knowledge',${nextCh})">继续学下一章 →</button>` : `<button class="btn primary" onclick="go('knowledge')">回知识点</button>`}
    <button class="btn" onclick="go('home')">回首页</button>
  </div>`;
  session = null;
  app.innerHTML = html;
}
function prevQ() { if (session.i > 0) { session.i--; session.pick = progress.mc[session.ids[session.i]]?.pick; renderPractice(); } }

/* ---------- 简答题 ---------- */
function viewFR() {
  const groups = {};
  FR_QUESTIONS.forEach(q => (groups[q.chapter] ??= []).push(q));
  let html = `<h1>Free-Response 简答题</h1><p class="sub">先自己作答，再对照参考答案自评。完成过的题目会打勾。</p>`;
  for (const [ch, qs] of Object.entries(groups)) {
    html += `<div class="card"><b>${esc(ch)}</b>`;
    qs.forEach(q => {
      html += `<details style="margin:8px 0;border-bottom:1px solid var(--line);padding:6px 0" ${session?.frOpen === q.id ? "open" : ""}>
        <summary style="cursor:pointer;font-size:14px">Q${q.id} ${progress.frDone[q.id] ? '<span class="badge-done">✓ 已完成</span>' : ""}
        ${q.model ? "" : '<span class="chip" style="background:#fef2f2;color:#dc2626">无参考答案（依赖原书图表）</span>'}</summary>
        <div class="stem" style="margin-top:8px">${esc(q.stem)}${q.image ? `<img class="qimg" src="${q.image}" loading="lazy">` : ""}</div>
        <button class="btn small primary" onclick="markFR(${q.id})">我已完成此题</button>
        ${q.model ? `<div class="frmodel"><b>参考答案</b><br>${esc(q.model)}</div>` : ""}
      </details>`;
    });
    html += `</div>`;
  }
  app.innerHTML = html;
}
function markFR(id) { progress.frDone[id] = true; saveProgress(); viewFR(); }

/* ---------- 错题本 ---------- */
function viewWrong() {
  const wrongIds = Object.entries(progress.mc).filter(([, r]) => !r.correct && r.pick).map(([id]) => +id);
  const redone = Object.entries(progress.mc).filter(([, r]) => r.correct && r.wasWrong).map(([id]) => +id);
  let html = `<h1>错题本</h1><p class="sub">做错的题会自动收进来；重做正确后自动移出。</p>`;
  if (!wrongIds.length) html += `<div class="card">🎉 没有未解决的错题。去做题吧！</div>`;
  else {
    html += `<button class="btn primary" style="margin-bottom:12px" onclick="startPractice(null,${JSON.stringify(wrongIds)})">重做全部错题（${wrongIds.length}）</button>`;
    wrongIds.forEach(id => {
      const q = MC_QUESTIONS.find(x => x.id === id);
      const r = progress.mc[id];
      html += `<div class="card">
        <span class="chip blue">${esc(q.topic)}</span><span class="chip">Q${q.id} · 你选了 ${r.pick}，正确答案 ${q.answer ?? "缺"}</span>
        <div class="stem" style="font-size:13px;color:var(--muted)">${esc(q.stem.slice(0, 140))}…</div>
        <details><summary style="font-size:13px;cursor:pointer">看解析</summary><div class="expl">${esc(q.explanation || "")}</div></details>
      </div>`;
    });
  }
  app.innerHTML = html;
}

/* ---------- 知识点 ---------- */
function viewKnowledge(openCh) {
  const learnedN = Object.keys(progress.learned).length;
  let html = `<h1>知识点 · 学习动线</h1>
  <p class="sub">按顺序学：打开一章读完 → 点「学完就刷题」立即练习对应题目 → 刷完继续下一章。已学 ${learnedN} / ${KNOWLEDGE.length} 章。</p>`;
  for (const k of KNOWLEDGE) {
    const topics = CH_TOPICS[k.ch] || [];
    const isLearned = progress.learned[k.ch];
    html += `<details class="card" data-ch="${k.ch}" ${openCh === k.ch ? "open" : ""}>
      <summary style="cursor:pointer;font-weight:600;font-size:15px">${isLearned ? '<span class="badge-done">✓ 已学</span> ' : ""}${esc(k.title)}</summary>
      <div class="kd" style="margin-top:10px">${k.html}</div>
      ${topics.length ? `<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:12px">
        <b style="font-size:14px">${isLearned ? "复习刷题" : "学完了？去刷题"}</b>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          ${topics.map(t => {
            const ids = MC_QUESTIONS.filter(q => q.topic === t);
            const d = ids.filter(q => progress.mc[q.id]).length;
            return `<button class="btn primary" style="font-size:13px" onclick="startFromChapter(${k.ch},'${esc(t)}')">刷「${esc(t)}」(${d}/${ids.length})</button>`;
          }).join("")}
        </div></div>` : ""}
    </details>`;
  }
  app.innerHTML = html;
}

/* ---------- 路由 ---------- */
function go(view, arg) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
  if (view === "practice") renderPractice();
  else ({ home: viewHome, fr: viewFR, wrong: viewWrong, knowledge: viewKnowledge })[view](arg);
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => go(t.dataset.view));
viewHome();
