<script>
  import { now } from "$lib/stores/session.js";
  import { formatTimeAgo } from "$lib/utils/time.js";

  export let unixTime;

  $: text = formatTimeAgo(unixTime, $now);
</script>

{text}
