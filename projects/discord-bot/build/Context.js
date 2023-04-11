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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9Db250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLDJDQUEwZjtBQUUxZix5REFBbUQ7QUFDbkQseUNBQXFFO0FBRXJFLHlDQUE4QjtBQVc5QixNQUFhLE9BQU87SUFVaEIsWUFDSSxNQUFjLEVBQ2QsSUFBc0IsRUFDdEIsV0FBK0IsRUFDL0IsUUFBbUIsRUFDbkIsV0FBZSxFQUNmLElBQWMsRUFDZCxhQUFhLEdBQUcsS0FBSyxFQUNyQixZQUFnQjtRQUVoQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUMvQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLFdBQWdCLENBQUE7UUFDcEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUE7UUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFpQixDQUFBO1FBQ3RDLElBQUksYUFBYTtZQUNiLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRUssSUFBSTs7WUFDTixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDakQsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN4QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtRQUM5QixDQUFDO0tBQUE7SUFFSyxTQUFTLENBQUMsS0FBMkI7O1lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM1QyxP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