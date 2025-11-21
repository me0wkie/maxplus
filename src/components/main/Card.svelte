<script>
  export let index = 0;
  export let active = 0;
</script>

<div class="page-card"
     style="transform: translateX({(index - active) * 100}vw)">
  <slot />
</div>

<style>
  .page-card {
    position: absolute;
    z-index: 10;
    top: 0;
    left: 0;
    width: 100vw;
    height: calc(100vh - 60px);
    transition: transform 0.22s;
    display: flex;
    flex-direction: column;
    display: flex;
  }
</style>


