# Max+ (в разработке)

<b>Мультиплатформенный клиент для мессенджера Max с шифрованием.</b>

Работает с внутренним API - используйте на свой страх и риск! Высок шанс блокировки аккаунта.

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
- Полное отсутствие лишних запросов к серверам oneme.ru и ok.ru
- Сквозное шифрование (можно включать для отдельных чатов)
- В планах: поддержка звонков, публичных чатов

<i>Небольшой размер приложения достигается использованием встроенного в устройство веб-браузера (спасибо команде Tauri!)</i>

> ⚠️ <b>Поддерживаются версии Android 9+</b>

## Использование
Предварительные версии доступна в разделе [Releases](https://github.com/me0wkie/maxplus/releases)

- <b>Что бы приложение запустилось, архитектура процессора должна совпасть</b>.
Например: устройство имеет процессор arm64, тогда устанавливаете max-aarch64.apk

- <b>Если не удается запустить, измените браузер по умолчанию</b>

### Про обновления
> По умолчанию приложение не проверяет обновления, однако это можно изменить в настройках (зеркала проверки - Github, Gitlab). Если кнопка обновлений сломана - вам придётся вручную скачать обновление из раздела Releases.

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
- [ ] Code review
- [ ] Исправить глобальный поиск
- [ ] Контакты, профили (ох, вёрстка :( )
- [ ] Публичные чаты
- [ ] Режим имитации офиц. приложения

... и многое другое

## Источники
-  [PyMax](https://github.com/noxzion/PyMax) - работа с внутренним Max API (вебсокеты)
-  [tauri-keystore-plugin](https://github.com/impierce/tauri-plugin-keystore) - взаимодействие с хранилищем ключей на устройстве
