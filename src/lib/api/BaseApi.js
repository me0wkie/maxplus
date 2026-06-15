import { usersDb, chatsDb } from "$lib/stores/api";

// prettier-ignore
export default class API {
    _user = null;
    _device = null;
    folders = [];
    
    chats = [];
    savedMessages = {};
    
    constructor(token) {
        this._token = token;
        this._telemetry();
    }
    
    async setUser(userId) {
        this._user = userId;
        if(userId === undefined) await usersDb.delete('current');
        else await usersDb.set('current', userId);
    }
    
    async setToken(token) {
        this._token = token;
        if(token === undefined) await usersDb.delete('token-' + this._user);
        else await usersDb.set('token-' + this._user, token);
    }
    
    async loadToken() {
        throw "loadToken: Unimplemented"
    }
    
    async loadDevice() { // TODO merge with getDevice
        let device = await usersDb.get('device-' + this._user);
        if (!device) {
            device = await usersDb.get('device');
            if (!device) device = this.generateDevice();
            await usersDb.set('device-' + this._user, device);
        }
        this._device = device;
    }
    
    generateDevice() {
        const [ appVersion, buildNumber ] = pick(APP_VERSION);
        const [ deviceName, osVersion, screen, arch ] = pick(ANDROID_DEVICES);
        const [ locale, timezone ] = pick(LOCALE_TIMEZONES);

        return {
            clientSessionId: 1,
            mtInstance: crypto.randomUUID(),
            userAgent: {
                deviceType: "ANDROID",
                appVersion,
                osVersion,
                timezone,
                screen,
                pushDeviceType: "GCM",
                arch,
                locale,
                buildNumber,
                deviceName,
                deviceLocale: locale,
                //release: "",
            },
            deviceId: crypto.randomUUID().replace(/-/g,''),
        }
    }
    
    getDevice() { // TODO deletion
        return this._device;
    }

    async checkDevice() { // TODO merge with loadDevice
        let device = await usersDb.get('device');
        console.log(device)
        if (!device) {
            device = this.generateDevice();
            await usersDb.set('device', device);
        }
        return device;
    }
    
    getUser() { return this._user; }
    getToken() { return this._token; }
    
    connect() { throw "connect: Unimplemented" }
    logout() { throw "logout: Unimplemented" }
    getSessions() { throw "getSessions: Unimplemented" }
    closeAllSessions() { throw "closeAllSessions: Unimplemented" }
    checkPassword() { throw "checkPassword: Unimplemented" }
    setPassword() { throw "setPassword: Unimplemented" }

    _telemetry() { throw "_telemetry: Unimplemented" }
    
    startAuth() { throw "startAuth: Unimplemented" }
    login() { throw "login: Unimplemented" }
    register() { throw "register: Unimplemented" }
    
    sync() { throw "sync: Unimplemented" }
    getFolders() { throw "getFolders: Unimplemented" }
    getMessages() { throw "getMessages: Unimplemented" }
    sendMessage() { throw "sendMessage: Unimplemented" }
    pinMessage() { throw "pinMessage: Unimplemented" }
    reaction() { throw "reaction: Unimplemented" }
    addContact() { throw "addContact: Unimplemented" }
    removeContact() { throw "removeContact: Unimplemented" }
    searchPublic() { throw "searchPublic: Unimplemented" }
    searchMsg() { throw "searchMsg: Unimplemented" }
    getVideoById() { throw "getVideoById: Unimplemented" }
    getFileById() { throw "getFileById: Unimplemented" }
    readMessage() { throw "readMessage: Unimplemented" }
    getCalls() { throw "getCalls: Unimplemented" }
    updateProfile() { throw "updateProfile: Unimplemented" }
    
    onCall() { throw "onCall: Unimplemented" }
    onMessage() { throw "onMessage: Unimplemented" }

    uploadAttachment() { throw "uploadAttachment: Unimplemented" }
}

/*
 * Source: https://github.com/MaxApiTeam/PyMax/blob/main/src/pymax/config.py
 * MIT License: https://github.com/MaxApiTeam/PyMax/blob/main/LICENSE
 */

const APP_VERSION = [
    ["26.14.1", 6686],
    ["26.14.0", 6685],
    ["26.13.0", 6683],
    ["26.12.2", 6681],
    ["26.12.1", 6679],
    ["26.12.0", 6678],
    ["26.11.3", 6680],
    ["26.11.2", 6669],
    ["26.11.1", 6665],
    ["26.11.0", 6661],
]

const ANDROID_DEVICES = [
    ["Samsung SM-A525F", "Android 13", "405dpi 405dpi 1080x2400", "arm64-v8a"],
    ["Samsung SM-A536B", "Android 14", "405dpi 405dpi 1080x2400", "arm64-v8a"],
    ["Samsung SM-A546E", "Android 14", "405dpi 405dpi 1080x2340", "arm64-v8a"],
    ["Samsung SM-G991B", "Android 14", "421dpi 421dpi 1080x2400", "arm64-v8a"],
    ["Samsung SM-G998B", "Android 13", "515dpi 515dpi 1440x3200", "arm64-v8a"],
    ["Samsung SM-S901B", "Android 14", "425dpi 425dpi 1080x2340", "arm64-v8a"],
    ["Samsung SM-S911B", "Android 14", "425dpi 425dpi 1080x2340", "arm64-v8a"],
    ["Xiaomi 2109119DG", "Android 13", "395dpi 395dpi 1080x2400", "arm64-v8a"],
    ["Xiaomi 2201117TG", "Android 13", "395dpi 395dpi 1080x2400", "arm64-v8a"],
    ["Xiaomi 2201123G", "Android 14", "526dpi 526dpi 1440x3200", "arm64-v8a"],
    ["Xiaomi 2210132G", "Android 14", "446dpi 446dpi 1220x2712", "arm64-v8a"],
    ["Xiaomi 23049PCD8G", "Android 14", "446dpi 446dpi 1220x2712", "arm64-v8a"],
    ["Redmi 2201116TG", "Android 13", "395dpi 395dpi 1080x2400", "arm64-v8a"],
    ["Redmi 22101316G", "Android 13", "395dpi 395dpi 1080x2400", "arm64-v8a"],
    ["Redmi 23021RAA2Y", "Android 14", "395dpi 395dpi 1080x2400", "arm64-v8a"],
    ["POCO 22011211G", "Android 13", "395dpi 395dpi 1080x2400", "arm64-v8a"],
    ["POCO 23049PCD8G", "Android 14", "446dpi 446dpi 1220x2712", "arm64-v8a"],
    ["Pixel 6", "Android 14", "411dpi 411dpi 1080x2400", "arm64-v8a"],
    ["Pixel 6a", "Android 14", "429dpi 429dpi 1080x2400", "arm64-v8a"],
    ["Pixel 7", "Android 14", "416dpi 416dpi 1080x2400", "arm64-v8a"],
    ["Pixel 7 Pro", "Android 14", "512dpi 512dpi 1440x3120", "arm64-v8a"],
    ["Pixel 8", "Android 14", "428dpi 428dpi 1080x2400", "arm64-v8a"],
    ["OnePlus NE2213", "Android 14", "525dpi 525dpi 1440x3216", "arm64-v8a"],
    ["OnePlus CPH2449", "Android 14", "451dpi 451dpi 1240x2772", "arm64-v8a"],
    ["realme RMX3085", "Android 13", "409dpi 409dpi 1080x2400", "arm64-v8a"],
    ["realme RMX3370", "Android 13", "409dpi 409dpi 1080x2400", "arm64-v8a"],
    ["realme RMX3630", "Android 13", "400dpi 400dpi 1080x2412", "arm64-v8a"],
    ["HUAWEI ELS-NX9", "Android 12", "441dpi 441dpi 1080x2340", "arm64-v8a"],
    ["HUAWEI VOG-L29", "Android 12", "398dpi 398dpi 1080x2340", "arm64-v8a"],
    ["HONOR RMO-NX1", "Android 13", "391dpi 391dpi 1080x2388", "arm64-v8a"],
    ["HONOR REA-NX9", "Android 13", "435dpi 435dpi 1200x2664", "arm64-v8a"],
];

const LOCALE_TIMEZONES = [
    ["ru", "Europe/Moscow"],
    ["ru", "Europe/Kaliningrad"],
    ["ru", "Europe/Samara"],
    ["ru", "Asia/Yekaterinburg"],
    ["ru", "Asia/Omsk"],
    ["ru", "Asia/Novosibirsk"],
    ["ru", "Asia/Krasnoyarsk"],
    ["ru", "Asia/Irkutsk"],
    ["ru", "Asia/Yakutsk"],
    ["ru", "Asia/Vladivostok"],
];

const pick = a => a[Math.floor(Math.random() * a.length)];

const clone = (o) => JSON.parse(JSON.stringify(o));
