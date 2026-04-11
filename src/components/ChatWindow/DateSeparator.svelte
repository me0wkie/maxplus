<script>
  export let msg;
  export let lastDate;

  function formatMessageDate(unixTime) {
    const date = new Date(unixTime);
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    if (isCurrentYear) {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
      });
    } else {
      const day = date.getDate();
      const month = date.toLocaleString('ru-RU', { month: 'long' });
      const year = date.getFullYear();
      return `${day} ${month}, ${year}`;
    }
  }

  function isNewDay(unixTime) {
    const date = new Date(unixTime);
    if (!lastDate || lastDate.toDateString() !== date.toDateString()) {
      lastDate = date;
      return true;
    }
    return false;
  }
</script>

{#if isNewDay(msg.time)}
  <div class="date-separator">
    <a>{formatMessageDate(msg.time)}</a>
  </div>
{/if}

<style>
  .date-separator {
    text-align: center;
    margin: 8px 0 16px 0;
    color: #aaa;
    position: relative;
  }

  .date-separator a {
    padding: 4px 16px;
    border-radius: 100px;
    background-color: #fff2;
    font-size: 13px;
    font-weight: 500;
  }
</style>
