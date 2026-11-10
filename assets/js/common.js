$(document).ready(function() {
    document.querySelectorAll('.publication-authors').forEach(function(authors, index) {
        const remaining = authors.querySelector('.remaining-authors');
        const toggle = authors.querySelector('.author-toggle');
        if (!remaining || !toggle) return;
        remaining.id = 'remaining-authors-' + index;
        remaining.hidden = true;
        toggle.hidden = false;
        toggle.setAttribute('aria-controls', remaining.id);
        toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', function() {
            const expanded = toggle.getAttribute('aria-expanded') !== 'true';
            remaining.hidden = !expanded;
            toggle.setAttribute('aria-expanded', String(expanded));
            toggle.textContent = expanded ? 'show fewer' : toggle.dataset.collapsedLabel;
        });
    });
    $('a.abstract, a.bibtex').click(function(event) {
        const panel = document.getElementById(this.getAttribute('aria-controls'));
        if (!panel) return;
        event.preventDefault();
        const expanded = panel.classList.toggle('open');
        this.setAttribute('aria-expanded', String(expanded));
    });
    $('.navbar-nav a, .publication-link').removeClass('waves-effect waves-light');
});
