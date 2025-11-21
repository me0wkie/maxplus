<script>
  export let placeholder;
  export let input; // func
  
  let focused = false;
  let query = "";
  
  // Реактивный поиск
  $: input && input(query);

  function handleClickOutside(event) {
  const isOutside = !['.search-block','.search-overlay'].some(x => event.target.closest(x))
    if (isOutside) {
        focused = false;
    }
  }
</script>

<div class="search-block" class:active={ focused }>
  <img src="icons/search.svg"/>
  <a>{ placeholder }</a>
  <input
    type="text"
    placeholder=""
    bind:value={ query }
    on:focus={() => ( focused = true )}
    on:focusout={() => ( focused = false )}
  />
</div>

<style>
  .search-block {
    background-color: #2c2d31;
    color: #999;
    width: 94%;
    height: 30px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    position: relative;
    font-size: 14px;
    cursor: pointer;
  }
  
  .search-block.active {
    cursor: text;
  }
  
  .search-block img {
    height: 20px;
    margin: 0 5px;
    filter: invert(40%);
  }
  
  .search-block a {
    position: absolute;
    margin-left: 30px;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.1s;
  }
  
  .search-block.active a {
    opacity: 0;
  }

  .search-block input {
    width: 100%;
    outline: none;
    border: none;
    background: none;
    font-size: 14px;
    display: flex;
    transition: all 0.2s ease-in-out;
    color: #ccc;
  }
</style>
