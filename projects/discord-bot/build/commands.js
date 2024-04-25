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
        if (election) {
            features.push(models_1.PollFeature.ELECTION_POLL);
            if (pacps)
                features.push(models_1.PollFeature.PACPS);
        }
        if (!preferential || optionsList.length == 2) {
            features.push(models_1.PollFeature.DISABLE_PREFERENCES);
            if (majorityClose)
                features.push(models_1.PollFeature.CLOSE_ON_MAJORITY);
        }
        else {
            if (forceAllPreferences)
                features.push(models_1.PollFeature.FORCE_ALL_PREFERENCES);
            if (rankedPairs)
                features.push(models_1.PollFeature.RANKED_PAIRS);
        }
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
            poll.closesAt = (0, moment_timezone_1.default)().add(2, "days").toDate();
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
    var _a, _b;
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
                        if (!member[1].user.bot)
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
        if ((metrics || election) && (message === null || message === void 0 ? void 0 : message.editable))
            footerText += `\nBallots: ${metrics ? metrics.ballotsSubmitted : 0} submitted / ${metrics ? metrics.ballotsRequested : 0} ${election ? "sent" : "requested"}`;
        settings_1.L.d(footerText);
        return new discord_js_1.MessageEmbed({
            title: `${exports.POLL_ID_PREFIX}${poll.id}`,
            description: election
                ? poll.features.includes(models_1.PollFeature.PACPS)
                    ? "Someone in each party has been DM-ed a ballot, as have all non-candidates."
                    : "All voters have been DM-ed a ballot"
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
function getNickname(message) {
    var _a, _b;
    return ((_b = (message.member
        ? message.member.nickname
            ? message.member.nickname
            : message.member.user.username
        : (_a = message.author) === null || _a === void 0 ? void 0 : _a.username)) !== null && _b !== void 0 ? _b : undefined);
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
            const nickname = getNickname(message);
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
            const nickname = getNickname(message);
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
                        userName: (_b = getNickname(message)) !== null && _b !== void 0 ? _b : "",
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
        const nickname = getNickname(message);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBb0JvQjtBQUNwQixzRUFBcUM7QUFDckMscUNBU2tCO0FBQ2xCLHdEQUFnQztBQUNoQyxxQ0FBMEQ7QUFDMUQsa0RBQWdEO0FBQ2hELHlDQUF1QztBQUN2QywwQ0FBOEM7QUFDOUMsaUNBQWlDO0FBQ2pDLDBEQUFrQztBQVFsQyxtREFTeUI7QUFHWixRQUFBLGNBQWMsR0FBRyxpQkFBTSxDQUFDO0FBQ3hCLFFBQUEsbUJBQW1CLEdBQUcsR0FBRyxzQkFBYyxPQUFPLENBQUM7QUFDL0MsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLHNCQUFjLFFBQVEsQ0FBQztBQUMvQyxRQUFBLG9CQUFvQixHQUFHLEdBQUcsc0JBQWMsVUFBVSxDQUFDO0FBQ25ELFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxzQkFBYyxRQUFRLENBQUM7QUFDL0MsUUFBQSx5QkFBeUIsR0FBRyxHQUFHLHNCQUFjLGNBQWMsQ0FBQztBQUM1RCxRQUFBLDRCQUE0QixHQUFHLEdBQUcsc0JBQWMsaUJBQWlCLENBQUM7QUFDbEUsUUFBQSwyQkFBMkIsR0FBRyxHQUFHLHNCQUFjLE1BQU0sQ0FBQztBQUN0RCxRQUFBLDJCQUEyQixHQUFHLEdBQUcsc0JBQWMsbUJBQW1CLENBQUM7QUFFbkUsUUFBQSxjQUFjLEdBQUcsT0FBTyxDQUFDO0FBRXRDLFNBQWdCLE1BQU0sQ0FDcEIsUUFBd0M7SUFFeEMsT0FBTyxRQUFRLEtBQUssU0FBUyxJQUFLLFFBQWlCLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQztBQUN2RSxDQUFDO0FBSkQsd0JBSUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFhLEVBQUUsV0FBb0I7SUFDdEQsT0FBTyxJQUFJLHlCQUFZLENBQUM7UUFDdEIsS0FBSztRQUNMLFdBQVc7S0FDWixDQUFDLENBQUM7QUFDTCxD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