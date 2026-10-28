/* Local-only interactions. No network requests, cookies or storage. */
(() => {
  const picker = document.querySelector('#screen-picker');
  const toast = document.querySelector('#preview-toast');
  let toastTimer;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3800);
  }
  function navigate() {
    const requested = location.hash.slice(1) || 'inicio';
    const id = document.querySelector(`[data-screen="${CSS.escape(requested)}"]`) ? requested : 'inicio';
    document.querySelectorAll('[data-screen]').forEach(el => { el.hidden = el.dataset.screen !== id; });
    picker.value = id;
    document.querySelectorAll('[data-nav]').forEach(el => {
      const active = el.dataset.nav === id || (['resultado','vaga','perguntas','linkedin','editor','carta'].includes(id) && el.dataset.nav === 'nova') || (['usuarios','usuario','auditoria'].includes(id) && el.dataset.nav === 'admin');
      el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    document.querySelectorAll('.adminTabs a').forEach(el => el.classList.toggle('active', el.hash === '#' + id || id === 'usuario' && el.hash === '#usuarios'));
    document.title = 'Curricule · ' + picker.selectedOptions[0].textContent + ' · Prévia';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  picker.addEventListener('change', () => { location.hash = picker.value; });
  window.addEventListener('hashchange', navigate);
  document.querySelectorAll('.themeButton').forEach(button => button.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('.reviewTheme').firstChild.textContent = dark ? 'Claro ' : 'Escuro ';
  }));
  function selectInput(id) {
    document.querySelectorAll('[data-input]').forEach(el => { el.classList.toggle('selected', el.dataset.input === id); el.setAttribute('aria-pressed', String(el.dataset.input === id)); });
    document.querySelectorAll('[data-panel]').forEach(el => { el.hidden = el.dataset.panel !== id; });
  }
  document.querySelectorAll('[data-input]').forEach(button => button.addEventListener('click', () => selectInput(button.dataset.input)));
  document.querySelectorAll('[data-goal]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-goal]').forEach(el => { el.classList.toggle('selected', el === button); el.setAttribute('aria-pressed', String(el === button)); });
    document.querySelector('.jobInput').hidden = button.dataset.goal !== 'vaga';
    selectInput(button.dataset.goal === 'linkedin' ? 'link' : 'pdf');
  }));
  document.querySelectorAll('[data-job]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-job]').forEach(el => el.classList.toggle('selected', el === button));
    document.querySelectorAll('[data-job-panel]').forEach(el => { el.hidden = el.dataset.jobPanel !== button.dataset.job; });
  }));
  document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-answer]').forEach(el => el.classList.toggle('selected', el === button));
    document.querySelector('#answer-detail').value = button.dataset.answer;
  }));
  document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => notify(button.dataset.toast)));
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const source = document.getElementById(button.dataset.copy);
    if (!source) return;
    try { await navigator.clipboard.writeText(source.innerText); notify('Texto copiado. Revise antes de usar.'); }
    catch { notify('Selecione o texto para copiar.'); }
  }));
  document.querySelector('[data-reject]').addEventListener('click', event => { event.currentTarget.textContent = 'Mantido fora'; event.currentTarget.disabled = true; notify('Informação excluída apenas nesta demonstração.'); });
  document.querySelectorAll('[data-password]').forEach(button => button.addEventListener('click', () => { const input = button.parentElement.querySelector('input'); input.type = input.type === 'password' ? 'text' : 'password'; }));
  document.querySelectorAll('[data-demo-form]').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); location.hash = 'inicio'; notify('Entrada simulada. Nenhuma conta foi criada ou autenticada.'); }));
  document.querySelectorAll('[data-search]').forEach(input => input.addEventListener('input', () => {
    const search = input.value.toLocaleLowerCase('pt-BR');
    const list = document.querySelector(`[data-search-list="${input.dataset.search}"]`);
    list.querySelectorAll('[data-search-item]').forEach(item => { item.hidden = !item.dataset.searchItem.toLocaleLowerCase('pt-BR').includes(search); });
    if (input.dataset.search === 'library') document.querySelector('.emptySearch').hidden = Array.from(list.children).some(el => !el.hidden);
  }));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('selected', el === button));
    document.querySelectorAll('[data-record-kind]').forEach(el => { el.hidden = button.dataset.filter !== 'todos' && el.dataset.recordKind !== button.dataset.filter; });
  }));
  document.querySelectorAll('[data-simulate]').forEach(button => button.addEventListener('click', () => notify(`Leitura de ${button.dataset.simulate} simulada. A integração real será mantida na aplicação.`)));
  document.querySelector('#preview-file').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    document.querySelector('.dropzone strong').textContent = file.name;
    document.querySelector('.dropzone>span').textContent = 'Selecionado nesta prévia. Nenhum arquivo foi enviado.';
  });
  document.querySelectorAll('[data-edit]').forEach(input => input.addEventListener('input', () => {
    const paper = document.querySelector('#screen-editor .paperCanvas .resumePaper');
    const target = input.dataset.edit === 'name' ? paper.querySelector('h2') : input.dataset.edit === 'role' ? paper.querySelector('.paperRole') : paper.querySelector('h3+p');
    target.textContent = input.value;
  }));
  navigate();
})();
