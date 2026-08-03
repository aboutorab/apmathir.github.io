class BlogEngine {
    static postFilesConfig = null;
    static batchPostsCache = {};
    static allPostsCache = null;
    static postContentCache = {};
    static postContentCacheTimestamp = 0;
    static externalScriptsLoaded = false;
    static externalScriptsConfig = null;
    static totalPostCount = null;
    
    static getCacheBuster() { const t = 10 * 60 * 1000; return Math.floor(Date.now() / t); }
    static addCacheBuster(url) { const sep = url.includes('?') ? '&' : '?'; return `${url}${sep}_cb=${this.getCacheBuster()}`; }
    
    static async loadPostFilesConfig() {
        if (this.postFilesConfig) return this.postFilesConfig;
        try { const u = this.addCacheBuster('data/postfiles.json'); const r = await fetch(u); if (!r.ok) throw new Error(''); this.postFilesConfig = await r.json(); return this.postFilesConfig; }
        catch (e) { console.error('Error loading postfiles.json:', e); return []; }
    }
    
    static async loadExternalScripts() {
        if (this.externalScriptsLoaded) return;
        this.externalScriptsLoaded = true;
        try {
            const u = this.addCacheBuster('data/script.json'); const r = await fetch(u);
            if (!r.ok) return;
            const scripts = await r.json();
            if (!scripts || scripts.length === 0) return;
            this.externalScriptsConfig = scripts;
            for (const cfg of scripts) { await this.loadSingleExternalScript(cfg); }
        } catch (e) {}
    }
    
    static async loadSingleExternalScript(config) {
        const html = config.script.trim();
        const parser = new DOMParser(); const doc = parser.parseFromString(html, 'text/html');
        const els = Array.from(doc.head.children).concat(Array.from(doc.body.children));
        for (const el of els) { await this.injectElementWithCacheBuster(el, config.name || ''); }
    }
    
    static injectElementWithCacheBuster(element, name) {
        return new Promise((resolve) => {
            const tag = element.tagName.toLowerCase();
            if (tag === 'script') {
                if (element.src) { const base = element.src.split('?')[0]; if (document.querySelector(`script[src^="${base}"]`)) { resolve(); return; } }
                if (element.id && document.getElementById(element.id)) { resolve(); return; }
                const s = document.createElement('script');
                for (const a of element.attributes) { if (a.name === 'src') continue; s.setAttribute(a.name, a.value); }
                if (element.textContent && !element.src) { s.textContent = element.textContent; document.head.appendChild(s); resolve(); return; }
                if (element.src) { s.src = this.addCacheBuster(element.src); s.onload = () => resolve(); s.onerror = () => resolve(); document.head.appendChild(s); setTimeout(() => resolve(), 5000); return; }
                document.head.appendChild(s); resolve();
            } else if (tag === 'link') {
                if (element.href && document.querySelector(`link[href^="${element.href.split('?')[0]}"]`)) { resolve(); return; }
                const l = document.createElement('link');
                for (const a of element.attributes) { l.setAttribute(a.name, a.name === 'href' && element.href ? this.addCacheBuster(element.href) : a.value); }
                document.head.appendChild(l); setTimeout(() => resolve(), 500);
            } else if (tag === 'style') {
                const st = document.createElement('style');
                for (const a of element.attributes) st.setAttribute(a.name, a.value);
                st.textContent = element.textContent; document.head.appendChild(st); resolve();
            } else { document.head.appendChild(element.cloneNode(true)); resolve(); }
        });
    }
    
    static async rerenderExternalScripts() {
        if (!this.externalScriptsConfig) return;
        await new Promise(r => setTimeout(r, 200));
        for (const cfg of this.externalScriptsConfig) {
            const parser = new DOMParser(); const doc = parser.parseFromString(cfg.script.trim(), 'text/html');
            for (const el of Array.from(doc.head.children).concat(Array.from(doc.body.children))) {
                if (el.tagName.toLowerCase() === 'script' && !el.src && el.textContent) { try { new Function(el.textContent)(); } catch (e) {} }
            }
        }
        if (window.MathJax?.typesetPromise) { try { await window.MathJax.typesetPromise(); } catch (e) {} }
        if (window.hljs?.highlightAll) { try { window.hljs.highlightAll(); } catch (e) {} }
        if (window.Prism?.highlightAll) { try { window.Prism.highlightAll(); } catch (e) {} }
    }
    
    static formatTime(ts) { if (!ts || typeof ts !== 'string') return ''; return /^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.trim()) ? `ساعت ${ts.trim()}` : ''; }
    static getSlugFromFile(fn) { return fn ? fn.replace(/\.html$/i, '') : ''; }
    static getEffectiveSlug(p) { return (p.slug && p.slug.trim()) ? p.slug.trim() : this.getSlugFromFile(p.file); }
    static hasPreviewFile(p) { return p.previewfile === 'yes'; }
    static getPreviewFileName(fn) { return fn ? fn.replace(/\.html$/i, '-preview.html') : ''; }
    static applyDefaults(p) { return {...p, published: p.published ?? 'yes', fixed: p.fixed ?? 'no', date: p.date ?? '', time: p.time ?? ''}; }
    
    static async loadPostsFromBatch(idx) {
        if (this.batchPostsCache[idx]) return this.batchPostsCache[idx];
        const cfg = await this.loadPostFilesConfig(); if (!cfg || idx >= cfg.length) return [];
        const bc = cfg[idx];
        try {
            const u = this.addCacheBuster(`data/${bc.filename}`); const r = await fetch(u); if (!r.ok) throw new Error('');
            const posts = await r.json();
            const pw = posts.map(p => this.applyDefaults(p)).filter(p => p.published === 'yes');
            const res = pw.map(p => ({...p, slug: this.getEffectiveSlug(p), _batchSubdir: bc.subdir || '', _postSubdir: p.subdir || null, _hasPreviewFile: this.hasPreviewFile(p)}));
            this.batchPostsCache[idx] = res; this.totalPostCount = null; return res;
        } catch (e) { return []; }
    }
    
    static async getTotalPostCount() {
        if (this.totalPostCount !== null) return this.totalPostCount;
        const cfg = await this.loadPostFilesConfig();
        const batches = await Promise.all([...Array(cfg.length).keys()].map(i => this.loadPostsFromBatch(i)));
        this.totalPostCount = batches.reduce((s, b) => s + b.length, 0);
        return this.totalPostCount;
    }
    
    static async loadPostsForSidebar(max = 10) {
        const cfg = await this.loadPostFilesConfig(); const all = [];
        for (let i = 0; i < cfg.length; i++) { all.push(...this.sortPosts([...await this.loadPostsFromBatch(i)])); if (all.length >= max) break; }
        const limited = all.slice(0, max); await this.resolvePostTitles(limited); return limited;
    }
    
    static async loadPostsForPage(page, per = 10) {
        const si = (page-1)*per, ei = si+per;
        const cfg = await this.loadPostFilesConfig(); const all = [];
        for (let i = 0; i < cfg.length; i++) { all.push(...this.sortPosts([...await this.loadPostsFromBatch(i)])); if (all.length >= ei) break; }
        return all.slice(si, ei);
    }
    
    static async loadAllPosts() {
        if (this.allPostsCache) return this.allPostsCache;
        const cfg = await this.loadPostFilesConfig();
        const batches = await Promise.all([...Array(cfg.length).keys()].map(i => this.loadPostsFromBatch(i)));
        this.allPostsCache = batches.flat(); return this.allPostsCache;
    }
    
    static getPostContentPath(p) { const fn = p.file; const sd = p._postSubdir || p._batchSubdir || ''; return sd ? `posts/${this.sanitizeSubdir(sd)}/${fn}` : `posts/${fn}`; }
    static getPreviewContentPath(p) { const pfn = this.getPreviewFileName(p.file); const sd = p._postSubdir || p._batchSubdir || ''; return sd ? `posts/${this.sanitizeSubdir(sd)}/${pfn}` : `posts/${pfn}`; }
    static sanitizeSubdir(s) { return s.replace(/\.\.\//g,'').replace(/\.\//g,'').replace(/^\/+/,'').replace(/\/+$/,''); }
    static removeEntryTitleTag(h) { return h ? h.replace(/<h1\s+class="entry-title"[^>]*>.*?<\/h1>\s*/gi, '') : ''; }
    static removeMoreTag(h) { return h ? h.replace(/<hr\s+class="bs-post-more"\s*\/?>\s*/gi, '') : ''; }
    static extractTitleFromContent(h, jt) { if (!h) return jt || 'بدون عنوان'; const m = h.match(/<h1\s+class="entry-title"[^>]*>(.*?)<\/h1>/i); if (m && m[1]) { const t = m[1].replace(/<[^>]+>/g,'').trim(); if (t) return t; } return (jt && jt.trim()) ? jt : 'بدون عنوان'; }
    static async fetchPreviewTitleOnly(p) { try { const r = await fetch(this.addCacheBuster(this.getPreviewContentPath(p))); if (!r.ok) return null; const m = (await r.text()).match(/<h1\s+class="entry-title"[^>]*>(.*?)<\/h1>/i); return (m && m[1]) ? m[1].replace(/<[^>]+>/g,'').trim() : null; } catch (e) { return null; } }
    static async fetchTitleOnly(p) { try { const r = await fetch(this.addCacheBuster(this.getPostContentPath(p))); if (!r.ok) return null; const c = await r.text(); p._cachedContent = c; const m = c.match(/<h1\s+class="entry-title"[^>]*>(.*?)<\/h1>/i); return (m && m[1]) ? m[1].replace(/<[^>]+>/g,'').trim() : null; } catch (e) { return null; } }
    static async resolvePostTitles(posts) { await Promise.all(posts.map(async(p) => { if (p._resolvedTitle) return; if (p._hasPreviewFile) { const pt = await this.fetchPreviewTitleOnly(p); if (pt) { p._resolvedTitle = pt; return; } } const et = await this.fetchTitleOnly(p); p._resolvedTitle = et || p.title || 'بدون عنوان'; })); }
    static getDisplayTitle(p) { return p._resolvedTitle || p.title || 'بدون عنوان'; }
    static async loadPreviewContent(p) { try { const r = await fetch(this.addCacheBuster(this.getPreviewContentPath(p))); if (!r.ok) return null; const rc = await r.text(); p._previewTitle = this.extractTitleFromContent(rc, p.title); return this.removeMoreTag(this.removeEntryTitleTag(rc)).trim(); } catch (e) { return null; } }
    static async loadPostContentByPost(p) { const ct = this.getCacheBuster(); if (this.postContentCacheTimestamp !== ct) { this.postContentCache = {}; this.postContentCacheTimestamp = ct; } if (this.postContentCache[p.slug]) return this.postContentCache[p.slug]; try { const r = await fetch(this.addCacheBuster(this.getPostContentPath(p))); if (!r.ok) throw new Error(''); const rc = await r.text(); p._cachedContent = rc; p._resolvedTitle = this.extractTitleFromContent(rc, p.title || ''); const res = { meta: {...p, title: p._resolvedTitle}, content: this.removeEntryTitleTag(rc) }; this.postContentCache[p.slug] = res; return res; } catch (e) { return null; } }
    static async loadPostContent(slug) { try { const cfg = await this.loadPostFilesConfig(); for (let i = 0; i < cfg.length; i++) { const p = (await this.loadPostsFromBatch(i)).find(x => x.slug === slug); if (p) return await this.loadPostContentByPost(p); } return null; } catch (e) { return null; } }
    static async loadPagesData() { try { const r = await fetch(this.addCacheBuster('data/pages.json')); if (!r.ok) throw new Error(''); return (await r.json()).filter(x => x.published === 'yes'); } catch (e) { return []; } }
    static async loadPageContent(slug) { try { const pd = await this.loadPagesData(); const p = pd.find(x => x.slug === slug); if (!p) return null; const r = await fetch(this.addCacheBuster(`pages/${p.file}`)); if (!r.ok) throw new Error(''); return { meta: p, content: await r.text() }; } catch (e) { return null; } }
    static extractExcerptAndFull(h) { const m = h.match(/<hr\s+class="bs-post-more"\s*\/?>/gi); if (!m) return { excerpt: h.trim(), full: h.trim(), hasMore: false }; const parts = h.split(/<hr\s+class="bs-post-more"\s*\/?>/gi); return { excerpt: parts[0].trim(), full: parts.join('').trim(), hasMore: true }; }
    static getPostsByTag(posts, tag) { return posts.filter(p => p.tags && p.tags.includes(tag)); }
    static getAllTags(posts) { const s = new Set(); posts.forEach(p => { if (p.tags) p.tags.forEach(t => s.add(t)); }); return Array.from(s).sort(); }
    static sortPosts(posts) { return posts.sort((a,b) => { if (a.fixed === 'yes' && b.fixed !== 'yes') return -1; if (a.fixed !== 'yes' && b.fixed === 'yes') return 1; return b.id - a.id; }); }
    static clearCache() { this.postFilesConfig = null; this.batchPostsCache = {}; this.allPostsCache = null; this.postContentCache = {}; this.postContentCacheTimestamp = 0; this.totalPostCount = null; }
}