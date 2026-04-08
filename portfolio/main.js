/* =============================================================
   Nishan Kharel Portfolio — main.js
   Handles: nav, scroll state, animations, filters, contact form
   Security: honeypot, rate limit, sanitization, reCAPTCHA v3
   ============================================================= */

/* ---------- CONFIG ---------- */
const CONFIG = {
    // Backend API URL — change this to your deployed backend (e.g., https://api.nishankharel.com.np)
    // If the backend is unreachable, the form falls back to EmailJS automatically.
    API_URL: 'http://localhost:8000',
    API_CONTACT_ENDPOINT: '/api/contact',

    // EmailJS (fallback if backend is down) — keep existing keys
    EMAILJS_SERVICE_ID: 'service_s3k94bm',
    EMAILJS_TEMPLATE_ID: 'template_j9gmdko',
    EMAILJS_PUBLIC_KEY: 'rATtpyoFkfKtq_lrF',

    // reCAPTCHA v3 Site Key — paste yours after registering at google.com/recaptcha/admin
    // Leave empty string to disable reCAPTCHA
    RECAPTCHA_SITE_KEY: '',

    // Rate limit: minimum seconds between submissions (client-side)
    RATE_LIMIT_SECONDS: 30,
};

/* =============== 1. MOBILE NAV =============== */
(() => {
    const navMenu = document.getElementById('nav-menu');
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');

    if (navToggle) {
        navToggle.addEventListener('click', () => navMenu.classList.add('show-menu'));
    }
    if (navClose) {
        navClose.addEventListener('click', () => navMenu.classList.remove('show-menu'));
    }

    // Close menu when nav link clicked
    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => navMenu.classList.remove('show-menu'));
    });
})();

/* =============== 2. HEADER SCROLL STATE =============== */
(() => {
    const header = document.getElementById('header');
    if (!header) return;

    const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
})();

/* =============== 3. ACTIVE LINK ON SCROLL =============== */
(() => {
    const sections = document.querySelectorAll('section[id]');
    const scrollActive = () => {
        const scrollY = window.scrollY + 80;
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

/* =============== 5. AOS (Animate On Scroll) =============== */
(() => {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 700,
            easing: 'ease-out-cubic',
            once: true,
            offset: 80,
            disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        });
    }
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
            'ML Models.',
            'Data Products.',
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
            // easeOutQuad
            const eased = 1 - (1 - progress) * (1 - progress);
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

/* =============== 8. WORK FILTER =============== */
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

            // Refresh AOS after filter change
            if (typeof AOS !== 'undefined') AOS.refreshHard();
        });
    });
})();

/* =============== 9. FOOTER YEAR =============== */
(() => {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* =============== 10. CONTACT FORM =============== */
(() => {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    if (!form || !status) return;

    const submitBtn = form.querySelector('.contact__submit');
    const honeypot = form.querySelector('input[name="website"]');

    /* ---- Init EmailJS (fallback) ---- */
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

    // Basic email regex (intentionally simple — real validation happens server-side)
    const isValidEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    // Strip control chars and trim
    const sanitize = (str) => {
        if (typeof str !== 'string') return '';
        return str
            .replace(/[\x00-\x1F\x7F]/g, '') // control chars
            .trim()
            .slice(0, 2000);
    };

    const showFieldError = (fieldId, message) => {
        const input = document.getElementById(fieldId);
        const errorEl = form.querySelector(`.form__error[data-for="${fieldId}"]`);
        if (input) input.classList.toggle('is-invalid', !!message);
        if (errorEl) errorEl.textContent = message || '';
    };

    // Clear field error on user input
    ['contact-name', 'contact-email', 'contact-message'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => showFieldError(id, ''));
    });

    /* ---- Client-side validation ---- */
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

    /* ---- Rate limiting (client-side) ---- */
    const checkRateLimit = () => {
        const lastSubmit = parseInt(localStorage.getItem('contact_last_submit') || '0', 10);
        const now = Date.now();
        const elapsed = (now - lastSubmit) / 1000;
        if (elapsed < CONFIG.RATE_LIMIT_SECONDS) {
            const wait = Math.ceil(CONFIG.RATE_LIMIT_SECONDS - elapsed);
            return { allowed: false, wait };
        }
        return { allowed: true };
    };

    const markSubmitted = () => {
        localStorage.setItem('contact_last_submit', Date.now().toString());
    };

    /* ---- reCAPTCHA v3 ---- */
    const getRecaptchaToken = async () => {
        if (!CONFIG.RECAPTCHA_SITE_KEY || typeof grecaptcha === 'undefined') {
            return '';
        }
        try {
            return await new Promise((resolve, reject) => {
                grecaptcha.ready(() => {
                    grecaptcha
                        .execute(CONFIG.RECAPTCHA_SITE_KEY, { action: 'contact' })
                        .then(resolve)
                        .catch(reject);
                });
            });
        } catch (err) {
            console.warn('reCAPTCHA failed:', err);
            return '';
        }
    };

    /* ---- Backend submission ---- */
    const submitToBackend = async (payload) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(
                `${CONFIG.API_URL}${CONFIG.API_CONTACT_ENDPOINT}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                    mode: 'cors',
                    credentials: 'omit',
                }
            );
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

    /* ---- EmailJS fallback ---- */
    const submitToEmailJS = async (payload) => {
        if (typeof emailjs === 'undefined') {
            throw new Error('EmailJS not loaded');
        }
        return emailjs.send(
            CONFIG.EMAILJS_SERVICE_ID,
            CONFIG.EMAILJS_TEMPLATE_ID,
            {
                user_name: payload.name,
                user_email: payload.email,
                user_subject: payload.subject,
                user_message: payload.message,
            }
        );
    };

    /* ---- Form submit handler ---- */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus('');

        // Honeypot check: if filled, silently drop (don't tell the bot)
        if (honeypot && honeypot.value.trim() !== '') {
            setStatus('Message sent successfully.', 'success');
            form.reset();
            return;
        }

        // Build payload
        const payload = {
            name: sanitize(form.user_name.value),
            email: sanitize(form.user_email.value).toLowerCase(),
            subject: sanitize(form.user_subject.value) || '(No subject)',
            message: sanitize(form.user_message.value),
            recaptcha_token: '',
        };

        // Validate
        if (!validate(payload)) {
            setStatus('Please fix the errors above.', 'error');
            return;
        }

        // Rate limit
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            setStatus(`Please wait ${rateCheck.wait}s before sending another message.`, 'error');
            return;
        }

        setLoading(true);
        setStatus('Verifying…');

        // Get reCAPTCHA token if enabled
        try {
            payload.recaptcha_token = await getRecaptchaToken();
        } catch (err) {
            console.warn('reCAPTCHA token error:', err);
        }

        setStatus('Sending…');

        // Try backend first, fall back to EmailJS
        try {
            await submitToBackend(payload);
            markSubmitted();
            setStatus('Message sent successfully! I\'ll get back to you soon.', 'success');
            form.reset();
        } catch (backendErr) {
            console.warn('Backend unreachable, falling back to EmailJS:', backendErr.message);
            try {
                await submitToEmailJS(payload);
                markSubmitted();
                setStatus('Message sent successfully! I\'ll get back to you soon.', 'success');
                form.reset();
            } catch (fallbackErr) {
                console.error('Both backend and EmailJS failed:', fallbackErr);
                setStatus(
                    'Failed to send message. Please email me directly at nkharel57@gmail.com',
                    'error'
                );
            }
        } finally {
            setLoading(false);
            // Clear success message after 8s
            setTimeout(() => {
                if (status.classList.contains('is-success')) setStatus('');
            }, 8000);
        }
    });
})();
