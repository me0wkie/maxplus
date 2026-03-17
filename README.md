<h1>🍊 Клиент Max+</h1>

<b>Приложение с добавлением E2E шифрования.</b>  
Проект разрабатывается с конца августа в solo, является прототипом, цель которого показать, как можно было!

<div>
    <img src="https://img.shields.io/badge/MIT-green?style=for-the-badge"/>
    <img src="https://img.shields.io/badge/Rust-red?style=for-the-badge&logo=rust&logoColor=white"/>
    <img src="https://img.shields.io/badge/JavaScript-orange?style=for-the-badge&logo=javascript&logoColor=white"/>
</div>

<br>

<b>Что НЕ реализовано:</b>  
➖ Уведомления, звонки, поддержка WebApps, в том числе сферум, поиск, профили (карточки), видео, изображения, стикеры, закрепление, удаление, скачивание чатов, добавление в папку, редактирование папок, аппаратное шифрование.

<b>Что реализовано:</b>  
➕ Вход, регистрация, добавление, удаление контакта, чаты, реакции на сообщения, включение шифрования.

<b>Что должно быть:</b>  
➕ Светлая тема, Telegram Proxy, переключение вида интерфейса между Max/Telegram, 

## Предосторежения
> ⚠️ <b>ВНИМАНИЕ!</b>  
Не призываю никого скачивать данный клиент и заводить аккаунт в Max <b>как альтернативу Telegram</b>. Делайте это только в крайнем случае, когда активны белые списки или хочется поэксперементировать

> ⚠️ <b>Работа с внутренним API</b>  
Используйте на свой страх и риск, сервера могут распознавать клиент и выдать бан

> <b>Поддерживаются версии Android 9+ (для Keystore 10+)</b>

<a href="https://github.com/me0wkie/maxplus/releases/latest"><b>Перейти к скачиванию (пре-релиз .apk)</b></a>

## Содержание
- [Особенности](#особенности)
- [Использование](#использование)
- [Разработка](#разработка)
- [Сборка проекта](#сборка-проекта)
- [В планах](#в-планах)
- [Источники](#источники)

### Особенности
- <b>Открытый исходный код</b>
- Приложение не требует доступ к файлам устройства, микрофону, камере  
- Прозрачность запросов к oneme[.]ru и ok[.]ru, можно просматривать каждый запрос в логах
- Сквозное E2E шифрование (можно включать для отдельных чатов)
- В планах: поддержка звонков, многопользовательских чатов

<b>Небольшой размер приложения достигается использованием встроенных веб-браузеров (спасибо команде Tauri!)</b>

> ❗ В будущем потребуется доступ к камере для покупки пива в Магните (по QR)

## Использование
Предварительные версии доступны в разделе [Releases](https://github.com/me0wkie/maxplus/releases)

- <b>Что бы приложение запустилось, архитектура процессора должна совпасть</b>.  
Например: устройство имеет процессор arm64, тогда устанавливаете maxplus-android-aarch64.apk

- <b>Если не удается запустить, попробуйте заменить браузер по умолчанию на устройстве</b>

### Про обновления
Обновления можно будет проверить, используя кнопку в настройках.  
Скачивание и установка ручные

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

# Опционально (если ошибки из-за jdk > 17)
$ JAVA_HOME=/usr/lib/путь_к_jdk_17 bun run tauri android dev
```
Чтобы ускорить запуск на Android, создайте копию ```tauri.conf.json``` - ```tauri.android.conf.json```
и укажите в ```devUrl``` адрес ПК в локальной сети.

- [Установка Android Studio](https://developer.android.com/studio)
- [Подключение устройства Android](https://developer.android.com/codelabs/basic-android-kotlin-compose-connect-device)
- На Linux процесс может быть немного сложнее.

### Отладка на Android
С запущенным приложением (```bun run tauri android dev```):

Перейти в Chrome на ```chrome://inspect#devices``` -> WebView in org.meowkie.max (tauri.localhost)

## Сборка проекта
Для сборки под Windows, Linux, iOS нужна предварительная настройка 
([Windows](https://v2.tauri.app/distribute/windows-installer/), [Debian](https://v2.tauri.app/distribute/debian/), [iOS](https://v2.tauri.app/distribute/app-store/), [macOS](https://v2.tauri.app/distribute/macos-application-bundle/))

### Сборка под Android на Linux
1. <b>Установите ```Android Studio```, ```Android SDK``` и [Android NDK r21e](https://github.com/android/ndk/wiki/Unsupported-Downloads)</b>  
Версия r21e нужна для корректной сборки <b>(это велосипед, нужно исправить)</b>

2. <b>Согласно инструкции на сайте Tauri, установите зависимости, укажите ```NDK_HOME```, ```ANDROID_HOME```</b>

3. Из-за особенностей сборки, линкуем libunwind -> libgcc <b>(это велосипед, нужно исправить)</b>
```sh
cd $NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/lib/gcc/aarch64-linux-android/4.9.x/
ln -s libgcc.a libunwind.a
```

4. <b>Создайте keystore в папке проекта:</b>
```sh
keytool -genkeypair -v \
  -keystore src-tauri/gen/android/app/keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias secret_123
```

5. <b>Настройте ```keystore.properties``` в папке проекта</b>
```
$ cd src-tauri/gen/android
mv keystore.properties.example keystore.properties
nano keystore.properties
```

5. <b>Сборка</b>  
Вместо aarch64 можно подставить другую архитектуру (armv7, i686, x86_6). Можно собрать для всех платформ Android сразу (увеличится размер .apk)

```sh
$ cargo tauri android build --target aarch64

ИЛИ

$ cargo tauri android build
```

Сборка под iOS возможна только с macOS. Может понадобиться [платная подписка Apple Developer](https://developer.apple.com/support/compare-memberships/)

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
