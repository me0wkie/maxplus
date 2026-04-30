export function getAttachText(chat, msg) {
  return has(msg, "PHOTO") ? "Изображение" :
         has(msg, "VIDEO") ? "Видео" :
         has(msg, "FILE") ? "Файл" :
         has(msg, "INLINE_KEYBOARD") ? "Клавиатура" :
         has(msg, "CONTROL") ? msg?.attaches?.find(x => x._type === "CONTROL")?.shortMessage :
         msg?.link ? (
           msg.link.chatId === chat.id ? "Ответ" : "Пересланное сообщение"
         ) : null;
}

function has(msg, type) {
  return msg?.attaches?.find(x => x._type === type);
}
