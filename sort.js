(() => {
  "use strict";
  const all = window.SAMPLES;
  const byCode = new Map(all.map(item => [item.code, item]));
  const $ = id => document.getElementById(id);
  const state = { participant: `P-${Date.now().toString(36).toUpperCase()}`, groups: [], assignments: {}, selected: new Set(), order: [] };
  const esc = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[char]);
  function hash(value) { let h = 2166136261; for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
  function shuffle() { let seed = hash(state.participant || "guest"); const data = all.map(item => item.code); for (let i = data.length - 1; i > 0; i--) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const j = seed % (i + 1); [data[i], data[j]] = [data[j], data[i]]; } state.order = data; }
  function tell(text, ok = false) { const node = $("message"); node.textContent = text; node.classList.toggle("ok", ok); }
  function addGroup() { if (state.groups.length >= 12) return tell("最多建立12组；如需调整，请先删除空组或合并现有分组。", false); state.groups.push({ id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: "" }); render(); tell("新组已建立。选择卡片后，点“放入此组”。", true); }
  function assign(groupId) { if (!state.selected.size) return tell("请先选择至少一张卡片。", false); for (const code of state.selected) state.assignments[code] = groupId; state.selected.clear(); render(); tell("卡片已归组。", true); }
  function toggle(code) { if (state.selected.has(code)) state.selected.delete(code); else state.selected.add(code); render(); }
  function placementStyle(sample) { const p = sample.placement; return `left:${p.left}%;top:${p.top}%;width:${p.width}%;height:${p.height}%`; }
  function placedImage(sample) { return `<span class="visual-frame"><img src="${esc(sample.image)}" alt="" style="${placementStyle(sample)}"></span>`; }
  function card(code, mini = false) { const sample = byCode.get(code); const wrap = document.createElement("div"); wrap.className = mini ? "mini-wrap" : "card-wrap"; const button = document.createElement("button"); button.type = "button"; button.className = mini ? "mini-card" : "card"; button.classList.toggle("selected", state.selected.has(code)); button.setAttribute("aria-pressed", state.selected.has(code) ? "true" : "false"); button.setAttribute("aria-label", `${code}，${state.assignments[code] ? "已归组" : "待分类"}，点击选择`); button.draggable = true; button.innerHTML = mini ? `${placedImage(sample)}<span>${code}</span>` : `${placedImage(sample)}<span class="card-foot"><strong>${code}</strong><span>选择</span></span>`; button.addEventListener("click", () => toggle(code)); button.addEventListener("dragstart", event => { event.dataTransfer.setData("text/plain", code); event.dataTransfer.effectAllowed = "move"; }); const zoom = document.createElement("button"); zoom.type = "button"; zoom.className = "zoom-button"; zoom.textContent = "⌕"; zoom.title = `放大 ${code}`; zoom.setAttribute("aria-label", `放大 ${code}`); zoom.addEventListener("click", () => preview(code)); wrap.append(button, zoom); return wrap; }
  function preview(code) { const sample = byCode.get(code); $("preview-code").textContent = code; $("preview-image").src = sample.image; $("preview-image").alt = `${code} 包装大图`; $("preview-image").setAttribute("style", placementStyle(sample)); $("preview").showModal(); }
  function render() {
    const assigned = Object.keys(state.assignments).filter(code => byCode.has(code)).length;
    $("progress").textContent = `${assigned} / ${all.length}`;
    $("progress-fill").style.width = `${assigned / all.length * 100}%`;
    $("unassigned-count").textContent = `(${all.length - assigned})`;
    $("group-count").textContent = `(${state.groups.length})`;
    $("new-group").disabled = state.groups.length >= 12;
    $("new-group-bottom").disabled = state.groups.length >= 12;
    $("selected-count").textContent = state.selected.size ? `已选 ${state.selected.size} 张` : "未选卡片";
    $("quick-bar").hidden = state.selected.size === 0;
    $("quick-selected").textContent = `已选 ${state.selected.size} 张`;
    const quick = $("quick-group"), previous = quick.value; quick.replaceChildren();
    for (const [index, group] of state.groups.entries()) { const option = document.createElement("option"); option.value = group.id; option.textContent = group.name.trim() || `第 ${index + 1} 组`; quick.append(option); }
    if (state.groups.some(group => group.id === previous)) quick.value = previous;
    $("quick-assign").disabled = state.groups.length === 0;
    const tray = $("unassigned"); tray.replaceChildren();
    for (const code of state.order) if (!state.assignments[code]) tray.append(card(code));
    $("empty-tray").hidden = assigned !== all.length;
    const panel = $("groups"); panel.replaceChildren();
    for (const [index, group] of state.groups.entries()) {
      const wrapper = document.createElement("article"); wrapper.className = "group";
      const members = state.order.filter(code => state.assignments[code] === group.id);
      wrapper.innerHTML = `<div class="group-head"><span class="group-index">${index + 1}</span><input class="group-name" aria-label="第${index + 1}组名称" placeholder="给这一组起个名字（可选）"><button class="delete-group" type="button" title="删除这一组" aria-label="删除第${index + 1}组">×</button></div><div class="group-actions"><span>${members.length} 张卡</span><button type="button">放入此组</button></div><div class="group-thumbs"></div>`;
      const name = wrapper.querySelector(".group-name"); name.value = group.name;
      name.addEventListener("input", () => { group.name = name.value; });
      wrapper.querySelector(".delete-group").addEventListener("click", () => { if (members.length && !confirm(`删除第${index + 1}组？其中 ${members.length} 张卡将返回待分类区。`)) return; for (const code of members) delete state.assignments[code]; state.groups.splice(index, 1); render(); });
      wrapper.querySelector(".group-actions button").addEventListener("click", () => assign(group.id));
      const thumbs = wrapper.querySelector(".group-thumbs");
      if (!members.length) thumbs.innerHTML = `<span class="drop-hint">可把卡片拖到这里</span>`;
      for (const code of members) thumbs.append(card(code, true));
      wrapper.addEventListener("dragover", event => { event.preventDefault(); wrapper.classList.add("dragover"); });
      wrapper.addEventListener("dragleave", () => wrapper.classList.remove("dragover"));
      wrapper.addEventListener("drop", event => { event.preventDefault(); wrapper.classList.remove("dragover"); const code = event.dataTransfer.getData("text/plain"); if (byCode.has(code)) { state.assignments[code] = group.id; state.selected.delete(code); render(); } });
      panel.append(wrapper);
    }
  }
  function payload(status) { return { schemaVersion: 1, poolId: window.POOL_ID, status, participantId: state.participant.trim(), exportedAt: new Date().toISOString(), groups: state.groups.map(g => ({ id: g.id, name: g.name.trim() })), assignments: Object.fromEntries(Object.entries(state.assignments).sort()) }; }
  async function download(data, filename) { const contents = JSON.stringify(data, null, 2); if (window.showSaveFilePicker) { try { const handle = await window.showSaveFilePicker({suggestedName:filename,types:[{description:"JSON 分类结果",accept:{"application/json":[".json"]}}]}); const stream = await handle.createWritable(); await stream.write(contents); await stream.close(); return true; } catch (error) { if (error.name === "AbortError") return false; } } const blob = new Blob([contents], {type:"application/json"}); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000); return true; }
  async function exportResult(final) {
    state.participant = $("participant").value.trim();
    if (!state.participant) return tell("请先填写作答编号。", false);
    if (final && Object.keys(state.assignments).length !== all.length) return tell(`还有 ${all.length - Object.keys(state.assignments).length} 张卡未归组。完成全部卡片后再导出。`, false);
    if (final) { const count = new Set(Object.values(state.assignments)).size; if (count < 6 || count > 12) return tell(`当前有 ${count} 个有卡片的分组；完成时须为6–12组。单张卡可独立成组。`, false); }
    const status = final ? "complete" : "draft";
    const saved = await download(payload(status), `${window.POOL_ID}_${state.participant.replace(/[^\w\u4e00-\u9fa5-]/g,"_")}_${status}.json`);
    if (saved) tell(final ? "结果已保存。请把 JSON 文件交给研究者。" : "草稿已保存；下次可用“读取草稿”继续。", true);
  }
  async function loadDraft(file) {
    let data; try { data = JSON.parse(await file.text()); } catch { return tell("无法读取 JSON 文件。", false); }
    if (data.poolId !== window.POOL_ID || !Array.isArray(data.groups) || typeof data.assignments !== "object" || !data.assignments) return tell("文件与当前40款候选池不匹配。", false);
    const ids = new Set(data.groups.map(g => g.id));
    if (data.groups.length > 12 || data.groups.some(g => !g.id || typeof g.name !== "string") || Object.entries(data.assignments).some(([code, id]) => !byCode.has(code) || !ids.has(id))) return tell("草稿的分组或卡片数据无效。", false);
    state.participant = String(data.participantId || state.participant).slice(0, 32); $("participant").value = state.participant;
    state.groups = data.groups.map(g => ({id:g.id,name:g.name})); state.assignments = {...data.assignments}; state.selected.clear(); shuffle(); render(); tell("草稿已读取，可以继续分类。", true);
  }
  $("participant").value = state.participant;
  $("participant").addEventListener("change", event => { state.participant = event.target.value.trim(); shuffle(); render(); });
  $("new-group").addEventListener("click", addGroup);
  $("new-group-bottom").addEventListener("click", addGroup);
  $("clear-selection").addEventListener("click", () => { state.selected.clear(); render(); });
  $("download-draft").addEventListener("click", () => exportResult(false));
  $("export").addEventListener("click", () => exportResult(true));
  $("load-draft").addEventListener("change", async event => { const file = event.target.files[0]; if (file) await loadDraft(file); event.target.value = ""; });
  $("close-preview").addEventListener("click", () => $("preview").close());
  $("quick-assign").addEventListener("click", () => assign($("quick-group").value));
  shuffle(); render();
})();
