class Pagination {
    constructor(total, per = 10) {
        this.totalItems = total;
        this.itemsPerPage = per;
        this.totalPages = Math.max(1, Math.ceil(total / per));
    }

    getPageItems(items, page) {
        if (!items?.length) return [];
        const vp = Math.max(1, Math.min(page, this.totalPages));
        const s = (vp - 1) * this.itemsPerPage;
        return items.slice(s, s + this.itemsPerPage);
    }

    render(cp, onClick) {
        const pe = document.getElementById('pagination');
        if (this.totalPages <= 1) { pe.innerHTML = ''; return; }

        const vp = Math.max(1, Math.min(cp, this.totalPages));
        
        let h = '<div class="pagination-inner">';
        h += vp > 1 ? `<button class="pagination-btn prev-btn" data-page="${vp - 1}">❮ قبلی</button>` : '<button class="pagination-btn prev-btn" disabled>❮ قبلی</button>';
        h += '<div class="page-numbers">';
        if (vp > 3) { h += `<span class="page-number" data-page="1">1</span>`; if (vp > 4) h += '<span class="page-dots">...</span>'; }
        for (let i = Math.max(1, vp - 2); i <= Math.min(this.totalPages, vp + 2); i++) h += `<span class="page-number ${i === vp ? 'active' : ''}" data-page="${i}">${i}</span>`;
        if (vp < this.totalPages - 2) { if (vp < this.totalPages - 3) h += '<span class="page-dots">...</span>'; h += `<span class="page-number" data-page="${this.totalPages}">${this.totalPages}</span>`; }
        h += '</div>';
        h += vp < this.totalPages ? `<button class="pagination-btn next-btn" data-page="${vp + 1}">بعدی ❯</button>` : '<button class="pagination-btn next-btn" disabled>بعدی ❯</button>';
        h += '</div>';
        
        pe.innerHTML = h;

        pe.querySelectorAll('.page-number, .pagination-btn').forEach(el => {
            if (!el.disabled) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const p = parseInt(el.dataset.page);
                    if (p && !isNaN(p) && p >= 1 && p <= this.totalPages) {
                        onClick(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            }
        });
    }
}