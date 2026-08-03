document.addEventListener('DOMContentLoaded', async () => {
    await MenuBuilder.buildStaticPagesMenu();
    MenuBuilder.buildFavoriteMenu();
    await MenuBuilder.buildSidebarMenu();
    await MenuBuilder.buildUsefulLinksMenu();
    await MenuBuilder.buildTagsCloud();
    const router = new Router(); const searchEngine = new SearchEngine();
    const st = document.getElementById('sidebarToggle'), sb = document.getElementById('sidebar'), sc = document.getElementById('sidebarClose'), so = document.getElementById('sidebarOverlay');
    const open = () => { sb.classList.add('active'); so.classList.add('active'); document.body.classList.add('sidebar-open'); st.classList.add('active'); };
    const close = () => { sb.classList.remove('active'); so.classList.remove('active'); document.body.classList.remove('sidebar-open'); st.classList.remove('active'); };
    st?.addEventListener('click', () => sb.classList.contains('active') ? close() : open());
    sc?.addEventListener('click', close); so?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sb.classList.contains('active')) close(); });
    sb.addEventListener('click', (e) => { if (e.target.closest('a[href]') && window.innerWidth <= 768) setTimeout(close, 200); });
    const si = document.getElementById('searchInput'), sbtn = document.getElementById('searchButton'), sr = document.getElementById('searchResults');
    if (si) { si.addEventListener('input', () => { const q = si.value.trim(); if (searchEngine.searchTimeout) clearTimeout(searchEngine.searchTimeout); if (q.length >= searchEngine.minSearchLength) { searchEngine.searchTimeout = setTimeout(async () => { if (sr) { sr.innerHTML = '<div class="search-loading">در حال جستجو...</div>'; sr.style.display = 'block'; } try { const { results, total } = await searchEngine.search(q); searchEngine.renderSidebarResults(results, total, q); } catch (e) { if (sr) { sr.innerHTML = '<div class="no-results">خطا</div>'; sr.style.display = 'block'; } } }, 300); } else { if (sr) { sr.style.display = 'none'; sr.innerHTML = ''; } } }); si.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const q = si.value.trim(); if (q.length >= searchEngine.minSearchLength) { router.navigate(`?search=${encodeURIComponent(q)}`); if (sr) sr.style.display = 'none'; si.value = ''; if (window.innerWidth <= 768) close(); } } }); }
    sbtn?.addEventListener('click', () => { const q = si.value.trim(); if (q.length >= searchEngine.minSearchLength) { router.navigate(`?search=${encodeURIComponent(q)}`); if (sr) sr.style.display = 'none'; si.value = ''; if (window.innerWidth <= 768) close(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-widget') && sr) sr.style.display = 'none'; });
    document.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-page]'); if (t) { e.preventDefault(); const p = t.dataset.page; document.querySelectorAll('.horizontal-menu a').forEach(a => a.classList.remove('active')); t.classList.add('active'); if (p === 'home' || p === 'all-posts') router.navigate(''); else router.navigate(`?page_slug=${encodeURIComponent(p)}`); }
        const f = e.target.closest('[data-favorites]'); if (f) { e.preventDefault(); router.navigate('?favorites=all'); }
    });
    document.addEventListener('click', async (e) => { const pl = e.target.closest('[data-post]'); if (pl) { e.preventDefault(); const s = pl.dataset.post; if (s) { router.navigate(`?post=${encodeURIComponent(s)}`); window.scrollTo({ top: 0, behavior: 'smooth' }); if (window.innerWidth <= 768) close(); } } });
    document.querySelector('.site-title a')?.addEventListener('click', (e) => { e.preventDefault(); router.navigate(''); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.querySelector('.site-subtitle a')?.addEventListener('click', (e) => { e.preventDefault(); router.navigate(''); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.addEventListener('click', (e) => { const al = e.target.closest('.all-posts-link'); if (al) { e.preventDefault(); router.navigate(''); window.scrollTo({ top: 0, behavior: 'smooth' }); if (window.innerWidth <= 768) close(); } });
});