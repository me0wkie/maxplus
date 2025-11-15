<h1>Max+ (в длительной... разработке)</h1>

<b>Мультиплатформенный клиент под мессенджер Max с шифрованием.</b>

Работает с внутренним API - используйте на свой страх и риск!

> <b>Релиз 0.1.0 уже скоро! (запланировано на 1 дек.)</b>

> Приложение переписано на темную тему (прошлая версия: см. ветку [prev](https://github.com/me0wkie/maxplus/tree/prev))

<p>
    <img src="https://img.shields.io/badge/License-MIT-2f9872.svg" alt="License: MIT">
</p>

## Содержание
- [Особенности](#особенности)
- [Использование](#использование)
- [Разработка](#разработка)
- [Создание билда](#создание-билда)
- [В планах](#в-планах)
- [Источники](#источники)

### Особенности
- Нет необходимости разрешать доступ к файлам устройства, микрофону, камере (но в будущем это нужно будет для покупки пиваса по QR)
- Полный контроль над отправляемыми запросами к серверам oneme.ru и ok.ru
- Сквозное E2E шифрование (можно включать для отдельных чатов)
- В планах: поддержка звонков, многопользовательских чатов

<i>Небольшой размер приложения достигается использованием встроенного в устройство веб-браузера (спасибо команде Tauri!)</i>

> ⚠️ <b>Поддерживаются версии Android 9+ (для Keystore 10+)</b>

## Использование
Предварительные версии будут доступны в разделе [Releases](https://github.com/me0wkie/maxplus/releases)

- <b>Что бы приложение запустилось, архитектура процессора должна совпасть</b>.
Например: устройство имеет процессор arm64, тогда устанавливаете maxplus-android-aarch64.apk

- <b>Если не удается запустить, попробуйте заменить браузер на устройстве</b>

### Про обновления
> По умолчанию приложение проверяет обновления в разделе Releases при каждом запуске.

## Разработка
Модификация кода приветствуется - сейчас проект очень сырой!

### Требования
- <b>[Bun](https://bun.sh)</b> или [NodeJS](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/) (для Tauri и сборки)
- [Android Studio](https://developer.android.com/studio) и зависимости для сборки под Android

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
```

## Создание билда
Для создания исполняемых файлов на Windows, Linux, iOS нужна предварительная настройка 
([Windows](https://v2.tauri.app/distribute/windows-installer/), [Debian](https://v2.tauri.app/distribute/debian/), [iOS](https://v2.tauri.app/distribute/app-store/), [macOS](https://v2.tauri.app/distribute/macos-application-bundle/))

### Android
Вместо arm64 - любая желаемая архитектура (aarch64, armv7, i686, x86_6)
```sh
$ cargo-tauri build android --target aarch64

ИЛИ

$ cargo tauri android build --target aarch64
```
Для всех платформ сразу (увеличится размер .apk)
```sh
$ cargo-tauri build android

ИЛИ

$ cargo tauri android build
```
Первый способ (через cargo-tauri) требует дополнительной установки cargo-tauri, но выдаёт меньше ошибок

> ⚠️ <b>Для запуска приложения на Android 10+ важно подписать .apk-файл</b>

## В планах
- [ ] Версия 0.1.0
- [ ] Code review
- [ ] Исправить глобальный поиск
- [ ] Контакты, профили (ох, вёрстка :( )
- [ ] Публичные чаты

... и многое другое

## Источники
-  [PyMax](https://github.com/noxzion/PyMax) - работа с внутренним Max API (вебсокеты)
-  [tauri-keystore-plugin](https://github.com/impierce/tauri-plugin-keystore) - для аппаратного шифрования на мобильных устройствах (TODO сделать форк)
