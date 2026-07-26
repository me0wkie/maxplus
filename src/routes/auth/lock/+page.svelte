<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    getCurrentAccount,
    setEncryption,
    decrypt,
  } from "$lib/stores/accounts";
  import {
    currentUser,
    currentUserDetails,
  } from "$lib/stores/api";
  import {
    set as sessionSet
  } from "$lib/stores/session";

  import BackButton from "$components/main/auth/BackButton.svelte";

  $: from = $page.url.searchParams.get("from");
  $: mode = $page.url.searchParams.get("mode");

  export let savedCode = null;

  let points = [];
  let selected = [];
  let dragPoints = [];

  let drawing = false;
  let cursor = null;

  let hidePattern = false;
  let text = "";

  let repeat = null;

  function createPoints() {
    points = [];

    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        points.push({
          id: y * 3 + x,
          x: 75 + x * 80,
          y: 75 + y * 80
        });
      }
    }
  }

  createPoints();

  function convert(x, y) {
    const rect = document.querySelector(".pattern").getBoundingClientRect();

    return {
      x: (x - rect.left) * 300 / rect.width,
      y: (y - rect.top) * 300 / rect.height
    };
  }

  function getPoint(x, y) {
    const p = convert(x, y);

    return points.find(point =>
      Math.hypot(
        point.x - p.x,
        point.y - p.y
      ) < 20
    );
  }

  function addPoint(point) {
    if (!point) return;
    const last = selected[selected.length - 1];
    if (last && last.id === point.id) return;
    if (selected.some(p => p.id === point.id)) return;
    selected = [ ...selected, point ];
  }


  function start(e) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    text = "";

    selected = [];
    dragPoints = [];

    drawing = true;

    const pos = convert(e.clientX, e.clientY);

    dragPoints = [ pos ];
    cursor = pos;

    addPoint(getPoint(e.clientX, e.clientY));
  }


  function move(e) {
    if (!drawing) return;
    e.preventDefault();

    const pos = convert(e.clientX, e.clientY);
    cursor = pos;

    dragPoints = [ ...dragPoints, pos ];
    addPoint(getPoint(e.clientX, e.clientY));
  }

  async function end() {
    if (!drawing) return;

    drawing = false;
    cursor = null;

    if (selected.length < 4) {
      text = "Минимум 4 точки";
      return;
    }

    const str = selected.map(x => x.id).join("");

    if (mode === "create") {
      if (!repeat) {
        repeat = str;
        text = "Повторим?";
      }
      else {
        if (str !== repeat) {
          text = "Попробуйте заного!";
          selected = [];
          dragPoints = [];
          repeat = null;
        }
        else {
          text = "Успех!";
          selected = [];
          dragPoints = [];
          repeat = null;

          const account = await getCurrentAccount();

          const response = await setEncryption(
            account.id,
            str,
            true
          )

          goBack();
        }
      }
    }
    else if (mode === "disable") {
      const account = await getCurrentAccount();

      try {
        await setEncryption(
          account.id,
          str,
          false
        )
      } catch (e) {
        console.log(e.toString());
        text = "Неверный ключ!";
        return;
      }

      goBack();
    }
    else {
      const account = await getCurrentAccount();

      try {
        await decrypt(
          account.id,
          str
        )
      } catch (e) {
        console.log(e.toString());
        text = "Неверный ключ!";
        return;
      }

      const retry = await getCurrentAccount();
      console.log(retry);

      if (!retry.contact) {
        text = "Ошибка получения данных!";
        return;
      }

      currentUserDetails.set(retry.contact);
      currentUser.set(retry.contact.id);
      //sessionSet("loaded", false);
      goto("/");
    }
  }

  const dragPath = () => dragPoints.map(p => `${p.x},${p.y}`).join(" ");

  function goBack() {
    if (mode === "decrypt") goto("/auth/select");
    else history.back();
  }
</script>

<div class="auth-page">
  <h1>
    {
      mode === "create" ? "Нарисуйте графический ключ" :
      mode === "decrypt" ? "Помните рисунок?" :
      "Повторите графический ключ"
    }
  </h1>

  {#if mode === "check"}
    <label>
      <input
        type="checkbox"
        bind:checked={hidePattern}
      >
      Не отображать рисунок
    </label>
  {/if}

  <div
    class="pattern"
    on:pointerdown={start}
    on:pointermove={move}
    on:pointerup={end}
  >
    <svg viewBox="0 0 300 300">
      {#if !hidePattern}

        <polyline
          points={dragPath()}
          class="drag-line"
        />

        <polyline
          points={selected.map(p => `${p.x},${p.y}`).join(" ")}
          class="draw-line"
        />

        {#if cursor && selected.length}
          <line
            class="cursor-line"
            x1={selected[selected.length - 1].x}
            y1={selected[selected.length - 1].y}
            x2={cursor.x}
            y2={cursor.y}
          />
        {/if}
      {/if}
    </svg>

    {#each points as p}
      <div
        class="point"
        class:selected={ selected.some(x => x.id === p.id) }
        style="left:{p.x}px; top:{p.y}px;"
      ></div>
    {/each}
  </div>

  <div class="text">{text}</div>

  <BackButton top={10} path={from}/>
</div>

<style>
  .auth-page {
    min-height: 98vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 25px;
    color: #ddd;
    user-select: none;
    text-align: center;
  }

  .pattern {
    width: 300px;
    height: 300px;
    position: relative;
    touch-action: none;
  }

  svg {
    position: absolute;
    left: 0;
    top: 0;
    width: 300px;
    height: 300px;
    z-index: 5;
    pointer-events: none;
    overflow: visible;
  }

  .drag-line {
    fill: none;
    stroke: red;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .draw-line {
    fill: none;
    stroke: white;
    stroke-width: 10;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .cursor-line {
    stroke: white;
    stroke-width: 10;
    opacity: .5;
  }

  .point {
    position: absolute;
    width: 26px;
    height: 26px;
    margin-left: -13px;
    margin-top: -13px;
    border-radius: 50%;
    background: #555;
    z-index: 1;
    pointer-events: none;
  }

  .point.selected {
    background: white;
  }

  .text {
    height: 24px;
    font-size: 16px;
  }
</style>
