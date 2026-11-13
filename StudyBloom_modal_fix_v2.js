
/* StudyBloom modal fix. Load after the main inline script. */
(() => {
  const $ = id => document.getElementById(id);

  window.openModal = (title, html) => {
    const modal = $('modal'), heading = $('modalTitle'), body = $('modalBody');
    if (!modal || !heading || !body) {
      console.error('StudyBloom: modal elements not found.');
      return;
    }
    heading.textContent = title || '';
    body.innerHTML = html || '';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  };

  window.closeModal = () => {
    const modal = $('modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  };

  const modal = $('modal');
  if (modal) modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  window.openSubject = i => {
    const s = state.subjects[i];
    if (!s) return;

    const rows = (s.chapters || []).map((c,j) => `
      <div style="display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #ddd">
        <span><b>${esc(c.name)}</b><br><small>${c.progress || 0}% complete</small></span>
        <span>
          <button class="btn small" onclick="editChapter(${i},${j})">Edit</button>
          <button class="btn small" onclick="removeChapter(${i},${j})">Delete</button>
        </span>
      </div>`).join('') || '<p>No chapters yet. Add your first chapter 🌱</p>';

    openModal(`${esc(s.name)} ${s.icon || ''}`,
      `<p><b>Progress:</b> ${subjectProgress(s)}%</p>${rows}
       <p><button class="btn primary" onclick="addChapter(${i})">＋ Add chapter</button></p>`);
  };

  window.addChapter = i => openModal('Add chapter 🌱', `
    <label>Chapter name</label>
    <input id="sbChapterName" class="input" placeholder="e.g. Motion">
    <label>Progress</label>
    <select id="sbChapterProgress" class="input">
    ${[0,25,50,75,100].map(n=>`<option value="${n}">${n}%</option>`).join('')}
    </select>
    <p><button class="btn primary" onclick="saveNewChapter(${i})">Save chapter</button></p>`);

  window.saveNewChapter = i => {
    const name = ($('sbChapterName')?.value || '').trim();
    if (!name) return alert('Please enter a chapter name.');
    state.subjects[i].chapters ||= [];
    state.subjects[i].chapters.push({
      name,
      progress: Number($('sbChapterProgress').value)
    });
    save();
    render();
    closeModal();
  };

  window.editChapter = (i,j) => {
    const c = state.subjects[i]?.chapters?.[j];
    if (!c) return;

    openModal('Edit chapter ✏️', `
      <label>Chapter name</label>
      <input id="sbChapterName" class="input" value="${esc(c.name)}">
      <label>Progress</label>
      <select id="sbChapterProgress" class="input">
      ${[0,25,50,75,100].map(n=>`
        <option value="${n}" ${Number(c.progress)===n?'selected':''}>${n}%</option>
      `).join('')}
      </select>
      <p><button class="btn primary" onclick="saveEditedChapter(${i},${j})">Save changes</button></p>`);
  };

  window.saveEditedChapter = (i,j) => {
    const c = state.subjects[i]?.chapters?.[j];
    const name = ($('sbChapterName')?.value || '').trim();
    if (!c) return;
    if (!name) return alert('Please enter a chapter name.');

    c.name = name;
    c.progress = Number($('sbChapterProgress').value);
    save();
    render();
    closeModal();
  };

  window.removeChapter = (i,j) => {
    const c = state.subjects[i]?.chapters?.[j];
    if (!c || !confirm(`Delete "${c.name}"?`)) return;

    state.subjects[i].chapters.splice(j,1);
    save();
    render();
    closeModal();
  };

  window.openTask = (i=-1) => {
    const t = i >= 0 ? state.tasks[i] : null;

    openModal(t ? 'Edit task ✏️' : 'Add task 🌱', `
      <label>Task</label>
      <input id="sbTaskName" class="input"
        value="${t ? esc(t.name || t.title || '') : ''}"
        placeholder="e.g. Revise Chapter 3">
      <label>Due date</label>
      <input id="sbTaskDate" class="input" type="date"
        value="${t ? esc(t.date || t.due || '') : ''}">
      <p><button class="btn primary" onclick="saveTask(${i})">Save task</button></p>`);
  };

  window.saveTask = i => {
    const name = ($('sbTaskName')?.value || '').trim();
    if (!name) return alert('Please enter a task.');

    const item = {
      name,
      date: $('sbTaskDate')?.value || ''
    };

    if (i >= 0) state.tasks[i] = {...state.tasks[i], ...item};
    else state.tasks.push(item);

    save();
    render();
    closeModal();
  };

  window.editTask = i => openTask(i);

  window.removeTask = i => {
    if (!state.tasks[i] || !confirm('Delete this task?')) return;
    state.tasks.splice(i,1);
    save();
    render();
  };

  window.openScore = (i=-1) => {
    const x = i >= 0 ? state.scores[i] : null;

    openModal(x ? 'Edit score ✏️' : 'Log score 📊', `
      <label>Subject</label>
      <select id="sbScoreSubject" class="input">
      ${state.subjects.map((s,j)=>`
        <option value="${j}" ${x && (x.subjectIndex===j || x.subject===s.name)?'selected':''}>
          ${esc(s.name)}
        </option>`).join('')}
      </select>
      <label>Score</label>
      <input id="sbScoreValue" class="input" type="number" min="0"
        value="${x ? Number(x.score ?? x.marks ?? 0) : ''}">
      <label>Out of</label>
      <input id="sbScoreTotal" class="input" type="number" min="1"
        value="${x ? Number(x.total ?? 20) : 20}">
      <p><button class="btn primary" onclick="saveScore(${i})">Save score</button></p>`);
  };

  window.saveScore = i => {
    const subjectIndex = Number($('sbScoreSubject')?.value || 0);
    const score = Number($('sbScoreValue')?.value);
    const total = Number($('sbScoreTotal')?.value);

    if (!Number.isFinite(score) || !Number.isFinite(total) || score < 0 || total <= 0) {
      return alert('Please enter a valid score.');
    }

    const item = {
      subjectIndex,
      subject: state.subjects[subjectIndex]?.name || '',
      score,
      total
    };

    if (i >= 0) state.scores[i] = {...state.scores[i], ...item};
    else state.scores.push(item);

    save();
    render();
    closeModal();
  };

  window.editScore = i => openScore(i);

  window.removeScore = i => {
    if (!state.scores[i] || !confirm('Delete this score?')) return;
    state.scores.splice(i,1);
    save();
    render();
  };
})();
    
