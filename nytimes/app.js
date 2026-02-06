document.addEventListener('DOMContentLoaded', function() {
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose = document.getElementById('modal-close');
  const statsPage = document.getElementById('stats-page');

  modalClose.addEventListener('click', function() {
    modalOverlay.classList.add('hidden');
    statsPage.classList.remove('hidden');
  });

  // Prevent scrolling when modal is open
  modalOverlay.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
});
