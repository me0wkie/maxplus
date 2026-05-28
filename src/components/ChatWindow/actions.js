import API, {
  currentUser,
  receivedMessage,
  chatPassword,
} from "$lib/stores/api";
import { encryptMessage as encryptAss } from "$components/ChatWindow/e2e";
import { xorEncrypt } from "$lib/crypto/symmetric";
import { deflate, obfuscate } from "$lib/crypto/messages";
import { get } from "svelte/store";

export async function sendMessage(
  chat,
  chatKeysCached,
  messages,
  newMessage,
  replyTo,
  attaches,
  elements,
  forceObfuscation = false
) {
  if (!newMessage.trim()) return;
  let text = newMessage;

  const ass = !!chatKeysCached?.current;
  const sym = await chatPassword.get(chat.id);

  const debug = true;

  if (forceObfuscation || sym || ass) {
    if (debug) console.log('Original', text);
    let bytes = deflate(text);
    if (debug) console.log('2', bytes);
    if (sym) bytes = await xorEncrypt(bytes, sym);
    if (debug) console.log('3', bytes);
    if (ass) bytes = await encryptAss(chat, chatKeysCached, bytes);
    if (debug) console.log('4', bytes);
    text = obfuscate(bytes, "zh"); // TODO выбор алфавита
    if (debug) console.log('Final', text);
  } // TODO Fix [!] Вес сообщения возрастает в 3 раза при ass + sym одновременно

  let chatId = chat.id;

  const id = Date.now();

  const displayMessageEarlyEntry = {
    id,
    text,
    sender: get(currentUser),
    reactionInfo: {},
    attaches,
    elements,
    type: "USER",
    time: Date.now(),
    link: { type: "REPLY", messageId: replyTo },
    status: 0,
  };

  const _messages = get(messages);
  _messages.unshift(displayMessageEarlyEntry);
  messages.set(_messages);

  const params = {
    notify: true,
    replyTo,
    attaches,
    elements,
  };

  const response = await get(API).sendMessage(text, chatId, params);

  const message = response?.message || {};

  if (!message) {
    messages.update((msgs) => {
      msgs.find((x) => x.id === id).deleted = true;
      return msgs;
    });
  }

  if (message) {
    const msgId = message.id;
    message.chatId = chat.id;
    message.status = 1;

    receivedMessage.set(message);

    messages.update((msgs) => {
      //msgs.find(x => x.id === id).id = msgId
      //console.log('set id ' + id + ' -> ' + msgId)
      const element = msgs.indexOf(displayMessageEarlyEntry);
      if (element !== -1) msgs.splice(element, 1);

      return msgs;
    });

    if (ass) {
      const entry = chatKeysCached.messages.find(
        (entry) => entry.key === chatKeysCached.current,
      );
      if (!entry)
        chatKeysCached.messages.push({
          from: msgId,
          to: msgId,
          key: chatKeysCached.current,
        });
      else {
        entry.to = msgId;
      }
    }
  }
}

export async function handleReaction(chat, msg, emoji) {
  const reactionInfo = msg.reactionInfo;

  if (reactionInfo?.counters) {
    const your = reactionInfo.yourReaction;
    if (your) {
      if (your === emoji) {
        get(API)
          .react(chat.id, msg.id + "")
          .then(console.warn);
        if (reactionInfo.totalCount === 1) msg.reactionInfo = {};
        else {
          reactionInfo.totalCount -= 1;
          reactionInfo.yourReaction = undefined;
          const entry = reactionInfo.counters.find((x) => x.reaction === emoji);
          if (entry) entry.count -= 1;
        }
      } else {
        const counters = reactionInfo.counters;
        const prev = counters.findIndex((x) => x.reaction === your);
        if (counters[prev].count === 1) counters.splice(prev, 1);
        else counters[prev].count -= 1;
        reactionInfo.yourReaction = emoji;
        get(API)
          .react(chat.id, msg.id + "", emoji)
          .then(console.warn);
        const entry = counters.find((x) => x.reaction === emoji);
        if (entry) entry.count += 1;
        else counters.push({ count: 1, reaction: emoji });
      }
    } else {
      get(API)
        .react(chat.id, msg.id + "", emoji)
        .then(console.warn);
      reactionInfo.yourReaction = emoji;
      const entry = reactionInfo.counters.find((x) => x.reaction === emoji);
      if (entry) entry.count += 1;
      else reactionInfo.counters.push({ count: 1, reaction: emoji });
    }
  } else {
    get(API)
      .react(chat.id, msg.id + "", emoji)
      .then(console.warn);
    msg.reactionInfo = {
      counters: [{ count: 1, reaction: emoji }],
      totalCount: 1,
      yourReaction: emoji,
    };
  }
}
