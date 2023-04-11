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
function createPoll(_ctx, topic, optionsString, randomizedBallots, anytimeResults, preferential, rankedPairs, election, forceAllPreferences) {
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
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const election = poll.features.includes(models_1.PollFeature.ELECTION_POLL);
        const { message } = result !== null && result !== void 0 ? result : {};
        const closesAt = (0, moment_timezone_1.default)(poll.closesAt)
            .tz("Australia/Hobart")
            .format("dddd, MMMM Do YYYY, h:mm zz");
        if (election &&
            message != null &&
            !poll.features.includes(models_1.PollFeature.SENT_ELECTION_DMS)) {
            const members = yield ((_a = ctx.guild) === null || _a === void 0 ? void 0 : _a.members.fetch());
            if (members != null) {
                const candidateRoles = Object.values(poll.options).map((o) => { var _a, _b, _c; return (_c = (_b = (_a = ctx.guild) === null || _a === void 0 ? void 0 : _a.roles.cache.find((role) => role.name === o)) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : ""; });
                const roleMap = {};
                const nonCandidateVoters = [];
                candidateRoles.forEach((roleID) => (roleMap[roleID] = []));
                members.each(function (member) {
                    if (member.user.bot)
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
function updatePoll(_ctx, pollId, topic, closesAt, randomizedBallots, anytimeResults, preferential, rankedPairs, forceAllPreferences) {
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
            ballot = yield storage_1.default.createBallot(poll, {
                pollId: poll.id,
                context: {
                    $case: "discord",
                    discord: {
                        userId: user.id,
                        userName: user.username,
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
            ballot.context = {
                $case: "discord",
                discord: {
                    userId: user.id,
                    userName: user.username,
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
                        userName: (_b = user.username) !== null && _b !== void 0 ? _b : "",
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
        if (ballot.context === undefined && user.username != null) {
            ballot.context = {
                $case: "discord",
                discord: {
                    userId: user.id,
                    userName: user.username,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBZW9CO0FBQ3BCLHNFQUFxQztBQUNyQyxxQ0FTa0I7QUFDbEIsd0RBQWdDO0FBQ2hDLHFDQUEwRDtBQUMxRCxrREFBZ0Q7QUFDaEQseUNBQXVDO0FBQ3ZDLDBDQUE4QztBQUM5QyxpQ0FBaUM7QUFDakMsMERBQWtDO0FBUWxDLG1EQVN5QjtBQUdaLFFBQUEsY0FBYyxHQUFHLGlCQUFNLENBQUM7QUFDeEIsUUFBQSxtQkFBbUIsR0FBRyxHQUFHLHNCQUFjLE9BQU8sQ0FBQztBQUMvQyxRQUFBLGtCQUFrQixHQUFHLEdBQUcsc0JBQWMsUUFBUSxDQUFDO0FBQy9DLFFBQUEsb0JBQW9CLEdBQUcsR0FBRyxzQkFBYyxVQUFVLENBQUM7QUFDbkQsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLHNCQUFjLFFBQVEsQ0FBQztBQUMvQyxRQUFBLHlCQUF5QixHQUFHLEdBQUcsc0JBQWMsY0FBYyxDQUFDO0FBQzVELFFBQUEsNEJBQTRCLEdBQUcsR0FBRyxzQkFBYyxpQkFBaUIsQ0FBQztBQUNsRSxRQUFBLDJCQUEyQixHQUFHLEdBQUcsc0JBQWMsTUFBTSxDQUFDO0FBQ3RELFFBQUEsMkJBQTJCLEdBQUcsR0FBRyxzQkFBYyxtQkFBbUIsQ0FBQztBQUVuRSxRQUFBLGNBQWMsR0FBRyxPQUFPLENBQUM7QUFFdEMsU0FBZ0IsTUFBTSxDQUNwQixRQUF3QztJQUV4QyxPQUFPLFFBQVEsS0FBSyxTQUFTLElBQUssUUFBaUIsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDO0FBQ3ZFLENBQUM7QUFKRCx3QkFJQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQWEsRUFBRSxXQUFvQjtJQUN0RCxPQUFPLElBQUkseUJBQVksQ0FBQztRQUN0QixLQUFLO1FBQ0wsV0FBVztLQUNaLENBQUMsQ0FBQztBQUNMLENB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