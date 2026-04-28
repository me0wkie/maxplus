export function formatMs(ms) {
    const d = new Date(ms);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} в ${hours}:${minutes}`;
};

const UNITS = [
    { s: 31536000, f: ['год', 'года', 'лет'] },
    { s: 2592000, f: ['месяц', 'месяца', 'месяцев'] },
    { s: 86400, f: ['день', 'дня', 'дней'] },
    { s: 3600, f: ['час', 'часа', 'часов'] },
    { s: 60, f: ['минуту', 'минуты', 'минут'] },
    { s: 1, f: ['секунду', 'секунды', 'секунд'] },
];

const getForm = (n, forms) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return forms[2];
    if (mod10 === 1) return forms[0];
    if (mod10 >= 2 && mod10 <= 4) return forms[1];
    return forms[2];
};

export function formatTimeAgo(time, now = Date.now()) {
    if (time === 0) return "давно";
    if (!time) return "неизвестно";

    let t = +time;
    if (t < 1e12) t *= 1000;

    let diff = Math.floor((now - t) / 1000);
    if (diff < 0) diff = 0;
    if (diff < 5) return "только что";

    for (const { s, f } of UNITS) {
        if (diff >= s) {
            const count = Math.floor(diff / s);
            return `${count} ${getForm(count, f)} назад`;
        }
    }

    return "только что";
};
