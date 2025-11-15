<script>
	export let result;

	// Функция для подсветки совпадений
	function highlight(text, highlights) {
    console.log(text)
    if(!text) return ""; 
		if (!highlights || highlights.length === 0) return text;
		const regex = new RegExp(`(${highlights.join('|')})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}
</script>

<div class="result-item" role="button" tabindex="0" on:click>
	<img src={result.avatar} alt={result.name} class="avatar" />
	<div class="info">
		<div class="name">{@html highlight(result.name, result.highlights)}</div>
		<div class="summary">{@html highlight(result.summary, result.highlights) || 'Контакт'}</div>
	</div>
</div>

<style>
	.result-item {
		display: flex;
		align-items: center;
		padding: 10px 15px;
		cursor: pointer;
		transition: background-color 0.15s ease;
		border-bottom: 1px solid #f0f0f0;
	}
	.result-item:last-child {
		border-bottom: none;
	}
	.result-item:hover {
		background-color: #f5f5f5;
	}
	/* Стили для подсветки */
	:global(.result-item mark) {
		background-color: #aed6f1;
		color: #1a5276;
		font-weight: bold;
		border-radius: 3px;
	}
	.avatar {
		width: 45px;
		height: 45px;
		border-radius: 50%;
		margin-right: 12px;
		object-fit: cover;
		flex-shrink: 0;
	}
	.info {
		overflow: hidden;
	}
	.name, .summary {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.name {
		font-size: 16px;
		font-weight: 500;
		color: #111;
	}
	.summary {
		font-size: 14px;
		color: #666;
	}
</style>
