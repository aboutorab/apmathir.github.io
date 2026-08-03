class MenuBuilder {
    static async buildStaticPagesMenu() { try { const pages = await BlogEngine.loadPagesData(); const me = document.getElementById('staticPagesMenu'); let h = `<li><a href="index.html" data-page="home" class="active">صفحه اصلی</a></li>`; pages.forEach(p => { h += `<li><a href="?page_slug=${encodeURIComponent(p.slug)}" data-page="${p.slug}">${p.title}</a></li>`; }); me.innerHTML = h; } catch (e) {} }
    
    static async buildFavoriteMenu() {
        const fpl = document.getElementById('favoritePostsList');
        if (!fpl) return;
        try {
            const r = await fetch('data/favorite.json'); if (!r.ok) return;
            const favs = await r.json(); if (!favs?.length) return;
            const sorted = favs.sort((a, b) => b.id - a.id).slice(0, 10);
            const posts = sorted.map(p => ({...p, slug: p.slug || BlogEngine.getSlugFromFile(p.file), _postSubdir: p.subdir || null, _batchSubdir: '', title: p.title || 'بدون عنوان'}));
            await BlogEngine.resolvePostTitles(posts);
            let h = ''; posts.forEach(p => { h += `<li class="favorite-post"><a href="?post=${encodeURIComponent(p.slug)}" data-post="${p.slug}">${BlogEngine.getDisplayTitle(p)}</a></li>`; });
            fpl.innerHTML = h;
        } catch (e) {}
    }
    
    static async buildSidebarMenu() { try { const rpl = document.getElementById('recentPostsList'); const sp = await BlogEngine.loadPostsForSidebar(10); let h = ''; sp.forEach(p => { const isF = p.fixed === 'yes'; h += `<li class="${isF ? 'fixed-post' : ''}"><a href="?post=${encodeURIComponent(p.slug)}" data-post="${p.slug}">${BlogEngine.getDisplayTitle(p)}</a></li>`; }); rpl.innerHTML = h || '<li><a href="#">هیچ مطلبی نیست</a></li>'; } catch (e) {} }
    static async buildUsefulLinksMenu() { try { const ull = document.getElementById('usefulLinksList'); if (!ull) return; const r = await fetch('data/links.json'); if (!r.ok) return; const links = await r.json(); let h = ''; if (links?.length) links.forEach(l => { if (l.title && l.link) h += `<li><a href="${l.link}" target="_blank" rel="noopener noreferrer">${l.title}</a></li>`; }); ull.innerHTML = h || '<li><a href="#">هیچ لینکی نیست</a></li>'; } catch (e) {} }
    static async buildTagsCloud() { try { const cfg = await BlogEngine.loadPostFilesConfig(); if (!cfg.length) { document.getElementById('tagsCloud').innerHTML = '<p>هیچ برچسبی یافت نشد.</p>'; return; } const fp = await BlogEngine.loadPostsFromBatch(0); let tp = [...fp]; if (tp.length < 3 && cfg.length > 1) tp.push(...await BlogEngine.loadPostsFromBatch(1)); const tags = BlogEngine.getAllTags(tp); const tce = document.getElementById('tagsCloud'); if (!tags.length) { tce.innerHTML = '<p>هیچ برچسبی یافت نشد.</p>'; return; } tce.innerHTML = tags.map(t => `<a href="?tag=${encodeURIComponent(t)}" class="tag" data-tag="${t}">${t}</a>`).join(''); } catch (e) {} }
}