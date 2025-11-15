import { usersDb, chatsDb } from '$lib/stores/api'

export default class API {
    /*#users = [];
    #user = null;
    #token = null;
    #userDetails = null;*/
    
    _user = null;
    _userDetails = null;
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
    
    setUserDetails(contact) {
        this._userDetails = contact;
        if(contact === undefined) usersDb.delete('user-' + this._user);
        else usersDb.set('user-' + this._user, contact);
    }
    
    getToken() { return this._token; }
    getUserDetails() { return this._userDetails; }
    
    /*getUser() { return this.#user; }
    getUserDetails() { return clone(this.#userDetails); }
    setUserDetails(details) { this.#userDetails = details; }
    setUser(user) { this.#user = user; }*/
    
    connect() { throw "Unimplemented" }
    logout() { throw "Unimplemented" }
    
    _telemetry() { throw "Unimplemented" }
    
    login() { throw "Unimplemented" }
    register() { throw "Unimplemented" }
    verifyLogin() { throw "Unimplemented" }
    verifyRegister() { throw "Unimplemented" }
    
    sync() { throw "Unimplemented" }
    getFolders() { throw "Unimplemented" }
    getMessages() { throw "Unimplemented" }
    sendMessage() { throw "Unimplemented" }
    pinMessage() { throw "Unimplemented" }
    reaction() { throw "Unimplemented" }
    addContact() { throw "Unimplemented" }
    removeContact() { throw "Unimplemented" }
    search() { throw "Unimplemented" }
    
    onCall() { throw "Unimplemented" }
    onMessage() { throw "Unimplemented" }
}

const clone = o => JSON.parse(JSON.stringify(o))
