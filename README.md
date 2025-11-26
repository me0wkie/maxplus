<h1><s>Max+</s> Kotogram</h1>

<b>Мультиплатформенный клиент под мессенджер Max с E2E шифрованием.</b>

<b>Релиз 0.1.0 уже скоро! (запланировано на 1 дек.)</b>

> Приложение переписано на темную тему (прошлая версия: см. ветку [prev](https://github.com/me0wkie/maxplus/tree/prev))

<p>
    <img src="https://img.shields.io/badge/License-MIT-2f9872.svg" alt="License: MIT">
</p>

## Предосторежения
> ⚠️ <b>ВНИМАНИЕ!</b>  
Я не призываю никого скачивать данный клиент и заводить аккаунт в Max <b>как альтернативу Telegram</b> (который по умолчанию не является Spyware). Делайте это только в крайнем случае, когда активны белые списки или хочется поэксперементировать. <b>Не сдавайтесь!</b>

> ⚠️ <b>Работа с внутренним API</b>  
Используйте на свой страх и риск, сервера могут распознавать клиент.

> <b>Поддерживаются версии Android 9+ (для Keystore 10+)</b>

## Содержание
- [Особенности](#особенности)
- [Использование](#использование)
- [Разработка](#разработка)
- [Сборка проекта](#сборка-проекта)
- [В планах](#в-планах)
- [Источники](#источники)

### Особенности
- <b>Открытый исходный код</b>
- Приложение не запрашивает доступ к файлам устройства, микрофону, камере  
- Полный контроль над отправляемыми запросами к серверам oneme[.]ru и ok[.]ru
- Сквозное E2E шифрование (можно включать для отдельных чатов)
- В планах: поддержка звонков, многопользовательских чатов

<b>Небольшой размер приложения достигается использованием встроенных веб-браузеров (спасибо команде Tauri!)</b>

> ❗ В будущем потребуется доступ к камере для покупки пива в Магните (по QR)

## Использование
Предварительные версии будут доступны в разделе [Releases](https://github.com/me0wkie/maxplus/releases)

- <b>Что бы приложение запустилось, архитектура процессора должна совпасть</b>.  
Например: устройство имеет процессор arm64, тогда устанавливаете maxplus-android-aarch64.apk

- <b>Если не удается запустить, попробуйте заменить браузер на устройстве</b>

### Про обновления
По умолчанию приложение проверяет обновления в разделе Releases при каждом запуске.  
Обновления нужно проверять и устанавливать <b>вручную</b>.

## Разработка
Модификация кода приветствуется - сейчас проект очень сырой!

### Требования
- <b>[Bun](https://bun.sh)</b> или [NodeJS](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/) (для Tauri и сборки)
- [Android Studio](https://developer.android.com/studio) и зависимости для сборки под Android
- Немного знания Svelte и Rust, либо наличие ChatGPT Pro

### Установка
```sh
$ git clone https://github.com/me0wkie/maxplus
cd maxplus
bun install # Или: node install
bun run tauri icon static/icon.svg # Важно для запуска
```

### Запуск Development сервера
Чтобы запустить сервер для разработки, выполните команду:

```sh
# Разработка в Desktop-режиме (не поддерживает Keystore и Android-специфичные плагины)
$ bun run tauri dev

ИЛИ

# Разработка через adb (предварительно запустите Android Studio и законнектите устройство)
$ bun run tauri android dev

# Опционально (если ошибки)
$ JAVA_HOME=/usr/lib/путь_к_jdk_17 bun run tauri android dev
```
Чтобы ускорить запуск на Android, создайте копию ```tauri.conf.json``` - ```tauri.android.conf.json```
и укажите в ```devUrl``` адрес ПК в локальной сети.

- [Установка Android Studio](https://developer.android.com/studio)
- [Подключение устройства Android](https://developer.android.com/codelabs/basic-android-kotlin-compose-connect-device)
- На Linux процесс может быть немного сложнее.

## Сборка проекта
Для создания исполняемых файлов на Windows, Linux, iOS нужна предварительная настройка 
([Windows](https://v2.tauri.app/distribute/windows-installer/), [Debian](https://v2.tauri.app/distribute/debian/), [iOS](https://v2.tauri.app/distribute/app-store/), [macOS](https://v2.tauri.app/distribute/macos-application-bundle/))

### Android
Вместо aarch64 можно подставить другую архитектуру (armv7, i686, x86_6). Можно собрать для всех платформ Android сразу (увеличится размер .apk)

```sh
$ cargo tauri android build --target aarch64

ИЛИ

$ cargo tauri android build
```

> ⚠️ <b>Android 10+ требует подписанных .apk-файлов</b>

Ситуация с iOS сложнее и [дороже](https://developer.apple.com/support/compare-memberships/), поэтому простите, но айфонщикам пока путь только в RuStore.

### Отладка на Android
С запущенным приложением (```bun run tauri android dev```):

Перейти в Chrome на ```chrome://inspect#devices``` -> WebView in org.meowkie.max (tauri.localhost)

## Сброс данных клиента
<b>Для Linux:</b>
```sh
$ rm -rf ~/.local/share/org.meowkie.max
```
<b>Для Android:</b>

Очистка кеша и данных приложения через настройки (секретные чаты теряются!)

## В планах
- [ ] Исправить глобальный поиск
- [ ] Профили пользователей
- [ ] Шифрование в группах по схеме MLS
- [ ] Установка любых реакций
- [ ] Звонки с e2e шифрованием
- [ ] Поддержка WebApps

## Источники
-  [PyMax](https://github.com/noxzion/PyMax) - работа с Max API (портировано на Rust в репозитории [rumax](https://github.com/me0wkie/rumax))
-  [tauri-keystore-plugin](https://github.com/impierce/tauri-plugin-keystore) - для аппаратного шифрования на мобильных устройствах (TODO сделать форк)
