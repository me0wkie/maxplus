import { tick } from 'svelte';

export const scrollToBottom = async (scrollElement, smooth = false) => {
  if (!scrollElement) return;
  await tick();
  scrollElement.scrollTo({
    top: scrollElement.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
}
