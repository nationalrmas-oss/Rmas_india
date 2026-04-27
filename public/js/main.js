// placeholder for global JS
// we already have hamburger toggle inline in layout, so nothing yet

// Modal functionality for Read More buttons
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('messageModal');
    const modalContent = document.getElementById('modalContent');
    const modalImage = document.getElementById('modalImage');
    const modalName = document.getElementById('modalName');
    const modalTitle = document.getElementById('modalTitle');
    const closeModal = document.getElementById('closeModal');
    const readMoreButtons = document.querySelectorAll('.read-more-btn');

    // Open modal when Read More is clicked
    readMoreButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const fullMessage = this.getAttribute('data-message');
            const imageSrc = this.getAttribute('data-image');
            const personName = this.getAttribute('data-name');
            const personTitle = this.getAttribute('data-title');

            modalContent.textContent = fullMessage;
            modalImage.src = imageSrc;
            modalName.textContent = personName;
            modalTitle.textContent = personTitle;
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    });

    // Close modal when X is clicked
    closeModal.addEventListener('click', function() {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Restore scrolling
    });

    // Close modal when clicking outside the modal content
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto'; // Restore scrolling
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto'; // Restore scrolling
        }
    });
});
