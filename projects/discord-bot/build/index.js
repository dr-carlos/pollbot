"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const Discord = __importStar(require("discord.js"));
const settings_1 = require("./settings");
const commands = __importStar(require("./commands"));
const Context_1 = require("./Context");
const storage_1 = __importDefault(require("./storage"));
const slashCommands = __importStar(require("./slashCommands"));
const client = new Discord.Client({
    intents: [
        "DIRECT_MESSAGES",
        "DIRECT_MESSAGE_REACTIONS",
        "GUILDS",
        "GUILD_MEMBERS",
        "GUILD_MESSAGES",
        "GUILD_MESSAGE_REACTIONS",
    ],
});
const context = new Context_1.Context(client);
context.init();
slashCommands.registerCommands();
client.once("ready", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log(`Logged in as ${(_b = (_a = client.user) === null || _a === void 0 ? void 0 : _a.tag) !== null && _b !== void 0 ? _b : "undefined"}`);
}));
client.on("guildCreate", (guild) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const guildData = yield storage_1.default.getGuildData(guild.id);
        if (guildData) {
            return;
        }
        yield storage_1.default.createGuildData({
            id: guild.id,
            admins: {},
        });
    }
    catch (_c) {
        console.error("There was an error on guildCreate");
    }
}));
client.on("guildDelete", (guild) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield storage_1.default.deleteGuildData(guild.id);
    }
    catch (_d) {
        console.error("There was an error on guildDelete");
    }
}));
function isCommand(message, command) {
    return message.content.toLowerCase().startsWith(command.toLowerCase());
}
function handleCommandInteraction(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = context.withCommandInteraction(interaction);
        try {
            switch (interaction.commandName) {
                case slashCommands.pollCreateCommand.name:
                    yield pollCreate(ctx);
                    break;
                case slashCommands.pollElectionCommand.name:
                    yield pollElection(ctx);
                    break;
                case slashCommands.pollResultsCommand.name:
                    yield pollResults(ctx);
                    break;
                case slashCommands.pollCloseCommand.name:
                    yield pollClose(ctx);
                    break;
                case slashCommands.pollAuditCommand.name:
                    yield pollAudit(ctx);
                    break;
                case slashCommands.pollUpdateCommand.name:
                    yield pollUpdate(ctx);
                    break;
                case slashCommands.helpCommand.name:
                    yield helpCommand(ctx);
                    break;
                case slashCommands.deleteMyUserDataCommand.name:
                    const user = interaction.options.getUser("confirm_user", true);
                    yield commands.deleteMyUserData(ctx, user);
                    break;
            }
        }
        catch (e) {
            if (e instanceof Discord.DiscordAPIError) {
                if (e.code === 50001) {
                    yield ctx.followUp({
                        embeds: [
                            new Discord.MessageEmbed({
                                color: "RED",
                                description: "I don't have access to successfully complete your command. Please make sure that I'm invited to relevant channels and that my permissions are correct.",
                            }),
                        ],
                        ephemeral: true,
                    });
                    return;
                }
            }
            console.error(e);
            const msg = {
                embeds: [
                    new Discord.MessageEmbed({
                        color: "RED",
                        description: "There was an unknown error with your command. Sorry about that. Please reach out to @dr carlos#3430 if there are further problems",
                    }),
                ],
                ephemeral: true,
            };
            yield ctx.followUp(msg);
        }
    });
}
function handleButtonInteraction(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = context.withButtonInteraction(interaction);
        switch (interaction.customId) {
            case "request_ballot":
                yield commands.createBallotFromButton(ctx);
                break;
        }
    });
}
client.on("interactionCreate", (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (interaction.isCommand())
        return yield handleCommandInteraction(interaction);
    if (interaction.isButton())
        return yield handleButtonInteraction(interaction);
}));
function helpCommand(ctx) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const isPublic = (_a = ctx.interaction.options.getBoolean("public", false)) !== null && _a !== void 0 ? _a : false;
        const commandName = (_b = ctx.interaction.options.getString("command", false)) !== null && _b !== void 0 ? _b : undefined;
        if (commandName) {
            const command = slashCommands.matchCommand(commandName);
            if (command) {
                const embed = commands.commandHelp(command);
                yield ctx.interaction.reply({
                    embeds: [embed],
                    ephemeral: !isPublic,
                });
            }
            else {
                yield ctx.interaction.reply({
                    embeds: [
                        new Discord.MessageEmbed({
                            title: `Couldn\'t recognize the command \`${commandName}\``,
                        }),
                    ],
                    ephemeral: true,
                });
            }
        }
        else {
            yield ctx.interaction.reply({
                embeds: [commands.helpEmbed()],
                ephemeral: !isPublic,
            });
        }
    });
}
function pollCreate(ctx) {
    var _a, _b, _c, _d, _e, _f, _g;
    return __awaiter(this, void 0, void 0, function* () {
        const interaction = ctx.interaction;
        const topic = interaction.options.getString("topic", true);
        const optionsString = interaction.options.getString("options", true);
        const randomizedBallots = (_a = interaction.options.getBoolean("randomized_ballots")) !== null && _a !== void 0 ? _a : true;
        const anytimeResults = (_b = interaction.options.getBoolean("anytime_results")) !== null && _b !== void 0 ? _b : true;
        const preferential = (_c = interaction.options.getBoolean("preferential")) !== null && _c !== void 0 ? _c : true;
        const rankedPairs = (_d = interaction.options.getBoolean("ranked_pairs")) !== null && _d !== void 0 ? _d : false;
        const forceAllPreferences = (_e = interaction.options.getBoolean("force_all_preferences")) !== null && _e !== void 0 ? _e : false;
        const majorityClose = (_f = interaction.options.getBoolean("close_on_majority")) !== null && _f !== void 0 ? _f : false;
        if (((_g = interaction.channel) === null || _g === void 0 ? void 0 : _g.type) !== "GUILD_TEXT")
            return;
        yield commands.createPoll(ctx, topic, optionsString, randomizedBallots, anytimeResults, preferential, rankedPairs, false, forceAllPreferences, false, majorityClose);
    });
}
function pollElection(ctx) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const interaction = ctx.interaction;
        const now = new Date(Date.now());
        let month;
        switch (now.getMonth()) {
            case 0:
                month = "January";
                break;
            case 1:
                month = "February";
                break;
            case 2:
                month = "March";
                break;
            case 3:
                month = "April";
                break;
            case 4:
                month = "May";
                break;
            case 5:
                month = "June";
                break;
            case 6:
                month = "July";
                break;
            case 7:
                month = "August";
                break;
            case 8:
                month = "September";
                break;
            case 9:
                month = "October";
                break;
            case 10:
                month = "November";
                break;
            case 11:
                month = "December";
                break;
            default:
                month = "January";
        }
        const topic = `Server Election --- ${now.getDate()} ${month} ${now.getFullYear()}`;
        const optionsString = interaction.options.getString("candidates", true);
        const pacps = (_a = interaction.options.getBoolean("pacps")) !== null && _a !== void 0 ? _a : true;
        if (((_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.type) !== "GUILD_TEXT")
            return;
        yield commands.createPoll(ctx, topic, optionsString, true, false, true, false, true, true, pacps, false);
    });
}
function pollResults(ctx) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const interaction = ctx.interaction;
        const pollId = interaction.options.getString("poll_id", true);
        const _private = (_a = interaction.options.getBoolean("private")) !== null && _a !== void 0 ? _a : false;
        yield commands.pollResults(ctx, pollId, _private);
    });
}
function pollClose(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const pollId = ctx.interaction.options.getString("poll_id", true);
        yield commands.closePoll(ctx, pollId);
    });
}
function pollAudit(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const pollId = ctx.interaction.options.getString("poll_id", true);
        yield commands.auditPoll(ctx, pollId);
    });
}
function pollUpdate(ctx) {
    var _a, _b, _c, _d, _e, _f, _g;
    return __awaiter(this, void 0, void 0, function* () {
        const interaction = ctx.interaction;
        const pollId = interaction.options.getString("poll_id", true);
        const topic = (_a = interaction.options.getString("topic")) !== null && _a !== void 0 ? _a : undefined;
        const closesAt = (_b = interaction.options.getString("closes_at")) !== null && _b !== void 0 ? _b : undefined;
        const randomizedBallots = (_c = interaction.options.getBoolean("randomized_ballots")) !== null && _c !== void 0 ? _c : undefined;
        const anytimeResults = (_d = interaction.options.getBoolean("anytime_results")) !== null && _d !== void 0 ? _d : true;
        const preferential = (_e = interaction.options.getBoolean("preferential")) !== null && _e !== void 0 ? _e : true;
        const rankedPairs = (_f = interaction.options.getBoolean("ranked_pairs")) !== null && _f !== void 0 ? _f : false;
        const majorityClose = (_g = interaction.options.getBoolean("close_on_majority")) !== null && _g !== void 0 ? _g : false;
        yield commands.updatePoll(ctx, pollId, topic, closesAt, randomizedBallots, anytimeResults, preferential, rankedPairs, majorityClose);
    });
}
client.on("messageCreate", (message) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    try {
        const ctx = context.withMessage(message);
        if (message.author.id === ((_e = client.user) === null || _e === void 0 ? void 0 : _e.id))
            return;
        if (message.channel.type === "DM") {
            yield commands.submitBallot(ctx, message);
            return;
        }
        if (message.channel.type !== "GUILD_TEXT")
            return;
        if (!isCommand(message, commands.POLLBOT_PREFIX)) {
            return;
        }
        if (isCommand(message, commands.CREATE_POLL_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/poll create`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        if (isCommand(message, commands.CLOSE_POLL_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/poll close`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        if (isCommand(message, commands.POLL_RESULTS_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/poll results`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        if (isCommand(message, commands.AUDIT_POLL_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/poll audit`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        if (isCommand(message, commands.SET_POLL_PROPERTIES_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/poll update`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        if (isCommand(message, commands.ADD_POLL_FEATURES_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/poll update`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        if (isCommand(message, commands.REMOVE_POLL_FEATURES_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/poll update`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        if (isCommand(message, commands.DELETE_MY_USER_DATA_COMMAND)) {
            yield ctx.replyOrEdit("This command is obsolete. Please use the slash command `/delete_my_user_data`. If slash commands aren't available, have a server admin re-invite pollbot to your server.");
            return;
        }
        yield commands.help(ctx, message);
        return;
    }
    catch (e) {
        if (e instanceof Discord.DiscordAPIError) {
            if (e.code === 50001) {
                yield message.channel.send({
                    embeds: [
                        new Discord.MessageEmbed({
                            color: "RED",
                            description: "I don't have access to successfully complete your command. Please make sure that I'm invited to relevant channels and that my permissions are correct.",
                        }),
                    ],
                });
                return;
            }
        }
        console.error(e);
        const msg = {
            embeds: [
                new Discord.MessageEmbed({
                    color: "RED",
                    description: "There was an unknown error with your command. Sorry about that. Please reach out to @dr carlos#3430 if there are further problems",
                }),
            ],
        };
        yield message.channel.send(msg);
    }
}));
client.on("raw", (packet) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    try {
        if (!["MESSAGE_REACTION_ADD"].includes(packet.t))
            return;
        if (!((_f = client.user) === null || _f === void 0 ? void 0 : _f.id)) {
            return;
        }
        if (packet.d.user_id === client.user.id) {
            return;
        }
        const cachedChannel = client.channels.cache.get(packet.d.channel_id);
        const channel = (cachedChannel
            ? cachedChannel
            : yield client.channels.fetch(packet.d.channel_id));
        if (channel.messages.cache.has(packet.d.message_id))
            return;
        let message;
        try {
            message = yield channel.messages.fetch(packet.d.message_id);
        }
        catch (e) {
            settings_1.L.d(e);
            return;
        }
        const emoji = packet.d.emoji.id
            ? `${packet.d.emoji.name}:${packet.d.emoji.id}`
            : packet.d.emoji.name;
        const reaction = message.reactions.resolve(emoji);
        if (!reaction)
            return;
        const cachedUser = client.users.cache.get(packet.d.user_id);
        const user = cachedUser
            ? cachedUser
            : yield client.users.fetch(packet.d.user_id);
        reaction.users.cache.set(packet.d.user_id, user);
        reaction.message = message;
        if (packet.t === "MESSAGE_REACTION_ADD") {
            client.emit("messageReactionAdd", reaction, user);
        }
    }
    catch (e) {
        settings_1.L.d("Error in raw reaction add");
        settings_1.L.d(e);
    }
}));
client.on("messageReactionAdd", (reaction, user) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j, _k, _l, _m;
    const ctx = context.withMessageReaction(reaction, user);
    try {
        if (!((_g = client.user) === null || _g === void 0 ? void 0 : _g.id)) {
            return;
        }
        if (user.id === client.user.id) {
            return;
        }
        if (((_j = (_h = reaction.message) === null || _h === void 0 ? void 0 : _h.author) === null || _j === void 0 ? void 0 : _j.id) !== client.user.id) {
            return;
        }
        if (!user) {
            return;
        }
        settings_1.L.d((_k = reaction.message.embeds[0]) === null || _k === void 0 ? void 0 : _k.title);
        if (((_m = (_l = reaction.message.embeds[0]) === null || _l === void 0 ? void 0 : _l.title) === null || _m === void 0 ? void 0 : _m.startsWith(commands.POLL_ID_PREFIX)) ===
            true) {
            settings_1.L.d("Creating ballot...");
            yield commands.createBallot(ctx, reaction.message, user);
            return;
        }
        settings_1.L.d(`Couldn't find poll from reaction: ${reaction.emoji} on message ${reaction.message.id}...`);
    }
    catch (_o) {
        settings_1.L.d("There was an error on reaction");
    }
}));
client.login(settings_1.DISCORD_TOKEN);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQWlDO0FBQ2pDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQixvREFBc0M7QUFDdEMseUNBQThDO0FBQzlDLHFEQUF1QztBQUN2Qyx1Q0FBNEQ7QUFDNUQsd0RBQWdDO0FBQ2hDLCtEQUFpRDtBQUdqRCxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDaEMsT0FBTyxFQUFFO1FBQ1AsaUJBQWlCO1FBQ2pCLDBCQUEwQjtRQUMxQixRQUFRO1FBQ1IsZUFBZTtRQUNmLGdCQUFnQjtRQUNoQix5QkFBeUI7S0FDMUI7Q0FDRixDQUFDLENBQUM7QUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDcEMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0FBRWYsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7QUFFakMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBUyxFQUFFOztJQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixNQUFBLE1BQUEsTUFBTSxDQUFDLElBQUksMENBQUUsR0FBRyxtQ0FBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFSCxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFPLEtBQUssRUFBRSxFQUFFO0lBQ3ZDLElBQUk7UUFDRixNQUFNLFNBQVMsR0FBRyxNQUFNLGlCQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RCxJQUFJLFNBQVMsRUFBRTtZQUNiLE9BQU87U0FDUjtRQUNELE1BQU0saUJBQU8sQ0FBQyxlQUFlLENBQUM7WUFDNUIs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