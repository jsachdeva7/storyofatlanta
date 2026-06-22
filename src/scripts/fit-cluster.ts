/* ---------------------------------------------------------------
   "K-scaling" for canvas pockets marked [data-fit-scale]. Applies ONE
   uniform transform: scale(K) to the whole pocket (positions + sizes
   scale together, like Figma's scale resize) so the arrangement fits.

   The attribute's value picks the axis to fit:
     data-fit-scale="height" (default) → fit the cluster to the pocket's
        vertical space (fill on phone, shrink-to-fit on larger screens).
     data-fit-scale="width"  → fit the cluster to the pocket's WIDTH
        instead (e.g. a wide image that should fit by width, not height).

   Recomputes on size changes (viewport, image load) and breakpoint changes.
----------------------------------------------------------------*/

export function initFitClusters() {
	const pockets = Array.from(
		document.querySelectorAll('[data-fit-scale], [data-fit-scale-phone]')
	) as HTMLElement[];
	if (!pockets.length) return;

	function fit(pocket: HTMLElement) {
		const onPhone = document.documentElement.dataset.bp === 'phone';
		const editing = document.body.classList.contains('editing');
		// Axis can differ on phone (e.g. fit by width on phone, height elsewhere).
		const axisAttr = (onPhone && pocket.dataset.fitScalePhone) || pocket.dataset.fitScale;
		const axis = axisAttr === 'width' ? 'width' : 'height';
		const phoneOnly = pocket.dataset.fitPhoneOnly !== undefined;
		pocket.style.transformOrigin = '0 0';
		// Off while editing (you arrange the raw cluster; the live view fits it).
		// Off on larger screens when this pocket is phone-only.
		if (editing || (phoneOnly && !onPhone)) {
			pocket.style.transform = '';
			return;
		}
		const items = Array.from(pocket.querySelectorAll('[data-item]')) as HTMLElement[];
		if (!items.length) {
			pocket.style.transform = '';
			return;
		}
		// Natural extent of the arrangement (incl. overflow), in px.
		let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
		for (const it of items) {
			left = Math.min(left, it.offsetLeft);
			right = Math.max(right, it.offsetLeft + it.offsetWidth);
			top = Math.min(top, it.offsetTop);
			bottom = Math.max(bottom, it.offsetTop + it.offsetHeight);
		}
		const contentW = right - left;
		const contentH = bottom - top;
		const availW = pocket.clientWidth;
		const availH = pocket.clientHeight;
		const content = axis === 'width' ? contentW : contentH;
		const avail = axis === 'width' ? availW : availH;
		if (content <= 0) {
			pocket.style.transform = '';
			return;
		}
		let k = avail / content;
		// Phone: fill (scale up OR down). Larger screens (incl. laptops):
		// only shrink to fit — if it already fits, leave it exactly as authored.
		if (!onPhone && k >= 1) {
			pocket.style.transform = '';
			return;
		}
		// Centre the scaled cluster in the pocket on both axes.
		const tx = (availW - contentW * k) / 2 - left * k;
		const ty = (availH - contentH * k) / 2 - top * k;
		pocket.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
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
