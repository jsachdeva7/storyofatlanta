/* ---------------------------------------------------------------
   Edit mode: load any page with ?edit to drag / resize / rotate the
   .item elements inside every <Canvas> pocket on the page. Coordinates
   are computed relative to each item's own pocket, so they stay
   portable. "Copy canvas" copies the focused pocket's markup.
----------------------------------------------------------------*/

export function setupEditTools() {
	const readout = document.querySelector('[data-readout]') as HTMLElement | null;
	const copyBtn = document.querySelector('[data-copy]') as HTMLButtonElement | null;
	const items = Array.from(document.querySelectorAll('[data-item]')) as HTMLElement[];

	const editing = () => document.body.classList.contains('editing');

	let selected: HTMLElement | null = null;

	const pct = (v: string) => parseFloat(v) || 0;
	const rot = (el: HTMLElement) => {
		const m = /rotate\(([-\d.]+)deg\)/.exec(el.style.transform);
		return m ? parseFloat(m[1]) : 0;
	};
	// The pocket an item belongs to — coordinates are relative to this.
	const pocketOf = (el: HTMLElement) =>
		el.closest('[data-canvas]') as HTMLElement | null;

	function update() {
		if (!readout) return;
		if (!selected) {
			readout.textContent = 'No item selected';
			return;
		}
		readout.textContent =
			`left: ${pct(selected.style.left).toFixed(1)}%\n` +
			`top: ${pct(selected.style.top).toFixed(1)}%\n` +
			`width: ${pct(selected.style.width).toFixed(1)}%\n` +
			`rotate: ${rot(selected).toFixed(1)}deg`;
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
			const sl = pct(item.style.left), st = pct(item.style.top);
			const move = (ev: PointerEvent) => {
				item.style.left = sl + ((ev.clientX - sx) / rect.width) * 100 + '%';
				item.style.top = st + ((ev.clientY - sy) / rect.height) * 100 + '%';
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
			const sw = pct(item.style.width);
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

	// Copy the focused pocket's markup (all items, positions + content).
	copyBtn?.addEventListener('click', () => {
		const pocket = selected
			? pocketOf(selected)
			: (document.querySelector('[data-canvas]') as HTMLElement | null);
		if (!pocket) {
			copyBtn.textContent = 'No pocket';
			setTimeout(() => (copyBtn.textContent = 'Copy canvas'), 1200);
			return;
		}
		const clone = pocket.cloneNode(true) as HTMLElement;
		clone.querySelectorAll('.item__handle').forEach((h) => h.remove());
		clone.querySelectorAll('.item').forEach((el) => {
			el.classList.remove('selected');
			const t = el as HTMLElement;
			if (t.style.left) t.style.left = pct(t.style.left).toFixed(1) + '%';
			if (t.style.top) t.style.top = pct(t.style.top).toFixed(1) + '%';
			if (t.style.width && t.style.width !== 'auto')
				t.style.width = pct(t.style.width).toFixed(1) + '%';
			t.style.transform = `rotate(${rot(t).toFixed(1)}deg)`;
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
