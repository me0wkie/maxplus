### Браузерные запросы которые могут повлиять на блокировку аккаунта
### Нужно реализовать в клиенте
<b>Актуально на 1 октября</b>

<b>Первый запрос</b>
<br/>
{"ver":11,"cmd":0,"seq":0,"opcode":6,"payload":{"userAgent":{"deviceType":"WEB","locale":"ru","deviceLocale":"en","osVersion":"","deviceName":"Firefox","headerUserAgent":"","appVersion":"25.9.16","screen":"","timezone":""},"deviceId":"неизвестная строка 12 символов"}}

<b>Первый ответ сервера</b>
<br/>
{"ver":11,"cmd":1,"seq":0,"opcode":6,"payload":{"location":"RU","app-update-type":null}}

<b>Получаем папки (необязательно)</b>
<br/>
{"ver":11,"cmd":0,"seq":9,"opcode":272,"payload":{"folderSync":0}}

<b>непонятный запрос, но в ответе token_lifetime_ts, token_refresh_ts, token (при этом это не токен логина)</b>
<br/>
{"ver":11,"cmd":0,"seq":19,"opcode":158,"payload":{}}

<b>запрос при нажатии на окно, после перехода из окна screen_to и screen_from меняются местами</b>
<br/>
{"ver":11,"cmd":0,"seq":86,"opcode":5,"payload":{"events":[{"type":"NAV","event":"GO","userId":id_аккаунта?,"time":876543567,"params":{"session_id":1312312122,"action_id":27,"screen_to":1,"screen_from":???,"prev_time":123456789012}}]}}

<b>запрос каждые 30 секунд</b>
<br/>
{"ver":11,"cmd":0,"seq":89,"opcode":1,"payload":{"interactive":true}}

<b>запрос каждые 60 секунд</b>
<br/>
{"ver":11,"cmd":0,"seq":88,"opcode":75,"payload":{"chatId":id_аккаунта?,"subscribe":true}}

<b>Добавление аккаунта (прост)</b>
<br/>
{"ver":11,"cmd":0,"seq":139,"opcode":41,"payload":{"phone":"номер","firstName":"¸Ðº..."}}

<b>app.tracer каждые 60 секунд</b>
<br/>
await fetch("https://sdk-api.apptracer.ru/api/perf/upload?crashToken=краш токен хз&sdkVersion=2.5.1", {
    "credentials": "omit",
    "headers": {
        "User-Agent": "",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "Sec-GPC": "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site"
    },
    "referrer": "https://web.max.ru/",
    "body": "{\"osVersion\":\"unknown\",\"vendor\":\"Firefox\",\"device\":\"float строка\",\"samples\":[{\"name\":\"Network - Roundtrip\",\"timeUnixNano\":1346853467870000,\"value\":хз,\"unit\":\"хз\",\"attributes\":{\"warp\":\"OFF\",\"opcode\":\"0x4B\"}}],\"versionName\":\"25.9.16\",\"versionCode\":\"8641\",\"sessionUuid\":\"строка uuid с тире\",\"deviceId\":\"строка uuid\",\"clientTimeUnixNano\":\"123456789875432\"}",
    "method": "POST",
    "mode": "cors"
});





