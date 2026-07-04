const grid = document.getElementById('grid');

async function refresh() {
  const artworks = await (await fetch('/__admin/api/artworks')).json();
  grid.innerHTML = '';
  if (!artworks.length) {
    grid.innerHTML = '<p style="color:#9aa0a8">No artworks yet - create one to get started.</p>';
    return;
  }
  for (const a of artworks) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${a.trigger
        ? `<img src="/artworks/${a.slug}/${a.trigger}?t=${Date.now()}" alt="" />`
        : '<div class="noimg">no trigger image</div>'}
      <div class="body">
        <div class="t">${a.title}</div>
        <div class="badges">
          ${a.hasMind ? '✓ compiled' : '<span class="warn">⚠ not compiled</span>'} ·
          ${a.layers} layer${a.layers === 1 ? '' : 's'}
        </div>
        <div class="actions">
          <a href="/admin/compiler.html?slug=${a.slug}">Compile</a>
          <a href="/admin/editor.html?slug=${a.slug}">Edit layers</a>
          <a href="/ar/${a.slug}/" target="_blank">Open viewer</a>
          ${a.hasQr ? `<a href="/artworks/${a.slug}/qr.png" target="_blank">QR</a>` : ''}
          <button class="danger" data-del="${a.slug}">Delete</button>
        </div>
      </div>`;
    grid.appendChild(card);
  }
  grid.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const slug = btn.dataset.del;
      if (!confirm(`Delete artwork "${slug}" and all its files? This cannot be undone.`)) return;
      await fetch(`/__admin/api/artworks/${slug}`, { method: 'DELETE' });
      refresh();
    });
  });
}

document.getElementById('new').addEventListener('click', async () => {
  const slug = prompt('Slug for the new artwork (lowercase letters, digits, hyphens - becomes the URL):');
  if (!slug) return;
  const title = prompt('Title:', slug) || slug;
  const res = await fetch('/__admin/api/artworks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, title })
  });
  if (!res.ok) return alert((await res.json()).error);
  location.href = `/admin/compiler.html?slug=${slug}`;
});

refresh();
