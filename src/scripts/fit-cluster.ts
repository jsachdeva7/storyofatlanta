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
		pocket.style.transformOrigin = '50% 0'; // scale from top-centre
		if (!onPhone) {
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
		if (contentH > availH && contentH > 0) {
			const k = availH / contentH;
			// translate so the scaled cluster is vertically centred in the pocket
			const ty = (availH - contentH * k) / 2 - top * k;
			pocket.style.transform = `translateY(${ty}px) scale(${k})`;
		} else {
			pocket.style.transform = '';
		}
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

	fitAll();
}
