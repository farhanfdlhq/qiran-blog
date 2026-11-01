(function () {
    var root = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('js-ready');

    /* ---------- Mode terang / gelap ---------- */
    var modeBtn = document.querySelector('.js-mode');
    function isDark() {
        var m = root.getAttribute('data-mode');
        if (m === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches;
        return m === 'dark';
    }
    function syncModeLabel() {
        if (!modeBtn) return;
        var dark = isDark();
        modeBtn.querySelector('.mode-label').textContent = dark ? 'Terang' : 'Gelap';
        modeBtn.setAttribute('aria-label', dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    }
    if (modeBtn) {
        syncModeLabel();
        modeBtn.addEventListener('click', function () {
            var next = isDark() ? 'light' : 'dark';
            root.setAttribute('data-mode', next);
            try { localStorage.setItem('qiran-mode', next); } catch (e) {}
            syncModeLabel();
            fitMark();
        });
    }

    /* ---------- Menu di HP ---------- */
    var menuBtn = document.querySelector('.js-menu');
    var menu = document.getElementById('menu');
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', function () {
            var open = menu.classList.toggle('is-open');
            menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) {
                menu.classList.remove('is-open');
                menuBtn.setAttribute('aria-expanded', 'false');
                menuBtn.focus();
            }
        });
    }

    /* ---------- Judul muncul per baris ---------- */
    // Pecah judul menjadi baris sesuai lebar layar, lalu bungkus tiap baris.
    function splitLines(el) {
        var text = el.textContent.trim();
        var words = text.split(/\s+/);
        el.textContent = '';
        var spans = words.map(function (w, i) {
            var s = document.createElement('span');
            s.textContent = w + (i < words.length - 1 ? ' ' : '');
            el.appendChild(s);
            return s;
        });
        var lines = [];
        var top = null;
        spans.forEach(function (s) {
            if (s.offsetTop !== top) { lines.push([]); top = s.offsetTop; }
            lines[lines.length - 1].push(s.textContent);
        });
        el.textContent = '';
        el.setAttribute('aria-label', text);
        lines.forEach(function (words) {
            var line = document.createElement('span');
            line.className = 'line';
            line.setAttribute('aria-hidden', 'true');
            var inner = document.createElement('span');
            inner.className = 'line-inner';
            inner.textContent = words.join('');
            line.appendChild(inner);
            el.appendChild(line);
        });
    }


    /* ---------- Judul artikel: sebesar mungkin, tetap maksimal dua baris ---------- */
    function fitTitle(el) {
        var cs = getComputedStyle(el);
        var base = parseFloat(cs.fontSize);
        var ratio = parseFloat(cs.lineHeight) / base || 1;
        function lines(size) {
            el.style.fontSize = size + 'px';
            return Math.round(el.getBoundingClientRect().height / (size * ratio));
        }
        // Cari ukuran terbesar antara 80% ukuran CSS dan 7,2vw yang muat dua baris
        var lo = base * 0.8, hi = Math.max(base, Math.min(window.innerWidth * 0.072, 112)), best = null;
        for (var i = 0; i < 14; i++) {
            var mid = (lo + hi) / 2;
            if (lines(mid) <= 2) { best = mid; lo = mid; } else { hi = mid; }
        }
        el.style.fontSize = (best || base) + 'px';
    }

    var headings = document.querySelectorAll('.js-lines');
    function startHeadings() {
        headings.forEach(function (h) {
            if (h.classList.contains('js-fit-title')) fitTitle(h);
            if (!reduce) splitLines(h);
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    h.classList.add('is-in');
                    var hero = h.closest('.hero');
                    if (hero) hero.classList.add('is-ready');
                });
            });
        });
    }
    if (document.fonts && document.fonts.ready) {
        // Tunggu huruf selesai dimuat supaya pemecahan baris akurat (maks 0,8 detik)
        Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 800); })]).then(startHeadings);
    } else {
        startHeadings();
    }

    /* ---------- Bagian muncul saat masuk layar ---------- */
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduce) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var siblings = el.parentElement ? el.parentElement.querySelectorAll(':scope > .reveal') : [];
                var idx = Array.prototype.indexOf.call(siblings, el);
                el.style.setProperty('--d', Math.min(Math.max(idx, 0), 8) * 0.07 + 's');
                el.classList.add('is-in');
                io.unobserve(el);
            });
        }, { rootMargin: '0px 0px -8% 0px' });
        reveals.forEach(function (el) { io.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* ---------- Gambar besar bergerak pelan saat di-scroll ---------- */
    var relief = document.querySelector('.relief-img');
    if (relief && !reduce) {
        var ticking = false;
        var onScroll = function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var r = relief.getBoundingClientRect();
                var vh = window.innerHeight;
                var p = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
                relief.style.transform = 'scale(' + (1.12 - p * 0.12).toFixed(4) + ')';
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---------- Daftar tulisan: kelompok per tahun ---------- */
    document.querySelectorAll('.js-rows').forEach(function (list) {
        var rows = list.querySelectorAll('.row');
        var years = {};
        rows.forEach(function (r) { years[r.dataset.year] = true; });
        if (Object.keys(years).length < 2) return;
        var last = null;
        rows.forEach(function (r) {
            if (r.dataset.year !== last) {
                var label = document.createElement('li');
                label.className = 'rows-group';
                label.setAttribute('role', 'presentation');
                label.dataset.groupYear = r.dataset.year;
                label.textContent = r.dataset.year;
                list.insertBefore(label, r);
                last = r.dataset.year;
            }
        });
    });

    /* ---------- Saring menurut penulis (Qirana / Qirani) ---------- */
    var filter = document.querySelector('.js-filter');
    var list = document.querySelector('.js-rows');
    if (filter && list) {
        var present = {};
        list.querySelectorAll('.row').forEach(function (r) { present[r.dataset.author] = true; });
        var chips = filter.querySelectorAll('.chip');
        var useful = 0;
        chips.forEach(function (c) {
            if (c.dataset.filter !== 'semua' && !present[c.dataset.filter]) c.remove();
            else if (c.dataset.filter !== 'semua') useful++;
        });
        if (useful > 1) {
            filter.hidden = false;
            var empty = document.querySelector('.js-empty');
            filter.addEventListener('click', function (e) {
                var chip = e.target.closest('.chip');
                if (!chip) return;
                var who = chip.dataset.filter;
                filter.querySelectorAll('.chip').forEach(function (c) {
                    var on = c === chip;
                    c.classList.toggle('is-on', on);
                    c.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
                var shown = 0;
                var yearsShown = {};
                list.querySelectorAll('.row').forEach(function (r) {
                    var show = who === 'semua' || r.dataset.author === who;
                    r.hidden = !show;
                    if (show) { shown++; yearsShown[r.dataset.year] = true; }
                });
                list.querySelectorAll('.rows-group').forEach(function (g) {
                    g.hidden = !yearsShown[g.dataset.groupYear];
                });
                if (empty) empty.hidden = shown > 0;
            });
        }
    }


    /* ---------- Pratinjau tulisan saat baris disorot ---------- */
    document.querySelectorAll('.has-peek').forEach(function (section) {
        var peeks = section.querySelectorAll('.peek');
        if (!peeks.length) return;
        function show(slug, row) {
            var found = false;
            peeks.forEach(function (p) {
                var on = p.dataset.peek === slug;
                if (on) found = true;
                p.classList.toggle('is-on', on);
            });
            if (!found) return;
            section.querySelectorAll('.row.is-active').forEach(function (r) { r.classList.remove('is-active'); });
            if (row) row.classList.add('is-active');
        }
        section.querySelectorAll('.row').forEach(function (row) {
            row.addEventListener('mouseenter', function () { show(row.dataset.slug, row); });
            row.addEventListener('focusin', function () { show(row.dataset.slug, row); });
        });
        var first = section.querySelector('.row');
        if (first) first.classList.add('is-active');
    });

    /* ---------- Hitung pembaca (tanpa cookie) ---------- */
    var article = document.querySelector('[data-post-id]');
    if (article && navigator.sendBeacon) {
        setTimeout(function () {
            navigator.sendBeacon('/api/view/', new Blob([JSON.stringify({ id: Number(article.getAttribute('data-post-id')) })], { type: 'application/json' }));
        }, 1500);
    }

    /* ---------- Nama besar di footer selebar layar ---------- */
    var mark = document.querySelector('.js-fit');
    function fitMark() {
        if (!mark) return;
        mark.style.fontSize = '';
        var avail = mark.parentElement.clientWidth;
        var width = mark.scrollWidth;
        if (width > 0) {
            var current = parseFloat(getComputedStyle(mark).fontSize);
            mark.style.fontSize = (current * avail / width * 0.995) + 'px';
        }
    }
    if (mark) {
        (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fitMark);
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(fitMark, 150);
        });
    }
})();
