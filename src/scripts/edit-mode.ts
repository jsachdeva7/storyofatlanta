/* ---------------------------------------------------------------
   Edit mode: toggle with the on-screen "edit" button to drag / resize /
   rotate the .item elements inside every <Canvas> pocket.

   Positions are read from RENDERED GEOMETRY (getComputedStyle), so the
   tool works no matter how a position was authored — CSS custom-props,
   a media-query breakpoint, or a live drag. Whatever viewport width the
   window is at, dragging + "Copy canvas" produce coordinates for THAT
   breakpoint. Resize the browser to phone/tablet width to author those.
----------------------------------------------------------------*/

export function setupEditTools() {
	const readout = document.querySelector('[data-readout]') as HTMLElement | null;
	const copyBtn = document.querySelector('[data-copy]') as HTMLButtonElement | null;
	const items = Array.from(document.querySelectorAll('[data-item]')) as HTMLElement[];

	const editing = () => document.body.classList.contains('editing');
	const pocketOf = (el: HTMLElement) => el.closest('[data-canvas]') as HTMLElement | null;

	// Rotation from the computed transform matrix (0 if none).
	function angleOf(transform: string) {
		const m = /matrix\(([^)]+)\)/.exec(transform);
		if (!m) return 0;
		const [a, b] = m[1].split(',').map(parseFloat);
		return (Math.atan2(b, a) * 180) / Math.PI;
	}

	// Current position as % of the item's pocket, from rendered geometry.
	function geom(item: HTMLElement) {
		const pocket = pocketOf(item);
		const pr = pocket?.getBoundingClientRect();
		const w = pr?.width || 1;
		const h = pr?.height || 1;
		const cs = getComputedStyle(item);
		return {
			left: ((parseFloat(cs.left) || 0) / w) * 100,
			top: ((parseFloat(cs.top) || 0) / h) * 100,
			width: ((parseFloat(cs.width) || 0) / w) * 100,
			rotate: angleOf(cs.transform),
		};
	}

	let selected: HTMLElement | null = null;

	function update() {
		if (!readout) return;
		if (!selected) {
			readout.textContent = 'No item selected';
			return;
		}
		const g = geom(selected);
		readout.textContent =
			`left: ${g.left.toFixed(1)}%\n` +
			`top: ${g.top.toFixed(1)}%\n` +
			`width: ${g.width.toFixed(1)}%\n` +
			`rotate: ${g.rotate.toFixed(1)}deg`;
	}

	function select(el: HTMLElement | null) {
		selected?.classList.remove('selected');
		selected = el;
		el?.classList.add('selected');
		update();
	}

	for (const item of items) {
		const resize = document.createElement('div');
		resize.className = 'item__handle item__handle--resize';
		const rotate = document.createElement('div');
		rotate.className = 'item__handle item__handle--rotate';
		item.append(resize, rotate);

		// --- drag to move ---
		item.addEventListener('pointerdown', (e) => {
			if (!editing()) return; // live page: don't hijack clicks
			if (e.target === resize || e.target === rotate) return;
			e.preventDefault();
			select(item);
			const pocket = pocketOf(item);
			if (!pocket) return;
			const rect = pocket.getBoundingClientRect();
			const sx = e.clientX, sy = e.clientY;
			const start = geom(item);
			const move = (ev: PointerEvent) => {
				item.style.left = start.left + ((ev.clientX - sx) / rect.width) * 100 + '%';
				item.style.top = start.top + ((ev.clientY - sy) / rect.height) * 100 + '%';
				update();
			};
			const up = () => {
				document.removeEventListener('pointermove', move);
				document.removeEventListener('pointerup', up);
			};
			document.addEventListener('pointermove', move);
			document.addEventListener('pointerup', up);
		});

		// --- resize (width %, height follows the content's aspect ratio) ---
		resize.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			select(item);
			const pocket = pocketOf(item);
			if (!pocket) return;
			const rect = pocket.getBoundingClientRect();
			const sx = e.clientX;
			const sw = geom(item).width;
			const move = (ev: PointerEvent) => {
				const next = sw + ((ev.clientX - sx) / rect.width) * 100;
				item.style.width = Math.max(2, next) + '%';
				update();
			};
			const up = () => {
				document.removeEventListener('pointermove', move);
				document.removeEventListener('pointerup', up);
			};
			document.addEventListener('pointermove', move);
			document.addEventListener('pointerup', up);
		});

		// --- rotate ---
		rotate.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			select(item);
			const box = item.getBoundingClientRect();
			const cx = box.left + box.width / 2;
			const cy = box.top + box.height / 2;
			const move = (ev: PointerEvent) => {
				const deg = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
				item.style.transform = `rotate(${deg}deg)`;
				update();
			};
			const up = () => {
				document.removeEventListener('pointermove', move);
				document.removeEventListener('pointerup', up);
			};
			document.addEventListener('pointermove', move);
			document.addEventListener('pointerup', up);
		});
	}

	// Click empty pocket space to deselect.
	document.querySelectorAll('[data-canvas]').forEach((pocket) => {
		pocket.addEventListener('pointerdown', (e) => {
			if (e.target === pocket) select(null);
		});
	});

	// Copy the focused pocket's markup, with each item's CURRENT-breakpoint
	// position written as a clean inline style (read from geometry).
	copyBtn?.addEventListener('click', () => {
		const pocket = selected
			? pocketOf(selected)
			: (document.querySelector('[data-canvas]') as HTMLElement | null);
		if (!pocket) {
			copyBtn.textContent = 'No pocket';
			setTimeout(() => (copyBtn.textContent = 'Copy canvas'), 1200);
			return;
		}
		const liveItems = Array.from(pocket.querySelectorAll('[data-item]')) as HTMLElement[];
		const clone = pocket.cloneNode(true) as HTMLElement;
		clone.querySelectorAll('.item__handle').forEach((h) => h.remove());
		const cloneItems = Array.from(clone.querySelectorAll('[data-item]')) as HTMLElement[];
		cloneItems.forEach((el, i) => {
			el.classList.remove('selected');
			const g = geom(liveItems[i]);
			el.removeAttribute('style');
			el.style.cssText =
				`left: ${g.left.toFixed(1)}%; top: ${g.top.toFixed(1)}%; ` +
				`width: ${g.width.toFixed(1)}%; transform: rotate(${g.rotate.toFixed(1)}deg);`;
		});
		const markup = clone.innerHTML
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/^\s*[\r\n]/gm, '')
			.trim();
		navigator.clipboard.writeText(markup);
		copyBtn.textContent = 'Copied!';
		setTimeout(() => (copyBtn.textContent = 'Copy canvas'), 1200);
	});
}
