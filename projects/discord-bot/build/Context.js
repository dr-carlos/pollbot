"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
const discord_js_1 = require("discord.js");
const promise_1 = require("@qntnt/ts-utils/lib/promise");
const commands_1 = require("./commands");
const settings_1 = require("./settings");
class Context {
    constructor(client, type, application, botOwner, interaction, user, isInitialized = false, replyMessage) {
        this._type = type;
        this._client = client;
        this._application = application;
        this._botOwner = botOwner;
        this._interaction = interaction;
        this._user = user;
        this._isInitialized = false;
        this._replyMessage = replyMessage;
        if (isInitialized)
            this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this._application = yield this.fetchApplication();
            this._botOwner = yield this.fetchOwner();
            this._isInitialized = true;
        });
    }
    withReply(reply) {
        return __awaiter(this, void 0, void 0, function* () {
            const msg = yield this.resolveMessage(reply);
            return new Context(this._client, this._type, this._application, this._botOwner, this._interaction, this._user, this._isInitialized, msg);
        });
    }
    withButtonInteraction(buttonInteraction) {
        return new Context(this._client, 'CommandInteraction', this._application, this._botOwner, buttonInteraction, buttonInteraction.user, this._isInitialized, this._replyMessage);
    }
    withCommandInteraction(commandInteraction) {
        return new Context(this._client, 'CommandInteraction', this._application, this._botOwner, commandInteraction, commandInteraction.user, this._isInitialized, this._replyMessage);
    }
    withMessage(message) {
        var _a;
        const user = message.channel.type === 'DM' ? message.author : (_a = message.member) !== null && _a !== void 0 ? _a : message.author;
        return new Context(this._client, 'Message', this._application, this._botOwner, message, user, this._isInitialized, this._replyMessage);
    }
    withMessageReaction(reaction, user) {
        return new Context(this._client, 'MessageReaction', this._application, this._botOwner, reaction, user, this._isInitialized, this._replyMessage);
    }
    client() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._client.isReady()) {
                return this._client;
            }
            yield (0, promise_1.delay)(1000);
            return yield this.client();
        });
    }
    application() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.fetchApplication();
        });
    }
    get interaction() {
        return this._interaction;
    }
    get user() {
        if (this._user === undefined)
            throw 'Context user not defined';
        return this._user;
    }
    get guild() {
        var _a, _b;
        if (this.isMessage() || this.isCommandInteraction()) {
            return (_a = this.interaction.guild) !== null && _a !== void 0 ? _a : undefined;
        }
        if (this.isMessageReaction()) {
            return (_b = this.interaction.message.guild) !== null && _b !== void 0 ? _b : undefined;
        }
        return undefined;
    }
    defer(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isCommandInteraction()) {
                const _msg = yield this.interaction.deferReply(Object.assign(Object.assign({}, options), { fetchReply: true }));
                const msg = yield this.resolveMessage(_msg);
                return this.withReply(msg);
            }
            throw new Error('Can only defer from a CommandInteraction context');
        });
    }
    fetchUser() {
        return __awaiter(this, void 0, void 0, function* () {
            const c = yield this.client();
            return c.users.fetch(this.user.id);
        });
    }
    isBotOwner(user) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!user) {
                settings_1.L.d('User doesn\'t exist');
                return false;
            }
            const owner = yield this.fetchOwner();
            settings_1.L.d('Owner', owner);
            if (owner) {
                if ((0, commands_1.isTeam)(owner) && ((_a = owner.members) === null || _a === void 0 ? void 0 : _a.has(user.id)) === true) {
                    settings_1.L.d('Owner', owner);
                    return true;
                }
                else {
                    const isOwner = owner.id === user.id;
                    settings_1.L.d('Owner === user', isOwner);
                    return isOwner;
                }
            }
            else {
                return false;
            }
        });
    }
    memberHasSomeRole(options) {
        for (const roleName of options.roleNames) {
            if (this.memberHasRole(roleName, { caseSensitive: options.caseSensitive })) {
                return true;
            }
        }
        return false;
    }
    memberHasRole(roleName, options = { caseSensitive: true }) {
        if (this.isCommandInteraction()) {
            const member = this.interaction.member;
            const predicate = options.caseSensitive ? (r) => r.name === roleName : (r) => r.name.toLowerCase() === roleName.toLowerCase();
            return member.roles.cache.some(predicate);
        }
        return false;
    }
    checkPermissions(permissions = [], poll = undefined) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isCommandInteraction()) {
                const member = this.interaction.member;
                const memberPermissions = this.interaction.memberPermissions;
                const hasPerm = (p) => permissions.indexOf(p) !== -1;
                const isOwner = yield this.isBotOwner(this.user);
                if (hasPerm('botOwner') && isOwner) {
                    return true;
                }
                if (poll === undefined) {
                    settings_1.L.d('Poll doesn\'t exist in checkPermissions');
                    throw 'Poll doesn\'t exist';
                }
                if (((_a = poll.context) === null || _a === void 0 ? void 0 : _a.$case) === 'discord') {
                    if (hasPerm('pollOwner') && (poll.ownerId === this.user.id || poll.context.discord.ownerId === this.user.id)) {
                        settings_1.L.d('Poll owner');
                        return true;
                    }
                    if (this.interaction.guildId !== poll.context.discord.guildId)
                        throw 'The poll you are trying to audit does not belong to this server.';
                    if (hasPerm('guildAdmin') && (memberPermissions === null || memberPermissions === void 0 ? void 0 : memberPermissions.has('ADMINISTRATOR')) === true) {
                        settings_1.L.d('user', this.interaction.member);
                        return true;
                    }
                    if (hasPerm('pollbotAdmin')) {
                        if (this.memberHasSomeRole({
                            roleNames: ['pollbotadmin', 'pollbot_admin', 'pollbot admin'],
                            caseSensitive: false,
                        })) {
                            return true;
                        }
                    }
                    if (hasPerm('pollGuild') && this.interaction.member) {
                        return true;
                    }
                    throw `Missing permissions ${permissions}`;
                }
                throw 'Invalid poll context';
            }
            else {
                throw 'Message commands are not obsolete';
            }
        });
    }
    fetchApplication() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._application === undefined) {
                const client = yield this.client();
                this._application = client.application;
                this._application = yield this._application.fetch();
            }
            return this._application;
        });
    }
    fetchOwner() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this._botOwner) {
                return this._botOwner;
            }
            const app = yield this.application();
            settings_1.L.d('App', app.id, app.owner);
            this._botOwner = (_a = app.owner) !== null && _a !== void 0 ? _a : undefined;
            return this._botOwner;
        });
    }
    messagePayload(response) {
        let payload = {};
        if (typeof (response) === 'string') {
            payload = {
                embeds: [
                    new discord_js_1.MessageEmbed({
                        description: response.substring(0, 1024),
                    })
                ]
            };
        }
        else {
            payload = response;
        }
        return payload;
    }
    directMessage(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = this.messagePayload(response);
            const u = yield this.fetchUser();
            if (u.dmChannel) {
                u.dmChannel.send(payload);
            }
            else {
                const channel = yield u.createDM();
                channel.send(payload);
            }
        });
    }
    followUp(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.hasInteraction())
                throw new Error('Cannot send message with no interaction');
            const payload = this.messagePayload(response);
            if (this.isCommandInteraction()) {
                const msg = yield this.interaction.followUp(Object.assign(Object.assign({}, payload), { fetchReply: true }));
                return yield this.resolveMessage(msg);
            }
            if (this.isMessage()) {
                return yield this.interaction.channel.send(payload);
            }
            if (this.isMessageReaction()) {
                return yield this.interaction.message.channel.send(payload);
            }
            throw new Error('Unknown context type for reply');
        });
    }
    editReply(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.hasInteraction())
                throw new Error('Cannot reply with no interaction');
            const payload = this.messagePayload(response);
            if (this.isCommandInteraction()) {
                let commandInteraction = this.interaction;
                let msg;
                if (!this.interaction.replied) {
                    msg = yield commandInteraction.editReply(Object.assign({}, payload));
                }
                else {
                    msg = yield commandInteraction.editReply(Object.assign({}, payload));
                }
                this._replyMessage = msg;
                return this.resolveMessage(msg);
            }
            if (this.isMessage()) {
                if (this.replied()) {
                    const msg = yield this._replyMessage.edit(payload);
                    this._replyMessage = msg;
                    return msg;
                }
                throw new Error('No message to edit...');
            }
            if (this.isMessageReaction()) {
                if (this.replied()) {
                    const msg = yield this._replyMessage.edit(payload);
                    this._replyMessage = msg;
                    return msg;
                }
                throw new Error('No message to edit...');
            }
            throw new Error('Unknown context type for reply');
        });
    }
    replyOrEdit(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.hasInteraction())
                throw new Error('Cannot reply with no interaction');
            const payload = this.messagePayload(response);
            if (this.isCommandInteraction()) {
                let msg;
                if (!this.interaction.replied) {
                    settings_1.L.d(`!replied ${this._replyMessage === undefined}`);
                    msg = yield this.interaction.reply(Object.assign(Object.assign({}, payload), { fetchReply: true }));
                }
                else {
                    settings_1.L.d('replied');
                    msg = yield this.editReply(Object.assign({}, payload));
                }
                this._replyMessage = msg;
                return this.resolveMessage(msg);
            }
            if (this.isMessage()) {
                if (this.replied()) {
                    const msg = yield this._replyMessage.edit(payload);
                    this._replyMessage = msg;
                    return msg;
                }
                else {
                    const msg = yield this.interaction.channel.send(payload);
                    this._replyMessage = msg;
                    return msg;
                }
            }
            if (this.isMessageReaction()) {
                if (this.replied()) {
                    const msg = yield this._replyMessage.edit(payload);
                    this._replyMessage = msg;
                    return msg;
                }
                else {
                    const msg = yield this.interaction.message.channel.send(payload);
                    this._replyMessage = msg;
                    return msg;
                }
            }
            throw new Error('Unknown context type for reply');
        });
    }
    replied() {
        if (this.isCommandInteraction()) {
            return this.interaction.deferred || this.interaction.replied;
        }
        return this._replyMessage !== undefined;
    }
    hasInteraction() {
        return this._type !== undefined && this._interaction !== undefined;
    }
    isCommandInteraction() {
        return this._type === 'CommandInteraction';
    }
    isMessage() {
        return this._type === 'Message';
    }
    isMessageReaction() {
        return this._type === 'MessageReaction';
    }
    resolveMessage(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isMessage(msg)) {
                return msg;
            }
            else {
                const client = yield this.client();
                const channel = yield client.channels.fetch(msg.channel_id);
                return yield channel.messages.fetch(msg.id);
            }
        });
    }
}
exports.Context = Context;
function isMessage(msg) {
    if (msg === undefined)
        return false;
    const _msg = msg;
    return typeof (_msg.edit) == 'function' &&
        typeof (_msg.delete) === 'function' &&
        typeof (_msg.reply) === 'function' &&
        typeof (_msg.react) === 'function';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9Db250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE0VjtBQUU1Vix5REFBbUQ7QUFDbkQseUNBQXFFO0FBRXJFLHlDQUE4QjtBQVc5QixNQUFhLE9BQU87SUFVaEIsWUFDSSxNQUFjLEVBQ2QsSUFBc0IsRUFDdEIsV0FBK0IsRUFDL0IsUUFBbUIsRUFDbkIsV0FBZSxFQUNmLElBQWMsRUFDZCxhQUFhLEdBQUcsS0FBSyxFQUNyQixZQUFnQjtRQUVoQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUMvQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQWdCLENBQUE7UUFDcEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUE7UUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFpQixDQUFBO1FBQ3RDLElBQUksYUFBYTtZQUNiLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRUssSUFBSTs7WUFDTixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDakQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN4QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtRQUM5QixDQUFDO0tBQUE7SUFFSyxTQUFTLENBQUMsS0FBMkI7O1lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM1QyxP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