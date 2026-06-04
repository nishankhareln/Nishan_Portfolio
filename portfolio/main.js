/* =============================================================
   Nishan Kharel Portfolio — main.js
   Handles: theme, nav, scroll progress, reveal, typed, counters,
            project modal, work filters, contact form
   Security: honeypot, rate limit, sanitization, reCAPTCHA v3
   ============================================================= */

/* ---------- CONFIG ---------- */
const CONFIG = {
    // Backend API URL. Leave EMPTY ('') to skip the backend entirely and
    // send through EmailJS directly (no server needed). Set this to your
    // deployed backend (e.g. 'https://api.nishankharel.com.np') if you run one.
    API_URL: '',
    API_CONTACT_ENDPOINT: '/api/contact',

    // EmailJS (primary path when there is no backend)
    EMAILJS_SERVICE_ID: 'service_s3k94bm',
    EMAILJS_TEMPLATE_ID: 'template_j9gmdko',
    EMAILJS_PUBLIC_KEY: 'rATtpyoFkfKtq_lrF',

    // reCAPTCHA v3 Site Key — leave empty string to disable
    RECAPTCHA_SITE_KEY: '',

    // Rate limit: minimum seconds between submissions (client-side)
    RATE_LIMIT_SECONDS: 30,
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =============== 0. THEME TOGGLE =============== */
(() => {
    const toggle = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');

    const apply = (theme) => {
        root.setAttribute('data-theme', theme);
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c1424' : '#2f8ef0');
        try { localStorage.setItem('nk-theme', theme); } catch (e) { /* ignore */ }
    };

    if (toggle) {
        toggle.addEventListener('click', () => {
            const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            apply(current === 'dark' ? 'light' : 'dark');
        });
    }

    // Follow the OS theme only while the user hasn't picked one explicitly.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener?.('change', (e) => {
        let saved = null;
        try { saved = localStorage.getItem('nk-theme'); } catch (err) { /* ignore */ }
        if (!saved) root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
})();

/* =============== 1. MOBILE NAV =============== */
(() => {
    const navMenu = document.getElementById('nav-menu');
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    if (!navMenu) return;

    if (navToggle) {
        navToggle.addEventListener('click', () => navMenu.classList.add('show-menu'));
    }
    if (navClose) {
        navClose.addEventListener('click', () => navMenu.classList.remove('show-menu'));
    }
    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => navMenu.classList.remove('show-menu'));
    });
})();

/* =============== 2. HEADER SCROLL STATE + PROGRESS =============== */
(() => {
    const header = document.getElementById('header');
    const bar = document.getElementById('progress-bar');

    const onScroll = () => {
        const scrollY = window.scrollY;
        if (header) header.classList.toggle('is-scrolled', scrollY > 20);

        if (bar) {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
            bar.style.width = `${Math.min(pct, 100)}%`;
        }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
})();

/* =============== 3. ACTIVE LINK ON SCROLL =============== */
(() => {
    const sections = document.querySelectorAll('section[id]');
    const scrollActive = () => {
        const scrollY = window.scrollY + 90;
        sections.forEach(current => {
            const sectionTop = current.offsetTop;
            const sectionHeight = current.offsetHeight;
            const sectionId = current.getAttribute('id');
            const link = document.querySelector(`.nav__link[href*="${sectionId}"]`);
            if (!link) return;
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                link.classList.add('active-link');
            } else {
                link.classList.remove('active-link');
            }
        });
    };
    scrollActive();
    window.addEventListener('scroll', scrollActive, { passive: true });
})();

/* =============== 4. SCROLL UP BUTTON =============== */
(() => {
    const scrollUp = document.getElementById('scroll-up');
    if (!scrollUp) return;
    const onScroll = () => {
        scrollUp.classList.toggle('show-scroll', window.scrollY >= 350);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
})();

/* =============== 5. REVEAL ON SCROLL (custom, no dependency) =============== */
(() => {
    const els = Array.from(document.querySelectorAll('[data-aos]'));
    if (!els.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        els.forEach(el => el.classList.add('is-inview'));
        return;
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const delay = entry.target.getAttribute('data-aos-delay');
            if (delay) entry.target.style.transitionDelay = `${delay}ms`;
            entry.target.classList.add('is-inview');
            io.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(el => io.observe(el));
})();

/* =============== 6. TYPED.JS ROLE =============== */
(() => {
    if (typeof Typed === 'undefined') return;
    const target = document.getElementById('typed-role');
    if (!target) return;

    new Typed('#typed-role', {
        strings: [
            'AI Systems.',
            'RAG Pipelines.',
            'Healthcare AI.',
            'ML Models.',
            'Computer Vision.',
            'LLM Apps.',
        ],
        typeSpeed: 60,
        backSpeed: 35,
        backDelay: 1800,
        startDelay: 400,
        loop: true,
        showCursor: true,
        cursorChar: '|',
    });
})();

/* =============== 7. STATS COUNTER =============== */
(() => {
    const counters = document.querySelectorAll('.home__stat-number');
    if (!counters.length || !('IntersectionObserver' in window)) return;

    const animate = (el) => {
        const target = parseInt(el.dataset.target, 10) || 0;
        const duration = 1600;
        const startTime = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - (1 - progress) * (1 - progress); // easeOutQuad
            el.textContent = Math.floor(eased * target);
            if (progress < 1) requestAnimationFrame(tick);
            else el.textContent = target;
        };
        requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animate(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    counters.forEach(el => observer.observe(el));
})();

/* =============== 8. PROJECT MODAL =============== */
(() => {
    const modal = document.getElementById('project-modal');
    if (!modal) return;

    const mediaEl = modal.querySelector('.modal__media');
    const tagsEl = document.getElementById('modal-tags');
    const titleEl = document.getElementById('modal-title');
    const summaryEl = document.getElementById('modal-summary');
    const highlightsEl = document.getElementById('modal-highlights');
    const linksEl = document.getElementById('modal-links');

    /* Rich detail for each project (drawn from the résumé) */
    const PROJECTS = {
        'bank-note': {
            image: './portfolio/work1.png',
            title: 'Bank Note OCR — Nepali Currency Detection',
            tags: ['Computer Vision', 'Deep Learning', 'OpenCV', 'Vector Similarity'],
            summary: 'A real-time computer-vision pipeline that detects and classifies Nepali banknote denominations from a live camera or image input, built for production reliability.',
            highlights: [
                'Built a currency detection pipeline using computer vision and deep learning to classify denominations in real time.',
                'Applied vector-similarity matching for robust recognition under varied lighting and image quality.',
                'Improved recognition accuracy and operational reliability for real-world deployment.',
            ],
            links: [{ label: 'View on GitHub', href: 'https://github.com/nishankhareln', icon: 'ri-github-fill' }],
        },
        'recruit-nepal': {
            image: './portfolio/work2.png',
            images: ['./portfolio/work2.png', './portfolio/recruit-nepal-ats.png'],
            title: 'Recruit Nepal — AI-Powered ATS',
            tags: ['NLP', 'spaCy NER', 'Sentence Transformers', 'LLM'],
            summary: 'An end-to-end Applicant Tracking System that parses CVs and matches candidates to job descriptions, then ranks them with LLM-based contextual scoring.',
            highlights: [
                'Built an end-to-end ATS pipeline with Tesseract OCR fallback and spaCy NER for structured JSON extraction.',
                'Used Sentence Transformer embeddings with cosine similarity for Top-N candidate shortlisting.',
                'Added LLM-based contextual ATS scoring and automated ranking, improving recruiter efficiency and engagement.',
            ],
            links: [
                { label: 'Live Demo', href: 'https://jobdes.streamlit.app/', icon: 'ri-external-link-line' },
                { label: 'View on GitHub', href: 'https://github.com/nishankhareln', icon: 'ri-github-fill' },
            ],
        },
        'shishu-care': {
            image: './portfolio/work3.png',
            title: 'Shishu Care — Infant Cry Classifier',
            tags: ['CNN-BiLSTM', 'Attention', 'Audio ML', 'TensorFlow'],
            summary: 'A deep-learning system that classifies why an infant is crying — hunger, pain, burping, or sleep — from short audio clips with near real-time inference.',
            highlights: [
                'Designed a CNN–BiLSTM with attention to classify infant cries from mel spectrograms.',
                'Performed full audio preprocessing: noise handling, waveform normalisation, and mel-spectrogram extraction from raw .wav files.',
                'Tuned for near real-time inference suitable for on-device use.',
            ],
            links: [{ label: 'View on GitHub', href: 'https://github.com/nishankhareln', icon: 'ri-github-fill' }],
        },
        'rag-chatbot': {
            image: './portfolio/work6.png',
            title: 'RAG Chatbot with pgvector + Gemini',
            tags: ['RAG', 'FastAPI', 'pgvector', 'Gemini', 'Docker'],
            summary: 'A production-ready Retrieval-Augmented Generation chatbot that grounds LLM answers in your own documents using a PostgreSQL vector store.',
            highlights: [
                'Built with FastAPI + PostgreSQL (pgvector) + Gemini LLM API and Sentence Transformer embeddings.',
                'Cosine-similarity nearest-neighbour retrieval over a vector store for grounded, accurate answers.',
                'Containerised with Docker-Compose; interactive Streamlit frontend for querying.',
            ],
            links: [{ label: 'View on GitHub', href: 'https://github.com/nishankhareln/Chatbot-with-PGvector', icon: 'ri-github-fill' }],
        },
        'popup': {
            image: './portfolio/work4.png',
            title: 'PopUp — Vendor Conversational Chatbot',
            tags: ['LangChain', 'OpenAI', 'Conversational AI', 'BERT'],
            summary: 'A vendor-to-vendor conversational assistant handling multi-turn workflows, plus a BERT-based Nepali fake-news classifier built for the same product.',
            highlights: [
                'Developed a multi-document chatbot with LangChain + OpenAI API.',
                'Dynamic conversational forms and session-state management for accurate multi-turn vendor workflows.',
                'Built a BERT-based Nepali fake-news classifier for real-time, high-accuracy content verification.',
            ],
            links: [{ label: 'View on GitHub', href: 'https://github.com/nishankhareln', icon: 'ri-github-fill' }],
        },
        'protein': {
            image: './portfolio/work5.png',
            title: 'Protein Function Prediction (CAFA-6)',
            tags: ['Deep Learning', 'Bioinformatics', 'Healthcare'],
            summary: 'A deep-learning model for the CAFA-6 challenge that predicts Gene Ontology labels directly from amino-acid sequences.',
            highlights: [
                'Predicted Gene Ontology (GO) labels from amino-acid sequences using deep learning.',
                'Bioinformatics preprocessing with custom sequence encoding.',
                'Class-weighted training to handle highly imbalanced label distributions.',
            ],
            links: [{ label: 'View on GitHub', href: 'https://github.com/nishankhareln', icon: 'ri-github-fill' }],
        },
    };

    let lastFocused = null;

    const buildList = (parent, items, render) => {
        parent.innerHTML = '';
        items.forEach(item => parent.appendChild(render(item)));
    };

    const openModal = (id) => {
        const data = PROJECTS[id];
        if (!data) return;

        // Media: one image, or a two-up gallery when `images` has several.
        const imgs = (data.images && data.images.length) ? data.images : [data.image];
        mediaEl.innerHTML = '';
        mediaEl.classList.toggle('modal__media--multi', imgs.length > 1);
        imgs.forEach(src => {
            const im = document.createElement('img');
            im.src = src;
            im.alt = data.title;
            im.loading = 'lazy';
            mediaEl.appendChild(im);
        });

        titleEl.textContent = data.title;
        summaryEl.textContent = data.summary;

        buildList(tagsEl, data.tags, (t) => {
            const span = document.createElement('span');
            span.className = 'modal__tag';
            span.textContent = t;
            return span;
        });

        buildList(highlightsEl, data.highlights, (h) => {
            const li = document.createElement('li');
            li.textContent = h;
            return li;
        });

        buildList(linksEl, data.links, (l) => {
            const a = document.createElement('a');
            a.className = 'button button--primary';
            a.href = l.href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.innerHTML = `${l.label} <i class="${l.icon}"></i>`;
            return a;
        });

        lastFocused = document.activeElement;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
        const closeBtn = modal.querySelector('.modal__close');
        if (closeBtn) closeBtn.focus();
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    };

    // Open from any project card; let real links inside the card work normally.
    document.querySelectorAll('.work__card[data-project-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return; // external link clicked
            openModal(card.dataset.projectId);
        });
        // Keyboard access
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(card.dataset.projectId);
            }
        });
    });

    modal.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
})();

/* =============== 9. WORK FILTER =============== */
(() => {
    const filters = document.querySelectorAll('.work__filter');
    const cards = document.querySelectorAll('.work__card');
    if (!filters.length || !cards.length) return;

    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;

            filters.forEach(f => f.classList.remove('is-active'));
            btn.classList.add('is-active');

            cards.forEach(card => {
                const categories = (card.dataset.category || '').split(/\s+/);
                const show = filter === 'all' || categories.includes(filter);
                card.classList.toggle('is-hidden', !show);
            });
        });
    });
})();

/* =============== 10. FOOTER YEAR =============== */
(() => {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* =============== 11. CONTACT FORM =============== */
(() => {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    if (!form || !status) return;

    const submitBtn = form.querySelector('.contact__submit');
    const honeypot = form.querySelector('input[name="website"]');

    /* ---- Init EmailJS ---- */
    if (typeof emailjs !== 'undefined' && CONFIG.EMAILJS_PUBLIC_KEY) {
        try {
            emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
        } catch (err) {
            console.warn('EmailJS init failed:', err);
        }
    }

    /* ---- Helpers ---- */
    const setStatus = (msg, type = '') => {
        status.textContent = msg;
        status.classList.remove('is-success', 'is-error');
        if (type) status.classList.add(`is-${type}`);
    };

    const setLoading = (loading) => {
        submitBtn.disabled = loading;
        submitBtn.classList.toggle('is-loading', loading);
        const label = submitBtn.querySelector('.contact__submit-label');
        if (label) label.textContent = loading ? 'Sending' : 'Send Message';
    };

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    const sanitize = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 2000);
    };

    const showFieldError = (fieldId, message) => {
        const input = document.getElementById(fieldId);
        const errorEl = form.querySelector(`.form__error[data-for="${fieldId}"]`);
        if (input) input.classList.toggle('is-invalid', !!message);
        if (errorEl) errorEl.textContent = message || '';
    };

    ['contact-name', 'contact-email', 'contact-message'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => showFieldError(id, ''));
    });

    const validate = (data) => {
        let ok = true;
        if (!data.name || data.name.length < 2) {
            showFieldError('contact-name', 'Please enter your name (min 2 characters)');
            ok = false;
        }
        if (!data.email || !isValidEmail(data.email)) {
            showFieldError('contact-email', 'Please enter a valid email address');
            ok = false;
        }
        if (!data.message || data.message.length < 10) {
            showFieldError('contact-message', 'Message must be at least 10 characters');
            ok = false;
        }
        if (data.message && data.message.length > 2000) {
            showFieldError('contact-message', 'Message must be under 2000 characters');
            ok = false;
        }
        return ok;
    };

    const checkRateLimit = () => {
        const lastSubmit = parseInt(localStorage.getItem('contact_last_submit') || '0', 10);
        const elapsed = (Date.now() - lastSubmit) / 1000;
        if (elapsed < CONFIG.RATE_LIMIT_SECONDS) {
            return { allowed: false, wait: Math.ceil(CONFIG.RATE_LIMIT_SECONDS - elapsed) };
        }
        return { allowed: true };
    };

    const markSubmitted = () => {
        localStorage.setItem('contact_last_submit', Date.now().toString());
    };

    const getRecaptchaToken = async () => {
        if (!CONFIG.RECAPTCHA_SITE_KEY || typeof grecaptcha === 'undefined') return '';
        try {
            return await new Promise((resolve, reject) => {
                grecaptcha.ready(() => {
                    grecaptcha.execute(CONFIG.RECAPTCHA_SITE_KEY, { action: 'contact' })
                        .then(resolve).catch(reject);
                });
            });
        } catch (err) {
            console.warn('reCAPTCHA failed:', err);
            return '';
        }
    };

    const submitToBackend = async (payload) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`${CONFIG.API_URL}${CONFIG.API_CONTACT_ENDPOINT}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit',
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    };

    const submitToEmailJS = async (payload) => {
        if (typeof emailjs === 'undefined') throw new Error('EmailJS not loaded');
        return emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
            user_name: payload.name,
            user_email: payload.email,
            user_subject: payload.subject,
            user_message: payload.message,
        });
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus('');

        // Honeypot: if filled, pretend success (don't tip off the bot)
        if (honeypot && honeypot.value.trim() !== '') {
            setStatus('Message sent successfully.', 'success');
            form.reset();
            return;
        }

        const payload = {
            name: sanitize(form.user_name.value),
            email: sanitize(form.user_email.value).toLowerCase(),
            subject: sanitize(form.user_subject.value) || '(No subject)',
            message: sanitize(form.user_message.value),
            recaptcha_token: '',
        };

        if (!validate(payload)) {
            setStatus('Please fix the errors above.', 'error');
            return;
        }

        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            setStatus(`Please wait ${rateCheck.wait}s before sending another message.`, 'error');
            return;
        }

        setLoading(true);
        setStatus('Sending…');

        try {
            payload.recaptcha_token = await getRecaptchaToken();
        } catch (err) {
            console.warn('reCAPTCHA token error:', err);
        }

        // If a backend URL is configured, try it first; otherwise go straight to EmailJS.
        const trySend = async () => {
            if (CONFIG.API_URL) {
                try {
                    await submitToBackend(payload);
                    return;
                } catch (backendErr) {
                    console.warn('Backend unreachable, falling back to EmailJS:', backendErr.message);
                }
            }
            await submitToEmailJS(payload);
        };

        try {
            await trySend();
            markSubmitted();
            setStatus("Message sent successfully! I'll get back to you soon.", 'success');
            form.reset();
        } catch (err) {
            console.error('Send failed:', err);
            setStatus('Failed to send message. Please email me directly at nkharel57@gmail.com', 'error');
        } finally {
            setLoading(false);
            setTimeout(() => {
                if (status.classList.contains('is-success')) setStatus('');
            }, 8000);
        }
    });
})();
