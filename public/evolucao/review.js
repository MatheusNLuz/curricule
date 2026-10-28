(() => {
  'use strict';
  const REVIEW = window.CURRICULE_REVIEW;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const storageKey = 'curricule-evolucao-2026-10-25';
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* A prévia funciona sem armazenamento. */ }
  const selected = new Set((Array.isArray(stored.items) ? stored.items : []).filter(id => REVIEW.some(item => item.id === id)));
  const models = new Set((Array.isArray(stored.models) ? stored.models : []).filter(id => ['executivo','direto'].includes(id)));
  let category = 'Todas';
  let toastTimer;
  const priorities = {antes:'Antes de divulgar',proxima:'Próxima rodada',evolucao:'Evolução'};
  const types = {codigo:'Confirmado no código',validar:'Validar no uso real',sugestao:'Sugestão de evolução'};
  const phases = [
    {title:'Confiar no fluxo',description:'Recuperação de falhas, notas claras e entrega validada.'},
    {title:'Completar o produto',description:'Edição completa, boas escolhas e revisão mais fácil.'},
    {title:'Preparar a venda',description:'Conta, suporte, privacidade, operação e medição.'},
    {title:'Aprender e evoluir',description:'Novas capacidades depois de observar o uso real.'}
  ];
  function notify(message) {
    $('#toast').textContent = message; $('#toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; },3500);
  }
  function save() {
    try { localStorage.setItem(storageKey,JSON.stringify({items:[...selected],models:[...models],theme:document.documentElement.dataset.theme})); }
    catch { notify('Armazenamento indisponível. Baixe sua seleção antes de fechar esta aba.'); }
    updateSelection();
  }
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('#theme').setAttribute('aria-label',theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
  }
  applyTheme(stored.theme === 'dark' ? 'dark' : 'light');
  $('#theme').addEventListener('click',() => { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); save(); });
  function renderFinding(item) {
    return `<article class="finding" id="item-${escape(item.id)}"><div class="finding-head"><div><div class="finding-meta"><span class="priority ${item.priority}">${priorities[item.priority]}</span><span>${escape(item.area)}</span><span>·</span><span>${types[item.type]}</span></div><h3>${escape(item.title)}</h3><p>${escape(item.summary)}</p></div><label class="finding-selection" title="Adicionar à seleção"><input type="checkbox" data-item="${escape(item.id)}" aria-label="Selecionar: ${escape(item.title)}" ${selected.has(item.id)?'checked':''}></label></div><details><summary>Entender o motivo e a proposta</summary><div class="finding-body"><div><h4>O que observei</h4><p>${escape(item.observed)}</p></div><div><h4>Por que importa</h4><p>${escape(item.why)}</p></div><div><h4>Como eu melhoraria</h4><p>${escape(item.proposal)}</p></div><div><h4>Como saber se ficou pronto</h4><ul>${item.accept.map(text=>`<li>${escape(text)}</li>`).join('')}</ul></div><div class="finding-evidence"><h4>Fontes desta observação</h4>${item.paths.map(path=>`<code>${escape(path)}</code>`).join('<br>')}</div><div class="finding-footer">Esforço relativo: <strong>${escape(item.effort)}</strong> · Dependência: ${escape(item.dependency)}</div></div></details></article>`;
  }
  function renderFindings() {
    const query = normalize($('#search').value);
    const items = REVIEW.filter(item => (category === 'Todas' || item.area === category) && ($('#priority').value === 'all' || item.priority === $('#priority').value) && ($('#evidence').value === 'all' || item.type === $('#evidence').value) && normalize([item.title,item.summary,item.observed,item.why,item.proposal,item.area,priorities[item.priority],types[item.type],...item.accept,...item.paths,item.id==='pontuacao'?'pontuação scores notas':''].join(' ')).includes(query));
    $('#findings').innerHTML = items.map(renderFinding).join('');
    $('#results-status').textContent = `${items.length} de ${REVIEW.length} recomendações · ${selected.size} selecionadas`;
    $('#no-results').hidden = items.length !== 0;
  }
  function updateSelection() {
    $('#selection-count').textContent = selected.size + models.size;
    $$('[data-item]').forEach(input => { input.checked = selected.has(input.dataset.item); });
    $$('[data-model]').forEach(input => { input.checked = models.has(input.dataset.model); });
    $('#chosen-models').textContent = models.size ? [...models].map(id => id === 'executivo' ? 'Executivo ATS' : 'Direto ATS').join(' e ') + ' — aguardando sua aprovação para integrar.' : 'Nenhum modelo selecionado.';
    $('#plan').innerHTML = phases.map((phase,index) => {
      const items = REVIEW.filter(item => item.phase === index && selected.has(item.id));
      return `<article class="plan-phase"><span class="phase-label">Etapa ${index+1} · ${items.length} ${items.length===1?'item':'itens'}</span><h3>${phase.title}</h3><p>${phase.description}</p>${items.length ? items.map(item => `<div class="plan-item"><span>${escape(item.title)}<br><small class="muted">${escape(item.area)} · esforço ${item.effort.toLowerCase()}</small></span><button data-remove="${escape(item.id)}" aria-label="Remover: ${escape(item.title)}">×</button></div>`).join('') : '<span class="plan-empty">Selecione recomendações para esta etapa.</span>'}</article>`;
    }).join('');
    $('#plan-status').textContent = `${selected.size} recomendações e ${models.size} modelos selecionados. Nenhuma alteração executada.`;
    if (!$('#revisao').hidden) {
      const visible = $$('#findings > article').length;
      $('#results-status').textContent = `${visible} de ${REVIEW.length} recomendações · ${selected.size} selecionadas`;
    }
  }
  function route() {
    const key = location.hash.slice(1);
    const current = ['modelos','revisao','selecao'].includes(key) ? key : 'modelos';
    $$('.tab-panel').forEach(panel => { panel.hidden = panel.id !== current; });
    $$('[data-tab]').forEach(link => { if (link.dataset.tab === current) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
    if (current === 'revisao') renderFindings();
    document.title = `Curricule · ${{modelos:'Dois novos modelos ATS',revisao:'Revisão do sistema',selecao:'Minha seleção'}[current]}`;
    requestAnimationFrame(() => {
      if (current === 'modelos') resizePapers();
      if (['modelos','revisao','selecao'].includes(key)) document.getElementById(current).scrollIntoView({block:'start',behavior:'auto'});
    });
  }
  function resizePapers() {
    $$('.paper-stage').forEach(stage => {
      const width = stage.clientWidth;
      if (!width) return;
      const scale = width / 794;
      stage.querySelector('iframe').style.transform = `scale(${scale})`;
      stage.style.height = `${1123*scale}px`;
    });
  }
  const categories = ['Todas',...new Set(REVIEW.map(item => item.area))];
  $('#categories').innerHTML = categories.map(area => `<button data-category="${escape(area)}" aria-pressed="${area===category}">${escape(area)}</button>`).join('');
  $('#categories').addEventListener('click',event => {
    const button = event.target.closest('[data-category]'); if (!button) return;
    category = button.dataset.category;
    $$('#categories button').forEach(control => control.setAttribute('aria-pressed',String(control === button)));
    renderFindings();
  });
  $('#findings').addEventListener('change',event => {
    const input = event.target.closest('[data-item]'); if (!input) return;
    if (input.checked) selected.add(input.dataset.item); else selected.delete(input.dataset.item);
    save();
  });
  $$('[data-model]').forEach(input => input.addEventListener('change',() => {
    if (input.checked) models.add(input.dataset.model); else models.delete(input.dataset.model); save();
  }));
  $('#plan').addEventListener('click',event => {
    const button = event.target.closest('[data-remove]'); if (!button) return;
    selected.delete(button.dataset.remove); save();
    $('#plan-title').setAttribute('tabindex','-1'); $('#plan-title').focus({preventScroll:true});
  });
  $('#search').addEventListener('input',renderFindings);
  $('#priority').addEventListener('change',renderFindings);
  $('#evidence').addEventListener('change',renderFindings);
  $('#clear-filters').addEventListener('click',() => {
    $('#search').value=''; $('#priority').value='all'; $('#evidence').value='all'; category='Todas';
    $$('#categories button').forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.category==='Todas'))); renderFindings(); $('#search').focus();
  });
  $('#select-recommended').addEventListener('click',() => {
    ['erro-editor','edicao-nota','editor','fluxo-real','pdf','pontuacao','mobile'].forEach(id=>selected.add(id)); save(); renderFindings(); notify('Recomendações adicionadas à sua seleção. Nada foi aplicado ao sistema.');
  });
  $('#clear-selection').addEventListener('click',() => { selected.clear();models.clear();save();notify('Seleção limpa neste navegador.'); });
  $('#export').addEventListener('click',() => {
    const lines = ['CURRICULE — SELEÇÃO PARA DISCUSSÃO','Revisão de 25/10/2026. Nenhuma alteração aplicada.','',`Modelos: ${models.size ? [...models].map(id=>id==='executivo'?'Executivo ATS':'Direto ATS').join(', ') : 'Nenhum'}`,''];
    phases.forEach((phase,index) => { lines.push(`ETAPA ${index+1}: ${phase.title}`); const items=REVIEW.filter(item=>selected.has(item.id)&&item.phase===index); if(!items.length) lines.push('Nenhum item selecionado.'); items.forEach(item=>lines.push(`- ${item.title} [${priorities[item.priority]} | ${types[item.type]}]`,`  Proposta: ${item.proposal}`,`  Pronto quando: ${item.accept.join(' ')}`,`  Fontes: ${item.paths.join(', ')}`)); lines.push(''); });
    const blob = new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='Curricule_selecao_25-10-2026.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Seleção preparada para download.');
  });
  $('#total-findings').textContent=REVIEW.length;
  new ResizeObserver(resizePapers).observe($('.model-grid'));
  window.addEventListener('hashchange',route);
  updateSelection(); renderFindings(); route(); resizePapers();
})();
