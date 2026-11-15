'use strict';

document.querySelectorAll('form[data-confirm]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    var message = form.getAttribute('data-confirm');
    if (message && !window.confirm(message)) {
      event.preventDefault();
    }
  });
});

var heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var syncHeroVideo = function () {
    if (reducedMotion.matches) {
      heroVideo.pause();
    } else {
      var playback = heroVideo.play();
      if (playback && playback.catch) playback.catch(function () {});
    }
  };
  syncHeroVideo();
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener('change', syncHeroVideo);
  }
}

// Scroll animation for promo section articles
var promoCards = document.querySelectorAll('.promo-section .promo-card');
if (promoCards.length > 0 && 'IntersectionObserver' in window) {
  var getCols = function () {
    if (window.innerWidth <= 680) return 1;
    if (window.innerWidth <= 1080) return 2;
    return 3;
  };

  var updateCardDelays = function () {
    var cols = getCols();
    promoCards.forEach(function (card, index) {
      card.style.setProperty('--card-index', index % cols);
    });
  };

  updateCardDelays();
  window.addEventListener('resize', updateCardDelays);

  var promoObserver = new IntersectionObserver(
    function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  promoCards.forEach(function (card) {
    card.classList.add('scroll-reveal');
    promoObserver.observe(card);
  });
}
