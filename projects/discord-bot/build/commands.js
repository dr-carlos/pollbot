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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMyUserData = exports.auditPoll = exports.isGuildMember = exports.toCSV = exports.help = exports.helpEmbed = exports.commandHelp = exports.submitBallot = exports.createBallot = exports.createBallotFromButton = exports.pollResults = exports.closePoll = exports.updatePoll = exports.createPoll = exports.isTeam = exports.POLL_ID_PREFIX = exports.DELETE_MY_USER_DATA_COMMAND = exports.SET_POLL_PROPERTIES_COMMAND = exports.REMOVE_POLL_FEATURES_COMMAND = exports.ADD_POLL_FEATURES_COMMAND = exports.AUDIT_POLL_COMMAND = exports.POLL_RESULTS_COMMAND = exports.CLOSE_POLL_COMMAND = exports.CREATE_POLL_COMMAND = exports.POLLBOT_PREFIX = void 0;
const discord_js_1 = require("discord.js");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const models_1 = require("./models");
const storage_1 = __importDefault(require("./storage"));
const voting_1 = require("./voting");
const condorcet_1 = require("./voting/condorcet");
const settings_1 = require("./settings");
const record_1 = require("./util/record");
const luxon_1 = require("luxon");
const columnify_1 = __importDefault(require("columnify"));
const slashCommands_1 = require("./slashCommands");
exports.POLLBOT_PREFIX = settings_1.PREFIX;
exports.CREATE_POLL_COMMAND = `${exports.POLLBOT_PREFIX} poll`;
exports.CLOSE_POLL_COMMAND = `${exports.POLLBOT_PREFIX} close`;
exports.POLL_RESULTS_COMMAND = `${exports.POLLBOT_PREFIX} results`;
exports.AUDIT_POLL_COMMAND = `${exports.POLLBOT_PREFIX} audit`;
exports.ADD_POLL_FEATURES_COMMAND = `${exports.POLLBOT_PREFIX} addFeatures`;
exports.REMOVE_POLL_FEATURES_COMMAND = `${exports.POLLBOT_PREFIX} removeFeatures`;
exports.SET_POLL_PROPERTIES_COMMAND = `${exports.POLLBOT_PREFIX} set`;
exports.DELETE_MY_USER_DATA_COMMAND = `${exports.POLLBOT_PREFIX} deleteMyUserData`;
exports.POLL_ID_PREFIX = "Poll ";
function isTeam(userTeam) {
    return userTeam !== undefined && userTeam.ownerId !== null;
}
exports.isTeam = isTeam;
function simpleEmbed(title, description) {
    return new discord_js_1.MessageEmbed({
        title,
        description,
    });
}
function simpleSendable(title, description) {
    return {
        embeds: [simpleEmbed(title, description)],
    };
}
function createPoll(_ctx, topic, optionsString, randomizedBallots, anytimeResults, preferential, rankedPairs, election, forceAllPreferences, pacps, majorityClose) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = yield _ctx.defer();
        const optionsList = optionsString
            .split(",")
            .map((o) => o.trim())
            .filter((o) => o !== "");
        if (optionsList.length < 2)
            return yield ctx.editReply(simpleSendable("You must specify at least two options in a poll."));
        if (optionsList.length > 26)
            return yield ctx.editReply(simpleSendable("Polls cannot have more than 26 options"));
        const options = {};
        optionsList.forEach((o, i) => {
            const key = String.fromCharCode(97 + i);
            options[key] = o;
        });
        if (!ctx.guild) {
            yield ctx.editReply("Couldn't determine your server...");
            throw new Error("Couldn't determine guild...");
        }
        const features = [];
        if (!randomizedBallots)
            features.push(models_1.PollFeature.DISABLE_RANDOMIZED_BALLOTS);
        if (!anytimeResults)
            features.push(models_1.PollFeature.DISABLE_ANYTIME_RESULTS);
        if (!preferential || optionsList.length == 2)
            features.push(models_1.PollFeature.DISABLE_PREFERENCES);
        if (rankedPairs)
            features.push(models_1.PollFeature.RANKED_PAIRS);
        if (election)
            features.push(models_1.PollFeature.ELECTION_POLL);
        if (forceAllPreferences)
            features.push(models_1.PollFeature.FORCE_ALL_PREFERENCES);
        if (pacps)
            features.push(models_1.PollFeature.PACPS);
        if (majorityClose)
            features.push(models_1.PollFeature.CLOSE_ON_MAJORITY);
        const context = {
            $case: "discord",
            discord: {
                guildId: ctx.guild.id,
                ownerId: ctx.user.id,
            },
        };
        const pollConfig = {
            topic,
            options,
            features,
            context,
        };
        const poll = yield storage_1.default.createPoll(pollConfig);
        if (!poll)
            return yield ctx.editReply(simpleSendable("I couldn't make this poll. Something went wrong."));
        poll.roleCache = (_a = ctx.guild) === null || _a === void 0 ? void 0 : _a.roles.cache;
        if (election)
            poll.closesAt = (0, moment_timezone_1.default)().add(3, "days").toDate();
        const metrics = yield storage_1.default.getPollMetrics(poll.id);
        const pollMessage = yield ctx.editReply({
            embeds: [yield createPollEmbed(ctx, poll, metrics)],
            components: [
                new discord_js_1.MessageActionRow().addComponents(new discord_js_1.MessageButton()
                    .setCustomId("request_ballot")
                    .setLabel(election ? "Re-Request Ballot" : "Request Ballot")
                    .setStyle("PRIMARY")),
            ],
        });
        const pollMsgEmbed = yield createPollEmbed(ctx, poll, metrics, {
            message: pollMessage,
        });
        pollMessage.embeds = [pollMsgEmbed];
        if (((_b = poll.context) === null || _b === void 0 ? void 0 : _b.$case) === "discord") {
            poll.context.discord.messageRef = {
                channelId: pollMessage.channelId,
                id: pollMessage.id,
            };
        }
        yield storage_1.default.updatePoll(poll.id, poll);
    });
}
exports.createPoll = createPoll;
function createPollEmbed(ctx, poll, metrics, result) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const election = poll.features.includes(models_1.PollFeature.ELECTION_POLL);
        const { message } = result !== null && result !== void 0 ? result : {};
        const closesAt = (0, moment_timezone_1.default)(poll.closesAt)
            .tz("Australia/Hobart")
            .format("dddd, MMMM Do YYYY, h:mm zz");
        if (election &&
            message != null &&
            !poll.features.includes(models_1.PollFeature.SENT_ELECTION_DMS)) {
            const channel = yield ((_a = ctx.guild) === null || _a === void 0 ? void 0 : _a.channels.fetch(message.channelId));
            const rawMembers = channel === null || channel === void 0 ? void 0 : channel.members;
            if (rawMembers != null) {
                let newMembers = null;
                if ("add" in rawMembers) {
                    const fetchedMembers = yield rawMembers.fetch();
                    if ("concat" in fetchedMembers) {
                        const mappedMembers = fetchedMembers.mapValues((member) => member.guildMember);
                        mappedMembers.sweep((member) => member == null);
                        newMembers = mappedMembers;
                    }
                    else {
                        newMembers =
                            fetchedMembers.guildMember == null
                                ? new discord_js_1.Collection()
                                : new discord_js_1.Collection([["0", fetchedMembers.guildMember]]);
                    }
                }
                const members = (newMembers == null ? rawMembers : newMembers);
                const a = yield (channel === null || channel === void 0 ? void 0 : channel.fetch());
                const b = (_b = message.guild) === null || _b === void 0 ? void 0 : _b.channels.cache.find((ch) => ch.name == (channel === null || channel === void 0 ? void 0 : channel.name));
                console.log(a === null || a === void 0 ? void 0 : a.members);
                if (poll.features.includes(models_1.PollFeature.PACPS)) {
                    const candidateRoles = Object.values(poll.options).map((o) => { var _a, _b, _c; return (_c = (_b = (_a = ctx.guild) === null || _a === void 0 ? void 0 : _a.roles.cache.find((role) => role.name === o)) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : ""; });
                    const roleMap = {};
                    const nonCandidateVoters = [];
                    candidateRoles.forEach((roleID) => (roleMap[roleID] = []));
                    members.each(function (member) {
                        var _a;
                        if ((_a = member.user) === null || _a === void 0 ? void 0 : _a.bot)
                            return;
                        let candidate = false;
                        for (const role of member.roles.cache.values())
                            if (candidateRoles.includes(role.id)) {
                                roleMap[role.id].push(member.user);
                                candidate = true;
                            }
                        if (!candidate)
                            nonCandidateVoters.push(member.user);
                    });
                    for (const users of Object.values(roleMap))
                        createBallot(ctx, message, users[Math.floor(Math.random() * users.length)], false);
                    for (const user of nonCandidateVoters)
                        createBallot(ctx, message, user, false);
                }
                else
                    for (const member of members)
                        if (!((_c = member[1].user) === null || _c === void 0 ? void 0 : _c.bot))
                            createBallot(ctx, message, member[1].user, false);
                poll.features.push(models_1.PollFeature.SENT_ELECTION_DMS);
            }
        }
        const optionText = Object.values(poll === null || poll === void 0 ? void 0 : poll.options)
            .map((o) => {
            var _a, _b, _c;
            return election
                ? (_c = `<@&${(_b = (_a = poll.roleCache) === null || _a === void 0 ? void 0 : _a.find((role) => role.name == o)) === null || _b === void 0 ? void 0 : _b.id}>`) !== null && _c !== void 0 ? _c : `\`${o}\``
                : `\`${o}\``;
        })
            .join(", ");
        let footerText = `This poll closes at ${closesAt}`;
        if (metrics && (message === null || message === void 0 ? void 0 : message.editable)) {
            footerText += `\nBallots: ${metrics.ballotsSubmitted} submitted / ${metrics.ballotsRequested} ${election ? "sent" : "requested"}`;
        }
        settings_1.L.d(footerText);
        return new discord_js_1.MessageEmbed({
            title: `${exports.POLL_ID_PREFIX}${poll.id}`,
            description: election
                ? "Someone in each party has been DM-ed a ballot, as have all non-candidates."
                : "React to this message for me to DM you a ballot",
        })
            .addField(poll.topic, optionText)
            .setFooter({
            text: footerText,
        });
    });
}
function updatePoll(_ctx, pollId, topic, closesAt, randomizedBallots, anytimeResults, preferential, rankedPairs, forceAllPreferences, pacps, majorityClose) {
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = yield _ctx.defer({ ephemeral: true });
        const poll = yield storage_1.default.getPoll(pollId);
        if (!poll) {
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`I couldn't find poll ${pollId}`)), { ephemeral: true }));
        }
        try {
            yield ctx.checkPermissions(["botOwner", "guildAdmin", "pollbotAdmin", "pollOwner"], poll);
        }
        catch (_a) {
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`You don't have permission to edit this poll`)), { ephemeral: true }));
        }
        let embed = new discord_js_1.MessageEmbed({ description: `Poll#${poll.id} updated!` });
        if (topic) {
            poll.topic = topic;
            embed = embed.addField("topic", topic);
        }
        if (closesAt) {
            const date = luxon_1.DateTime.fromISO(closesAt);
            if (!date.isValid) {
                return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`The date for \`closes_at\` is invalid.`)), { ephemeral: true }));
            }
            poll.closesAt = date.toJSDate();
            embed = embed
                .setFooter({ text: "closes_at" })
                .setTimestamp(date.toMillis());
        }
        if (randomizedBallots !== undefined) {
            if (!randomizedBallots) {
                addPollFeature(poll, "disableRandomizedBallots");
                embed = embed.addField("randomized_ballots", "disabled");
            }
            else {
                removePollFeature(poll, "disableRandomizedBallots");
                embed = embed.addField("randomized_ballots", "enabled");
            }
        }
        if (anytimeResults !== undefined) {
            if (anytimeResults) {
                removePollFeature(poll, "disableAnytimeResults");
                embed = embed.addField("anytime_results", "enabled");
            }
            else {
                addPollFeature(poll, "disableAnytimeResults");
                embed = embed.addField("anytime_results", "disabled");
            }
        }
        if (preferential !== undefined) {
            if (preferential) {
                removePollFeature(poll, "disablePreferences");
                embed = embed.addField("preferential", "enabled");
            }
            else {
                addPollFeature(poll, "disablePreferences");
                embed = embed.addField("preferential", "disabled");
            }
        }
        if (rankedPairs !== undefined) {
            if (rankedPairs) {
                addPollFeature(poll, "RANKED_PAIRS");
                embed = embed.addField("ranked_pairs", "enabled");
            }
            else {
                removePollFeature(poll, "RANKED_PAIRS");
                embed = embed.addField("ranked_pairs", "disabled");
            }
        }
        if (forceAllPreferences !== undefined) {
            if (forceAllPreferences) {
                addPollFeature(poll, "FORCE_ALL_PREFERENCES");
                embed = embed.addField("force_all_preferences", "enabled");
            }
            else {
                removePollFeature(poll, "FORCE_ALL_PREFERENCES");
                embed = embed.addField("force_all_preferences", "disabled");
            }
        }
        if (pacps !== undefined) {
            if (pacps) {
                addPollFeature(poll, "PACPS");
                embed = embed.addField("pacps", "enabled");
            }
            else {
                removePollFeature(poll, "PACPS");
                embed = embed.addField("pacps", "disabled");
            }
        }
        if (majorityClose !== undefined) {
            if (majorityClose) {
                addPollFeature(poll, "CLOSE_ON_MAJORITY");
                embed = embed.addField("close_on_majority", "enabled");
            }
            else {
                removePollFeature(poll, "CLOSE_ON_MAJORITY");
                embed = embed.addField("close_on_majority", "disabled");
            }
        }
        yield storage_1.default.updatePoll(poll.id, poll);
        yield ctx.editReply({
            embeds: [embed],
            ephemeral: true,
        });
        try {
            const metrics = yield storage_1.default.getPollMetrics(poll.id);
            yield updatePollMessage(ctx, poll, (channel) => __awaiter(this, void 0, void 0, function* () {
                return ({
                    embeds: [yield createPollEmbed(ctx, poll, metrics, channel)],
                });
            }));
        }
        catch (e) {
            if (e instanceof discord_js_1.DiscordAPIError && e.code === 50001) {
                yield ctx.followUp({
                    embeds: [
                        new discord_js_1.MessageEmbed({
                            color: "RED",
                            description: "I couldn't update the poll message with your changes. Please make sure that I'm invited to the poll channel and my permissions are correct.",
                        }),
                    ],
                });
            }
        }
    });
}
exports.updatePoll = updatePoll;
function addPollFeature(poll, featureOrName) {
    let feature = models_1.PollFeature.UNKNOWN;
    if (typeof featureOrName === "string") {
        feature = models_1.POLL_FEATURES_MAPPER[featureOrName];
    }
    else {
        feature = featureOrName;
    }
    if (!poll.features) {
        poll.features = [feature];
    }
    else {
        if (poll.features.indexOf(feature) === -1) {
            poll.features.push(feature);
        }
    }
}
function removePollFeature(poll, featureOrName) {
    let feature = models_1.PollFeature.UNKNOWN;
    if (typeof featureOrName === "string") {
        feature = models_1.POLL_FEATURES_MAPPER[featureOrName];
    }
    else {
        feature = featureOrName;
    }
    if (poll.features) {
        const i = poll.features.indexOf(feature);
        if (i !== -1) {
            poll.features.splice(i, 1);
        }
    }
}
function getPollChannel(ctx, poll) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        let guild = ctx.guild;
        if (!guild) {
            const client = yield ctx.client();
            let guildId = poll.guildId;
            if (!guildId && ((_a = poll.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord") {
                guildId = poll.context.discord.guildId;
            }
            if (!guildId)
                return;
            guild = yield client.guilds.fetch(guildId);
        }
        let messageRef = poll.messageRef;
        if (((_b = poll.context) === null || _b === void 0 ? void 0 : _b.$case) === "discord") {
            messageRef = poll.context.discord.messageRef;
        }
        if (!guild || !messageRef)
            return;
        const channel = yield guild.channels.fetch(messageRef.channelId);
        return {
            channel,
            guild,
            messageRef,
        };
    });
}
function updatePollMessage(ctx, poll, optionsBuilder) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield getPollChannel(ctx, poll);
        if (!result)
            return;
        const { channel, messageRef } = result;
        if (!(channel === null || channel === void 0 ? void 0 : channel.isText()) || !messageRef) {
            settings_1.L.d("Channel is not valid");
            return;
        }
        const permissions = channel.permissionsFor(ctx.user.id);
        if ((permissions === null || permissions === void 0 ? void 0 : permissions.has("SEND_MESSAGES")) &&
            permissions.has("READ_MESSAGE_HISTORY")) {
            const message = yield channel.messages.fetch(messageRef.id);
            if (message.editable) {
                return yield message.edit(Object.assign({}, (yield optionsBuilder(Object.assign(Object.assign({}, result), { message })))));
            }
            else {
                settings_1.L.d("Message is not editable");
            }
        }
        else {
            settings_1.L.d("Cannot edit poll message");
        }
    });
}
function closePoll(_ctx, pollId) {
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = yield _ctx.defer();
        const poll = yield storage_1.default.getPoll(pollId);
        if (!poll) {
            return yield ctx.editReply(simpleSendable(`I couldn't find poll ${pollId}`));
        }
        try {
            yield ctx.checkPermissions(["botOwner", "guildAdmin", "pollbotAdmin", "pollOwner"], poll);
        }
        catch (_a) {
            return yield ctx.editReply(simpleSendable(`You don't have permission to close this poll`));
        }
        poll.closesAt = (0, moment_timezone_1.default)().toDate();
        yield storage_1.default.updatePoll(poll.id, poll);
        const metrics = yield storage_1.default.getPollMetrics(poll.id);
        yield updatePollMessage(ctx, poll, (channel) => __awaiter(this, void 0, void 0, function* () {
            return ({
                embeds: [yield createPollEmbed(ctx, poll, metrics, channel)],
            });
        }));
        try {
            const ballots = yield storage_1.default.listBallots(poll.id);
            const results = (0, voting_1.computeResults)(poll, ballots);
            if (!results) {
                return yield ctx.editReply(simpleSendable(`${exports.POLL_ID_PREFIX}${poll.id} is now closed. There are no results...`));
            }
            const election = poll.features.includes(models_1.PollFeature.ELECTION_POLL);
            if (election) {
                const [summary, tied] = (0, voting_1.resultsSummary)(poll, results);
                summary.setTitle("The election is now closed.");
                const message = yield ctx.editReply({
                    embeds: [summary],
                });
                if (tied) {
                    const options = Object.values(poll.options).sort();
                    const finalRankings = (0, columnify_1.default)(ballots
                        .sort(() => 0.5 - Math.random())
                        .map((b) => {
                        const votes = {};
                        const votedOptions = Object.values(poll.options);
                        Object.values(b.votes).forEach((v) => {
                            votes[v.option] = v.rank;
                            votedOptions.splice(votedOptions.indexOf(v.option), 1);
                        });
                        votes[votedOptions[0]] = options.length;
                        return votes;
                    }), {
                        columns: options,
                        align: "right",
                        columnSplitter: " | ",
                    });
                    yield message.reply({
                        embeds: [
                            new discord_js_1.MessageEmbed({
                                description: `Here's all ballot data for the election, where '1' is 1st preference, '2' is 2nd preference, '3' is 3rd, etc. You can manually see who won. \`\`\`${finalRankings}\`\`\``,
                            }),
                        ],
                    });
                }
                return message;
            }
            else {
                const summary = (0, voting_1.resultsSummary)(poll, results)[0];
                summary.setTitle(`${exports.POLL_ID_PREFIX}${poll.id} is now closed.`);
                return yield ctx.editReply({
                    embeds: [summary],
                });
            }
        }
        catch (e) {
            settings_1.L.d(e);
            return yield ctx.editReply(`There was an issue computing results for poll ${poll.id}`);
        }
    });
}
exports.closePoll = closePoll;
function pollResults(_ctx, pollId, ephemeral) {
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = yield _ctx.defer({ ephemeral });
        const poll = yield storage_1.default.getPoll(pollId);
        if (!poll) {
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`Poll ${pollId} not found.`)), { ephemeral: true }));
        }
        try {
            yield ctx.checkPermissions(["botOwner", "pollOwner", "pollGuild", "guildAdmin"], poll);
        }
        catch (_a) {
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`You can't view results for poll ${pollId} in this channel.`)), { ephemeral: true }));
        }
        if (poll.features &&
            poll.features.indexOf(models_1.PollFeature.DISABLE_ANYTIME_RESULTS) !== -1) {
            if (poll.closesAt && poll.closesAt > (0, moment_timezone_1.default)().toDate()) {
                return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`${exports.POLL_ID_PREFIX}${pollId} has disabled anytime results and is not closed`)), { ephemeral: true }));
            }
        }
        const ballots = yield storage_1.default.listBallots(poll.id);
        const results = (0, voting_1.computeResults)(poll, ballots);
        if (!results) {
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable("There are no results yet")), { ephemeral }));
        }
        const summary = (0, voting_1.resultsSummary)(poll, results)[0];
        return yield ctx.editReply({
            embeds: [summary],
            ephemeral,
        });
    });
}
exports.pollResults = pollResults;
const POLL_EXPR = new RegExp(`^>?\\s?${exports.POLL_ID_PREFIX}(.+)`);
function extractPollId(text) {
    const m = text === null || text === void 0 ? void 0 : text.match(POLL_EXPR);
    if (!m || m.length < 2)
        return;
    return m[1];
}
function findPollId(message) {
    var _a, _b, _c;
    let pollId = extractPollId((_a = message.content) !== null && _a !== void 0 ? _a : "");
    if (pollId)
        return pollId;
    pollId = extractPollId((_c = (_b = message.embeds[0]) === null || _b === void 0 ? void 0 : _b.title) !== null && _c !== void 0 ? _c : undefined);
    return pollId;
}
function getNickname(ctx) {
    var _a, _b, _c;
    if (ctx.interaction == null)
        return;
    if (!("member" in ctx.interaction))
        return;
    return ((_c = (ctx.interaction.member instanceof discord_js_1.GuildMember
        ? (_a = ctx.interaction.member) === null || _a === void 0 ? void 0 : _a.nickname
        : (_b = ctx.interaction.member) === null || _b === void 0 ? void 0 : _b.nick)) !== null && _c !== void 0 ? _c : undefined);
}
function createBallotFromButton(ctx) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        const user = ctx.interaction.user;
        const message = yield ctx.resolveMessage(ctx.interaction.message);
        const pollId = findPollId(message);
        if (!pollId) {
            settings_1.L.d(`Couldn't find poll for new ballot: ${(_a = message.content) === null || _a === void 0 ? void 0 : _a.substring(0, exports.POLL_ID_PREFIX.length)}`);
            return yield user.send(simpleSendable("There was an issue creating your ballot", "Couldn't parse pollId"));
        }
        const poll = yield storage_1.default.getPoll(pollId);
        if (!poll)
            return yield user.send(simpleSendable("There was an issue creating your ballot", "Couldn't find the poll"));
        if (poll.closesAt && poll.closesAt < (0, moment_timezone_1.default)().toDate()) {
            return yield user.send(simpleSendable(`Poll ${poll.id} is closed.`));
        }
        let ballot = yield storage_1.default.findBallot(poll.id, user.id);
        if (!ballot) {
            if (poll.features.includes(models_1.PollFeature.ELECTION_POLL))
                return yield user.send(simpleSendable("You were not sent a ballot. Please check with other members of your party to see if they were sent the ballot."));
            const nickname = getNickname(ctx);
            if (nickname)
                ballot = yield storage_1.default.createBallot(poll, {
                    pollId: poll.id,
                    context: {
                        $case: "discord",
                        discord: {
                            userId: user.id,
                            userName: nickname,
                        },
                    },
                });
        }
        else {
            for (const o in ballot.votes) {
                ballot.votes[o].rank = undefined;
            }
            yield storage_1.default.updateBallot(ballot.id, ballot);
        }
        if (!ballot) {
            return yield user.send(simpleSendable("There was an issue creating your ballot."));
        }
        if (ballot.context === undefined) {
            const nickname = getNickname(ctx);
            if (nickname)
                ballot.context = {
                    $case: "discord",
                    discord: {
                        userId: user.id,
                        userName: nickname,
                    },
                };
            yield storage_1.default.updateBallot(ballot.id, ballot);
        }
        let optionText = "";
        const disableRandomizedBallots = (_c = (_b = poll.features) === null || _b === void 0 ? void 0 : _b.includes(models_1.PollFeature.DISABLE_RANDOMIZED_BALLOTS)) !== null && _c !== void 0 ? _c : false;
        const ballotOptionMapping = ballot.ballotOptionMapping;
        const disablePreferences = (_e = (_d = poll.features) === null || _d === void 0 ? void 0 : _d.includes(models_1.PollFeature.DISABLE_PREFERENCES)) !== null && _e !== void 0 ? _e : false;
        if (ballotOptionMapping && !disableRandomizedBallots) {
            optionText = Object.keys(ballotOptionMapping)
                .sort()
                .map((ballotKey) => {
                var _a;
                const pollOptionKey = (_a = ballotOptionMapping[ballotKey]) !== null && _a !== void 0 ? _a : "";
                const pollOption = poll.options[pollOptionKey];
                return `${ballotKey}| ${pollOption}`;
            })
                .join("\n");
        }
        else {
            optionText = Object.keys(poll.options)
                .sort()
                .map((key) => `${key}| ${poll.options[key]}`)
                .join("\n");
        }
        const responseEmbed = new discord_js_1.MessageEmbed({
            title: `${exports.POLL_ID_PREFIX}${poll.id}`,
            description: `Here's your ballot.`,
        })
            .setURL(message.url)
            .addField("Instructions", `To vote, ${disablePreferences
            ? "state your preferred option e.g. `a`"
            : "order the options from best to worst in a comma-separated list e.g. `c,b,a,d`"}\n` + `_Invalid options will be ignored_\n`)
            .addField(poll.topic, `\`\`\`\n${optionText}\n\`\`\``)
            .setFooter({
            text: `Privacy notice: Your user id and current user name is linked to your ballot. Your ballot is viewable by you and bot admins.\n\nballot#${ballot.id}`,
        });
        const dm = yield user.send({
            embeds: [responseEmbed],
        });
        yield ctx.interaction.reply({
            embeds: [
                new discord_js_1.MessageEmbed({
                    title: "Here's your new ballot",
                    url: dm.url,
                }),
            ],
            ephemeral: true,
        });
        const metrics = yield storage_1.default.getPollMetrics(poll.id);
        yield updatePollMessage(ctx, poll, (result) => __awaiter(this, void 0, void 0, function* () {
            return ({
                embeds: [yield createPollEmbed(ctx, poll, metrics, result)],
            });
        }));
    });
}
exports.createBallotFromButton = createBallotFromButton;
function createBallot(ctx, message, user, fromReaction = true) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        if (user == null)
            return;
        const pollId = findPollId(message);
        if (!pollId) {
            settings_1.L.d(`Couldn't find poll for new ballot: ${(_a = message.content) === null || _a === void 0 ? void 0 : _a.substring(0, exports.POLL_ID_PREFIX.length)}`);
            return yield user.send(simpleSendable("There was an issue creating your ballot", "Couldn't parse pollId"));
        }
        const poll = yield storage_1.default.getPoll(pollId);
        if (!poll)
            return yield user.send(simpleSendable("There was an issue creating your ballot", "Couldn't find the poll"));
        if (poll.features.includes(models_1.PollFeature.ELECTION_POLL) && fromReaction)
            return;
        if (poll.closesAt && poll.closesAt < (0, moment_timezone_1.default)().toDate()) {
            return yield user.send(simpleSendable(`Poll ${poll.id} is closed.`));
        }
        let ballot = yield storage_1.default.findBallot(poll.id, user.id);
        if (!ballot) {
            ballot = yield storage_1.default.createBallot(poll, {
                pollId: poll.id,
                context: {
                    $case: "discord",
                    discord: {
                        userId: user.id,
                        userName: (_b = getNickname(ctx)) !== null && _b !== void 0 ? _b : "",
                    },
                },
            });
        }
        else {
            for (const o in ballot.votes) {
                ballot.votes[o].rank = undefined;
            }
            yield storage_1.default.updateBallot(ballot.id, ballot);
        }
        if (!ballot) {
            return yield user.send(simpleSendable("There was an issue creating your ballot."));
        }
        const nickname = getNickname(ctx);
        if (ballot.context === undefined && nickname != null) {
            ballot.context = {
                $case: "discord",
                discord: {
                    userId: user.id,
                    userName: nickname,
                },
            };
            yield storage_1.default.updateBallot(ballot.id, ballot);
        }
        let optionText = "";
        const disableRandomizedBallots = (_d = (_c = poll.features) === null || _c === void 0 ? void 0 : _c.includes(models_1.PollFeature.DISABLE_RANDOMIZED_BALLOTS)) !== null && _d !== void 0 ? _d : false;
        const ballotOptionMapping = ballot.ballotOptionMapping;
        const disablePreferences = (_f = (_e = poll.features) === null || _e === void 0 ? void 0 : _e.includes(models_1.PollFeature.DISABLE_PREFERENCES)) !== null && _f !== void 0 ? _f : false;
        if (ballotOptionMapping && !disableRandomizedBallots) {
            optionText = Object.keys(ballotOptionMapping)
                .sort()
                .map((ballotKey) => {
                var _a;
                const pollOptionKey = (_a = ballotOptionMapping[ballotKey]) !== null && _a !== void 0 ? _a : "";
                const pollOption = poll.options[pollOptionKey];
                return `${ballotKey}| ${pollOption}`;
            })
                .join("\n");
        }
        else {
            optionText = Object.keys(poll.options)
                .sort()
                .map((key) => `${key}| ${poll.options[key]}`)
                .join("\n");
        }
        const responseEmbed = new discord_js_1.MessageEmbed({
            title: `${exports.POLL_ID_PREFIX}${poll.id}`,
            description: `Here's your ballot.`,
        })
            .setURL(message.url)
            .addField("Instructions", `To vote, ${disablePreferences
            ? "state your preferred option e.g. `a`"
            : "order the options from best to worst in a comma-separated list e.g. `c,b,a,d`"}\n` + `_Invalid options will be ignored_\n`)
            .addField(poll.topic, `\`\`\`\n${optionText}\n\`\`\``)
            .setFooter({
            text: `Privacy notice: Your user id and current user name is linked to your ballot. Your ballot is viewable by you and bot admins.\n\nballot#${ballot.id}`,
        });
        yield user.send({
            embeds: [responseEmbed],
        });
        const metrics = yield storage_1.default.getPollMetrics(poll.id);
        yield updatePollMessage(ctx, poll, (channel) => __awaiter(this, void 0, void 0, function* () {
            return ({
                embeds: [yield createPollEmbed(ctx, poll, metrics, channel)],
            });
        }));
    });
}
exports.createBallot = createBallot;
function submitBallot(ctx, message) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const limit = 50;
        const history = yield message.channel.messages.fetch({ limit });
        const lastBallotText = history.find((m) => findPollId(m) !== undefined);
        if (!lastBallotText) {
            return yield message.channel.send(simpleSendable(`Could not find a pollId in the last ${limit} messages`));
        }
        const messageContent = message.content.toLowerCase();
        if (messageContent.startsWith(exports.POLLBOT_PREFIX)) {
            return yield message.channel.send(simpleSendable("DMs are for submitting ballots. Manage polls in public channels."));
        }
        const pollId = findPollId(lastBallotText);
        if (!pollId) {
            return yield message.channel.send(simpleSendable(`Could not find a pollId in the last ${limit} messages`));
        }
        const poll = yield storage_1.default.getPoll(pollId);
        if (!poll) {
            return yield message.channel.send(simpleSendable(`Could not find a poll with id ${pollId}`));
        }
        if (poll.closesAt && poll.closesAt < (0, moment_timezone_1.default)().toDate()) {
            return yield message.channel.send(simpleSendable(`Poll ${poll.id} is closed.`));
        }
        const ballot = yield storage_1.default.findBallot(pollId, message.author.id);
        if (!ballot) {
            return yield message.channel.send(simpleSendable(`I couldn't find a ballot for you on poll ${pollId}`));
        }
        const validOptionKeys = Object.keys(poll.options).sort();
        const voteKeys = messageContent
            .trim()
            .split(",")
            .map((key) => key.trim());
        let validVoteKeys = voteKeys.filter((key) => validOptionKeys.find((ok) => ok === key));
        let votes = {};
        const disableRandomizedBallot = (_b = (_a = poll.features) === null || _a === void 0 ? void 0 : _a.includes(models_1.PollFeature.DISABLE_RANDOMIZED_BALLOTS)) !== null && _b !== void 0 ? _b : false;
        const disablePreferences = (_d = (_c = poll.features) === null || _c === void 0 ? void 0 : _c.includes(models_1.PollFeature.DISABLE_PREFERENCES)) !== null && _d !== void 0 ? _d : false;
        const forceAllPreferences = (_f = (_e = poll.features) === null || _e === void 0 ? void 0 : _e.includes(models_1.PollFeature.FORCE_ALL_PREFERENCES)) !== null && _f !== void 0 ? _f : false;
        const ballotOptionMapping = ballot.ballotOptionMapping;
        if (disablePreferences)
            validVoteKeys = [validVoteKeys[0]];
        if (forceAllPreferences &&
            validVoteKeys.length < Object.keys(poll.options).length - 1)
            return yield message.channel.send(simpleSendable("You must preference all options."));
        if (ballotOptionMapping && !disableRandomizedBallot) {
            votes = validVoteKeys.reduce((acc, ballotKey, i) => {
                const pollOptionKey = ballotOptionMapping[ballotKey];
                if (pollOptionKey) {
                    acc[pollOptionKey] = {
                        option: poll.options[pollOptionKey],
                        rank: i + 1,
                    };
                }
                return acc;
            }, {});
        }
        else {
            votes = validVoteKeys.reduce((acc, pollOptionKey, i) => {
                acc[pollOptionKey] = {
                    option: poll.options[pollOptionKey],
                    rank: i + 1,
                };
                return acc;
            }, {});
        }
        const updatedBallot = yield storage_1.default.updateBallot(ballot.id, Object.assign(Object.assign({}, ballot), { updatedAt: (0, moment_timezone_1.default)().toDate(), votes }));
        if (!updatedBallot) {
            return yield message.channel.send(simpleSendable("There was a problem recording your ballot."));
        }
        let summaryLines = [];
        if (ballotOptionMapping && !disableRandomizedBallot) {
            summaryLines = validOptionKeys.map((key) => ` ${votes[key] ? votes[key].rank : "_"}    | ${(0, record_1.reverseLookup)(ballotOptionMapping, key)}   | ${poll.options[key]}`);
        }
        else {
            summaryLines = validOptionKeys.map((key) => ` ${votes[key] ? votes[key].rank : "_"}    | ${key}   | ${poll.options[key]}`);
        }
        summaryLines.sort();
        if (disablePreferences)
            summaryLines = [summaryLines[0].replace(/.+ {4}\|/, "")];
        const responseEmbed = new discord_js_1.MessageEmbed({
            description: `I've recorded your ballot.`,
        })
            .addField("Vote summary", `\`\`\`` +
            (disablePreferences ? " key | option\n" : " rank | key | option\n") +
            "====================\n" +
            summaryLines.join("\n") +
            `\`\`\``)
            .setFooter({ text: `${exports.POLL_ID_PREFIX}${poll.id}\nballot#${ballot.id}` })
            .setTimestamp();
        yield message.channel.send({
            embeds: [responseEmbed],
        });
        const metrics = yield storage_1.default.getPollMetrics(poll.id);
        yield updatePollMessage(ctx, poll, (channel) => __awaiter(this, void 0, void 0, function* () {
            return ({
                embeds: [yield createPollEmbed(ctx, poll, metrics, channel)],
            });
        }));
    });
}
exports.submitBallot = submitBallot;
function shortCommandHelp(command) {
    return `\`/${command.name}\` - ${command.description}`;
}
function optionHelp(option) {
    return `\`${option.name}\` - ${option.description}`;
}
function commandHelp(command) {
    const embed = new discord_js_1.MessageEmbed({
        title: `Help: \`/${command.name}\``,
        description: command.description,
    });
    const options = command.options.map((o) => o.toJSON());
    const requiredOptions = options.filter((o) => o.required === true);
    const optionalOptions = options.filter((o) => o.required !== true);
    if (requiredOptions.length > 0) {
        embed.addField("Required Options", requiredOptions.map((o) => optionHelp(o)).join("\n"));
    }
    if (optionalOptions.length > 0) {
        embed.addField("Options", optionalOptions.map((o) => optionHelp(o)).join("\n"));
    }
    return embed;
}
exports.commandHelp = commandHelp;
function helpEmbed() {
    return new discord_js_1.MessageEmbed({
        title: "Help",
    })
        .addField("General Commands", shortCommandHelp(slashCommands_1.helpCommand))
        .addField("Poll Commands", `${shortCommandHelp(slashCommands_1.pollCreateCommand)}\n` +
        `${shortCommandHelp(slashCommands_1.pollElectionCommand)}\n` +
        `${shortCommandHelp(slashCommands_1.pollResultsCommand)}\n\n` +
        `_These are privileged commands for poll owners, admins, pollbot admins, and bot owners_\n` +
        `${shortCommandHelp(slashCommands_1.pollCloseCommand)}\n` +
        `${shortCommandHelp(slashCommands_1.pollUpdateCommand)}\n` +
        `${shortCommandHelp(slashCommands_1.pollAuditCommand)}\n`)
        .addField("Destructive Commands", shortCommandHelp(slashCommands_1.deleteMyUserDataCommand))
        .addField("More questions?", "Read the FAQ (https://github.com/qntnt/pollbot/wiki/FAQ)");
}
exports.helpEmbed = helpEmbed;
function help(ctx, message) {
    return __awaiter(this, void 0, void 0, function* () {
        message.channel.send({
            embeds: [helpEmbed()],
        });
    });
}
exports.help = help;
function toCSVRow(columns, record) {
    return columns.map((col) => record[col]).join(",");
}
function toCSVRows(columns, records) {
    return records.map((rec) => toCSVRow(columns, rec)).join("\n");
}
function toCSV(columns, records) {
    const header = columns.join(",");
    return [header, toCSVRows(columns, records)].join("\n");
}
exports.toCSV = toCSV;
function isGuildMember(user) {
    if (user) {
        return user.guild !== undefined;
    }
    return false;
}
exports.isGuildMember = isGuildMember;
function belongsToGuild(ctx, poll, bypassForBotOwner = true) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const isOwner = yield ctx.checkPermissions(["botOwner"], poll);
            if (bypassForBotOwner && isOwner)
                return true;
        }
        catch (e) {
            if (((_a = poll.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord") {
                return poll.context.discord.guildId === ((_b = ctx.guild) === null || _b === void 0 ? void 0 : _b.id);
            }
            return poll.guildId === ((_c = ctx.guild) === null || _c === void 0 ? void 0 : _c.id);
        }
    });
}
function auditPoll(_ctx, pollId) {
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = yield _ctx.defer({ ephemeral: true });
        const poll = yield storage_1.default.getPoll(pollId);
        settings_1.L.d("Poll", poll);
        if (poll === undefined) {
            settings_1.L.d("Couldn\t find poll", poll);
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`Poll ${pollId} not found.`)), { ephemeral: true }));
        }
        settings_1.L.d("Check guild", poll);
        const inGuild = yield belongsToGuild(ctx, poll, true);
        if (!inGuild) {
            settings_1.L.d("Poll doesn't belong to this guild", poll);
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`Poll ${pollId} does not belong to this server.`)), { ephemeral: true }));
        }
        try {
            yield ctx.checkPermissions(["botOwner", "guildAdmin", "pollbotAdmin", "pollOwner"], poll);
        }
        catch (e) {
            settings_1.L.d(e);
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`You are not allowed to audit this poll.`, `Only admins, pollbot admins, poll owners, and bot owners may audit poll results and export ballot data.`)), { ephemeral: true }));
        }
        const ballots = yield storage_1.default.listBallots(poll.id);
        const results = (0, voting_1.computeResults)(poll, ballots);
        if (!results) {
            return yield ctx.editReply(Object.assign(Object.assign({}, simpleSendable(`There was an issue computing results`)), { ephemeral: true }));
        }
        const summary = (0, voting_1.resultsSummary)(poll, results)[0];
        const matrixSummary = (0, condorcet_1.showMatrix)(results.matrix);
        yield ctx.editReply({
            embeds: [summary],
            ephemeral: true,
        });
        const matrixEmbed = new discord_js_1.MessageEmbed({
            title: "Pairwise Comparison Matrix",
            description: "To read this, each value in a row shows who wins a matchup between candidates\n" +
                "```" +
                matrixSummary +
                "```",
        });
        if (matrixEmbed.length <= 2000) {
            yield ctx.followUp({
                embeds: [matrixEmbed],
                ephemeral: true,
            });
        }
        else {
            yield ctx.followUp(Object.assign(Object.assign({}, simpleSendable("Your poll has too many options to render a pairwise comparison matrix.")), { ephemeral: true }));
        }
        const options = Object.values(poll.options).sort();
        const columns = [
            "ballotId",
            "createdAt",
            "updatedAt",
            "userId",
            "userName",
            ...options,
        ];
        const csvText = toCSV(columns, ballots.map((b) => {
            var _a;
            const votes = {};
            Object.values(b.votes).forEach((v) => {
                votes[v.option] = v.rank;
            });
            let userId = "";
            let userName = "";
            if (((_a = b.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord") {
                userId = b.context.discord.userId;
                userName = b.context.discord.userName;
            }
            return Object.assign({ ballotId: b.id, createdAt: (0, moment_timezone_1.default)(b.createdAt).toISOString(), updatedAt: (0, moment_timezone_1.default)(b.updatedAt).toISOString(), userId,
                userName }, votes);
        }));
        const csvBuffer = Buffer.from(csvText);
        const attachment = new discord_js_1.MessageAttachment(csvBuffer, `poll_${poll.id}_votes.csv`);
        yield ctx.directMessage({
            embeds: [
                new discord_js_1.MessageEmbed({
                    description: `Here's a file containing all ballot data for \`${exports.POLL_ID_PREFIX}${poll.id}\``,
                }),
            ],
            files: [attachment],
        });
        yield ctx.followUp({
            embeds: [
                new discord_js_1.MessageEmbed({
                    description: `I sent you a direct message with a \`.csv\` file that contains all ballot data for \`${exports.POLL_ID_PREFIX}${poll.id}\`.`,
                }),
            ],
            ephemeral: true,
        });
    });
}
exports.auditPoll = auditPoll;
function deleteMyUserData(_ctx, user) {
    return __awaiter(this, void 0, void 0, function* () {
        const ctx = yield _ctx.defer({ ephemeral: true });
        if (ctx.user.id !== user.id) {
            return yield ctx.editReply("The user does not match your account.");
        }
        yield ctx.editReply({
            embeds: [
                new discord_js_1.MessageEmbed({
                    color: "RED",
                    description: "Deleting your data...",
                }),
            ],
        });
        try {
            const metrics = yield storage_1.default.deleteUserData(ctx.user.id);
            yield ctx.interaction.editReply({
                embeds: [
                    new discord_js_1.MessageEmbed({
                        color: "RED",
                        description: `${metrics.numPolls} polls and ${metrics.numBallots} ballots were deleted.`,
                    }),
                ],
            });
        }
        catch (e) {
            yield ctx.interaction.editReply({
                embeds: [
                    new discord_js_1.MessageEmbed({
                        color: "RED",
                        description: "There was an issue while deleting your data. Please contact Pollbot support.",
                    }),
                ],
            });
        }
    });
}
exports.deleteMyUserData = deleteMyUserData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBbUJvQjtBQUNwQixzRUFBcUM7QUFDckMscUNBU2tCO0FBQ2xCLHdEQUFnQztBQUNoQyxxQ0FBMEQ7QUFDMUQsa0RBQWdEO0FBQ2hELHlDQUF1QztBQUN2QywwQ0FBOEM7QUFDOUMsaUNBQWlDO0FBQ2pDLDBEQUFrQztBQVFsQyxtREFTeUI7QUFHWixRQUFBLGNBQWMsR0FBRyxpQkFBTSxDQUFDO0FBQ3hCLFFBQUEsbUJBQW1CLEdBQUcsR0FBRyxzQkFBYyxPQUFPLENBQUM7QUFDL0MsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLHNCQUFjLFFBQVEsQ0FBQztBQUMvQyxRQUFBLG9CQUFvQixHQUFHLEdBQUcsc0JBQWMsVUFBVSxDQUFDO0FBQ25ELFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxzQkFBYyxRQUFRLENBQUM7QUFDL0MsUUFBQSx5QkFBeUIsR0FBRyxHQUFHLHNCQUFjLGNBQWMsQ0FBQztBQUM1RCxRQUFBLDRCQUE0QixHQUFHLEdBQUcsc0JBQWMsaUJBQWlCLENBQUM7QUFDbEUsUUFBQSwyQkFBMkIsR0FBRyxHQUFHLHNCQUFjLE1BQU0sQ0FBQztBQUN0RCxRQUFBLDJCQUEyQixHQUFHLEdBQUcsc0JBQWMsbUJBQW1CLENBQUM7QUFFbkUsUUFBQSxjQUFjLEdBQUcsT0FBTyxDQUFDO0FBRXRDLFNBQWdCLE1BQU0sQ0FDcEIsUUFBd0M7SUFFeEMsT0FBTyxRQUFRLEtBQUssU0FBUyxJQUFLLFFBQWlCLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQztBQUN2RSxDQUFDO0FBSkQsd0JBSUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFhLEVBQUUsV0FBb0I7SUFDdEQsT0FBTyxJQUFJLHlCQUFZLENBQUM7UUFDdEIsS0FBSztRQUNMLFdBQVc7S0FDWixDQUFDLENBQUM7QUFDTCxD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