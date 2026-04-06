<script>
	let visible = true;

	let x = 20;
	let y = 20;

	let dragging = false;
	let moved = false;
	let offsetX = 0;
	let offsetY = 0;

	const DRAG_THRESHOLD = 5;

	function toggle() {
		if (moved) return;

		visible = !visible;

		const classes = ['debug-a', 'debug-b', 'debug-c', 'debug-d', 'debug-e'];

		classes.forEach(cls => {
			document.querySelectorAll(`.${cls}`).forEach(el => {
				el.style.display = visible ? '' : 'none';
			});
		});
	}

	function startDrag(e) {
		dragging = true;
		moved = false;

		const event = e.touches ? e.touches[0] : e;

		offsetX = event.clientX - x;
		offsetY = event.clientY - y;

		window.addEventListener('mousemove', onDrag);
		window.addEventListener('mouseup', stopDrag);

		window.addEventListener('touchmove', onDrag, { passive: false });
		window.addEventListener('touchend', stopDrag);
	}

	function onDrag(e) {
		if (!dragging) return;

		const event = e.touches ? e.touches[0] : e;

		const newX = event.clientX - offsetX;
		const newY = event.clientY - offsetY;

		// проверяем, было ли движение
		if (Math.abs(newX - x) > DRAG_THRESHOLD || Math.abs(newY - y) > DRAG_THRESHOLD) {
			moved = true;
		}

		x = newX;
		y = newY;
	}

	function stopDrag() {
		dragging = false;

		setTimeout(() => {
			moved = false;
		}, 50);

		window.removeEventListener('mousemove', onDrag);
		window.removeEventListener('mouseup', stopDrag);

		window.removeEventListener('touchmove', onDrag);
		window.removeEventListener('touchend', stopDrag);
	}
</script>

<style>
	.button {
		position: fixed;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(120, 120, 120, 0.3);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: grab;
		user-select: none;
		transition: background 0.2s, transform 0.1s;
		z-index: 9999;
	}

	.button:hover {
		background: rgba(120, 120, 120, 0.6);
	}

	.button:active {
		cursor: grabbing;
		transform: scale(0.95);
		background: rgba(120, 120, 120, 0.8);
	}

	svg {
		width: 24px;
		height: 24px;
		fill: white;
		pointer-events: none;
		opacity: 0.5;
	}
</style>

<div
	class="button"
	style="left: {x}px; top: {y}px;"
	on:mousedown|preventDefault={startDrag}
	on:touchstart|preventDefault={startDrag}
	on:click|stopPropagation={toggle}
>
	<svg viewBox="0 0 24 24">
		<path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
	</svg>
</div>
