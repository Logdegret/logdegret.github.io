// Date display
(function () {
  const el = document.getElementById('current-date');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
})();

// Mobile nav toggle
(function () {
  const btn = document.getElementById('hamburger-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', function () {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  });
})();

// Newsletter form
function handleNewsletter(e) {
  e.preventDefault();
  const msg = document.getElementById('nl-msg');
  const input = document.getElementById('nl-email');
  if (!msg || !input) return;
  msg.style.color = '#16a34a';
  msg.textContent = 'Thanks! You\'re subscribed.';
  input.value = '';
  input.disabled = true;
  setTimeout(() => { input.disabled = false; }, 3000);
}

// Search
function handleSearch(e) {
  e.preventDefault();
  const q = document.getElementById('search-input');
  if (q && q.value.trim()) {
    alert('Search coming soon. You searched for: ' + q.value.trim());
    q.value = '';
  }
}

// Contact form
function handleContact(e) {
  e.preventDefault();
  const msg = document.getElementById('contact-msg');
  if (msg) {
    msg.style.color = '#16a34a';
    msg.textContent = 'Message sent! We\'ll get back to you within 2 business days.';
    e.target.reset();
  }
}

// Share buttons
function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(function () {
    const btns = document.querySelectorAll('.share-copy');
    btns.forEach(function (b) {
      const orig = b.textContent;
      b.textContent = 'Copied!';
      setTimeout(function () { b.textContent = orig; }, 2000);
    });
  });
}

function shareTwitter() {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  window.open('https://twitter.com/intent/tweet?url=' + url + '&text=' + title, '_blank', 'noopener,noreferrer,width=600,height=400');
}

function shareFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank', 'noopener,noreferrer,width=600,height=400');
}
