"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainResults = exports.resultsSummary = exports.computeResults = void 0;
const columnify_1 = __importDefault(require("columnify"));
const discord_js_1 = require("discord.js");
const commands_1 = require("../commands");
const models_1 = require("../models");
const settings_1 = require("../settings");
const condorcet_1 = require("./condorcet");
const interfaces_1 = require("./interfaces");
const instantRunoff_1 = require("./instantRunoff");
const firstPastThePost_1 = require("./firstPastThePost");
function computeResults(poll, ballots) {
    var _a;
    const optionKeys = Object.keys((_a = poll === null || poll === void 0 ? void 0 : poll.options) !== null && _a !== void 0 ? _a : {}).sort();
    for (let i = 0; i < ballots.length; i++)
        if (Object.values(ballots[i].votes).every((option) => option.rank == null))
            ballots.splice(i, 1);
    if (poll.features.includes(models_1.PollFeature.DISABLE_PREFERENCES)) {
        const votes = ballots.map((b) => {
            return Object.keys(b.votes)[0];
        });
        return (0, firstPastThePost_1.firstPastThePost)(votes);
    }
    else if (poll.features.includes(models_1.PollFeature.RANKED_PAIRS)) {
        const votes = ballots.map((b) => {
            const v = {};
            optionKeys.forEach((k) => {
                var _a, _b;
                v[k] = optionKeys.length - ((_b = (_a = b.votes[k]) === null || _a === void 0 ? void 0 : _a.rank) !== null && _b !== void 0 ? _b : optionKeys.length);
            });
            return v;
        });
        return (0, condorcet_1.rankedPairs)(optionKeys, votes);
    }
    else {
        const votes = ballots.map((b) => {
            const v = {};
            optionKeys.forEach((k) => {
                var _a, _b;
                v[k] = optionKeys.length - ((_b = (_a = b.votes[k]) === null || _a === void 0 ? void 0 : _a.rank) !== null && _b !== void 0 ? _b : optionKeys.length);
            });
            const k = Object.keys(v);
            k.sort((a, b) => (v[a] < v[b] ? 1 : v[a] > v[b] ? -1 : 0));
            return new interfaces_1.UserVotes(k);
        });
        return (0, instantRunoff_1.instantRunoff)(optionKeys, votes);
    }
}
exports.computeResults = computeResults;
function displayRankingType(rankingType) {
    switch (rankingType) {
        case "rankedPairs":
            return "**Ranked Pairs - Tideman** (<https://en.wikipedia.org/wiki/Ranked_pairs>)";
        case "instantRunoff":
            return "**Instant-Runoff** (<https://en.wikipedia.org/Instant-runoff_voting>)";
        case "firstPastThePost":
            return "**First-Past-the-Post** (<https://en.wikipedia.org/wiki/First-past-the-post_voting>)";
    }
}
function resultsSummary(poll, results) {
    var _a, _b, _c;
    const footer = `Ranking Type: ${displayRankingType(results.rankingType)}\n`;
    const columns = settings_1.DEBUG || results.rankingType == "firstPastThePost"
        ? ["rank", "option", "score"]
        : ["rank", "option"];
    let rank = 1;
    const rankingLines = results.finalRankings.map(([key, score], i) => ({
        option: poll.options[key],
        rank: i == results.finalRankings.length - 1 ||
            results.finalRankings[i + 1][1] == score
            ? rank
            : rank++,
        score,
    }));
    if (results.rankingType === "firstPastThePost")
        rankingLines.reverse();
    const finalRankings = (0, columnify_1.default)(rankingLines, {
        columns,
        align: "right",
        columnSplitter: " | ",
    });
    const metrics = `Ballot count: ${results.metrics.voteCount}\n` +
        `Time to compute: ${results.metrics.computeDuration.toFormat("S")}ms\n`;
    const finalRankingsSort = [...results.finalRankings];
    finalRankingsSort.sort((a, b) => {
        if (a[1] < b[1])
            return -1;
        if (a[1] > b[1])
            return 1;
        return 0;
    });
    const highestRanking = finalRankingsSort[0][1];
    const winners = finalRankingsSort.filter((option) => option[1] === highestRanking);
    const tied = winners.length != 1;
    const description = poll.features.includes(models_1.PollFeature.ELECTION_POLL)
        ? tied
            ? winners
                .map((winner) => {
                var _a, _b, _c;
                return (_c = "<@&" +
                    ((_b = (_a = poll.roleCache) === null || _a === void 0 ? void 0 : _a.find((role) => role.name === poll.options[winner[0]])) === null || _b === void 0 ? void 0 : _b.id) +
                    ">") !== null && _c !== void 0 ? _c : poll.options[winner[0]];
            })
                .join(", ") + " tie!"
            : `<@&${(_c = (_b = (_a = poll.roleCache) === null || _a === void 0 ? void 0 : _a.find((role) => role.name === poll.options[results.finalRankings[0][0]])) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : poll.options[results.finalRankings[0][0]]}> wins!`
        : "```" + finalRankings + "```";
    const embed = new discord_js_1.MessageEmbed({
        title: poll.topic,
        description,
    });
    if (results.rankingType === "rankedPairs") {
        const closeCalls = [];
        for (let i = 1; i < results.finalRankings.length; i++) {
            const [prev, prevScore] = results.finalRankings[i - 1];
            const [curr, currScore] = results.finalRankings[i];
            if (prevScore <= currScore) {
                closeCalls.push([prev, curr]);
            }
        }
        if (closeCalls.length > 0) {
            const closeCallMsg = closeCalls
                .map(([p, c]) => `- \`${poll.options[p]}\` beat \`${poll.options[c]}\``)
                .join("\n");
            embed.addField("These were close calls!", closeCallMsg.substring(0, 1024));
        }
    }
    embed
        .addField("Metrics", metrics.substring(0, 1024))
        .addField("Info", footer.substring(0, 1024))
        .setFooter({ text: `${commands_1.POLL_ID_PREFIX}${poll.id}` });
    return [embed, tied];
}
exports.resultsSummary = resultsSummary;
function explainResults(poll, results) {
    const summary = resultsSummary(poll, results);
    const matrixText = (0, condorcet_1.showMatrix)(results.matrix);
    return summary + "\n```" + matrixText + "```";
}
exports.explainResults = explainResults;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdm90aW5nL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDBEQUFrQztBQUNsQywyQ0FBMEM7QUFDMUMsMENBQTZDO0FBQzdDLHNDQUFzRDtBQUN0RCwwQ0FBb0M7QUFFcEMsMkNBQXNEO0FBQ3RELDZDQUE0RTtBQUM1RSxtREFBZ0Q7QUFDaEQseURBQXNEO0FBRXRELFNBQWdCLGNBQWMsQ0FDNUIsSUFBVSxFQUNWLE9BQWlCOztJQUVqQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLE9BQU8sbUNBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFO1FBQ3JDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztZQUN4RSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV6QixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLG9CQUFXLENBQUMsbUJBQW1CLENBQUMsRUFBRTtRQUMzRCxNQUFNLEtBQUssR0FBYSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxtQ0FBZ0IsRUFB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