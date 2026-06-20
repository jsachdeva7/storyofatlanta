/* ---------------------------------------------------------------
   Single-page story navigation. Every step is a .js-slide in the DOM;
   one is active at a time. [data-advance] controls (the Continue
   button) move forward. The active step's id is mirrored to the URL
   hash, so the browser back/forward buttons walk the story.
----------------------------------------------------------------*/

export function initStory() {
	const slides = Array.from(document.querySelectorAll('.js-slide')) as HTMLElement[];
	if (!slides.length) return;

	let current = 0;

	function indexFromHash() {
		const id = location.hash.slice(1);
		const i = slides.findIndex((s) => s.id === id);
		return i >= 0 ? i : 0;
	}

	function show(i: number) {
		current = i;
		slides.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
		window.scrollTo(0, 0);
	}

	// Initial step comes from the hash (deep link / refresh), else the first.
	show(indexFromHash());

	// Prev / next controls. Setting the hash fires `hashchange`, which renders.
	document.addEventListener('click', (e) => {
		const t = e.target as HTMLElement;
		if (t.closest('[data-advance]') && current < slides.length - 1) {
			location.hash = slides[current + 1].id;
		} else if (t.closest('[data-back]') && current > 0) {
			location.hash = slides[current - 1].id;
		}
	});

	// Back/forward buttons (and the advance above) flow through here.
	window.addEventListener('hashchange', () => show(indexFromHash()));
}
