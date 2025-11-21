import { usersDb, chatsDb } from '$lib/stores/api'

export default class API {
    /*#users = [];
    #user = null;
    #token = null;
    #userDetails = null;*/
    
    _user = null;
    _userDetails = null;
    _device = null;
    folders = [];
    chats = [];
    
    constructor(token) {
        this._token = token;
        this._telemetry();
    }
    
    setUser(userId) {
        this._user = userId;
        if(userId === undefined) usersDb.delete('current');
        else usersDb.set('current', userId);
    }
    
    setToken(token) {
        this._token = token;
        if(token === undefined) usersDb.delete('token-' + this._user);
        else usersDb.set('token-' + this._user, token);
    }
    
    async loadToken() {
        throw "loadToken: Unimplemented"
    }
    
    async loadDevice() {
        let device = await usersDb.get('device-' + this._user);
        if (!device) {
            device = this.generateDevice();
            await usersDb.set('device-' + this._user, device);
        }
        this._device = device;
    }
    
    generateDevice() {
        return {
            id: crypto.randomUUID().replace(/-/g,''),
            mt: crypto.randomUUID(),
        }
    }
    
    getDevice() { // TODO deletion
        return this._device;
    }
    
    setUserDetails(contact) {
        this._userDetails = contact;
        if(contact === undefined) usersDb.delete('user-' + this._user);
        else usersDb.set('user-' + this._user, contact);
    }
    
    getUser() { return this._user; }
    getToken() { return this._token; }
    getUserDetails() { return this._userDetails; }
    
    /*getUser() { return this.#user; }
    getUserDetails() { return clone(this.#userDetails); }
    setUserDetails(details) { this.#userDetails = details; }
    setUser(user) { this.#user = user; }*/
    
    connect() { throw "connect: Unimplemented" }
    logout() { throw "logout: Unimplemented" }
    
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
    addContact() { throw "addContact :Unimplemented" }
    removeContact() { throw "removeContact: Unimplemented" }
    search() { throw "search: Unimplemented" }
    
    onCall() { throw "onCall: Unimplemented" }
    onMessage() { throw "onMessage: Unimplemented" }
}

const clone = o => JSON.parse(JSON.stringify(o))
