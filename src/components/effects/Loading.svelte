<div class="loader">
  <span></span>
  <span></span>
  <span></span>
</div>

<style>
  .loader {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .loader span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    animation: pulse 1.2s infinite ease-in-out;
  }

  .loader span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loader span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.2;
      transform: scale(0.8);
    }

    40% {
      opacity: 1;
      transform: scale(1.2);
    }
  }
</style>
