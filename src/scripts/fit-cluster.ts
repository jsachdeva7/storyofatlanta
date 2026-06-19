/* ---------------------------------------------------------------
   Phone-only "K-scaling" for canvas pockets marked [data-fit-scale].
   Measures the arrangement's natural height; if it overflows the
   pocket's vertical space, applies ONE uniform transform: scale(K) to
   the whole pocket (positions + sizes scale together, like Figma's
   scale resize) so the cluster always stays within the vertical limits.
   Recomputes on size changes (viewport, image load) and breakpoint changes.
----------------------------------------------------------------*/

export function initFitClusters() {
	const pockets = Array.from(
		document.querySelectorAll('[data-fit-scale]')
	) as HTMLElement[];
	if (!pockets.length) return;

	function fit(pocket: HTMLElement) {
		const onPhone = document.documentElement.dataset.bp === 'phone';
		const editing = document.body.classList.contains('editing');
		pocket.style.transformOrigin = '50% 0'; // scale from top-centre
		// Off while editing (you arrange the raw cluster; the live view fits it).
		if (editing) {
			pocket.style.transform = '';
			return;
		}
		const items = Array.from(pocket.querySelectorAll('[data-item]')) as HTMLElement[];
		if (!items.length) {
			pocket.style.transform = '';
			return;
		}
		// Natural vertical extent of the arrangement (incl. overflow), in px.
		let top = Infinity;
		let bottom = -Infinity;
		for (const it of items) {
			top = Math.min(top, it.offsetTop);
			bottom = Math.max(bottom, it.offsetTop + it.offsetHeight);
		}
		const contentH = bottom - top;
		const availH = pocket.clientHeight;
		if (contentH <= 0) {
			pocket.style.transform = '';
			return;
		}
		let k = availH / contentH;
		// Phone: fill (scale up OR down). Larger screens (incl. laptops):
		// only shrink to fit a short viewport — if it already fits, leave the
		// arrangement exactly as authored.
		if (!onPhone) {
			if (k >= 1) {
				pocket.style.transform = '';
				return;
			}
		}
		const ty = (availH - contentH * k) / 2 - top * k;
		pocket.style.transform = `translateY(${ty}px) scale(${k})`;
	}

	const fitAll = () => pockets.forEach(fit);

	// Re-fit on any layout change: viewport resize, image load (item reflow).
	const ro = new ResizeObserver(fitAll);
	for (const p of pockets) {
		ro.observe(p);
		p.querySelectorAll('[data-item]').forEach((it) => ro.observe(it));
	}
	// Re-fit when the breakpoint flips (real resize or dev device toggle).
	new MutationObserver(fitAll).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-bp'],
	});
	// Re-fit when edit mode toggles (we disable fitting while editing).
	new MutationObserver(fitAll).observe(document.body, {
		attributes: true,
		attributeFilter: ['class'],
	});

	fitAll();
}
