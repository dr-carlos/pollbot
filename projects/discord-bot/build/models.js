"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLL_FEATURES_REVERSE_MAPPER = exports.POLL_FEATURES_MAPPER = exports.MessageRef = exports.GuildData = exports.BallotConfig = exports.PollConfig = exports.Ballot = exports.Vote = exports.PollFeature = exports.Poll = void 0;
const polls_1 = require("idl/lib/polls/v1/polls");
var polls_2 = require("idl/lib/polls/v1/polls");
Object.defineProperty(exports, "Poll", { enumerable: true, get: function () { return polls_2.PollDTO; } });
Object.defineProperty(exports, "PollFeature", { enumerable: true, get: function () { return polls_2.PollFeatureDTO; } });
Object.defineProperty(exports, "Vote", { enumerable: true, get: function () { return polls_2.VoteDTO; } });
Object.defineProperty(exports, "Ballot", { enumerable: true, get: function () { return polls_2.BallotDTO; } });
Object.defineProperty(exports, "PollConfig", { enumerable: true, get: function () { return polls_2.PollRequestDTO; } });
Object.defineProperty(exports, "BallotConfig", { enumerable: true, get: function () { return polls_2.BallotRequestDTO; } });
var discord_1 = require("idl/lib/discord/v1/discord");
Object.defineProperty(exports, "GuildData", { enumerable: true, get: function () { return discord_1.GuildDataDTO; } });
Object.defineProperty(exports, "MessageRef", { enumerable: true, get: function () { return discord_1.MessageRefDTO; } });
exports.POLL_FEATURES_MAPPER = {
    disableRandomizedBallots: polls_1.PollFeatureDTO.DISABLE_RANDOMIZED_BALLOTS,
    DISABLE_RANDOMIZED_BALLOTS: polls_1.PollFeatureDTO.DISABLE_RANDOMIZED_BALLOTS,
    disableAnytimeResults: polls_1.PollFeatureDTO.DISABLE_ANYTIME_RESULTS,
    DISABLE_ANYTIME_RESULTS: polls_1.PollFeatureDTO.DISABLE_ANYTIME_RESULTS,
    disablePreferences: polls_1.PollFeatureDTO.DISABLE_PREFERENCES,
    DISABLE_PREFERENCES: polls_1.PollFeatureDTO.DISABLE_PREFERENCES,
    RANKED_PAIRS: polls_1.PollFeatureDTO.RANKED_PAIRS,
    ELECTION_POLL: polls_1.PollFeatureDTO.ELECTION_POLL,
    FORCE_ALL_PREFERENCES: polls_1.PollFeatureDTO.FORCE_ALL_PREFERENCES,
};
function keys(obj) {
    return Object.keys(obj);
}
exports.POLL_FEATURES_REVERSE_MAPPER = Object.assign({}, keys(exports.POLL_FEATURES_MAPPER)
    .map((k) => ({ k, v: exports.POLL_FEATURES_MAPPER[k] }))
    .reduce((prev, current) => {
    prev[current.v] = current.k;
    return prev;
}, {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxrREFBd0Q7QUFHeEQsZ0RBUWdDO0FBUDlCLDZGQUFBLE9BQU8sT0FBUTtBQUNmLG9HQUFBLGNBQWMsT0FBZTtBQUM3Qiw2RkFBQSxPQUFPLE9BQVE7QUFDZiwrRkFBQSxTQUFTLE9BQVU7QUFDbkIsbUdBQUEsY0FBYyxPQUFjO0FBQzVCLHFHQUFBLGdCQUFnQixPQUFnQjtBQUdsQyxzREFHb0M7QUFGbEMsb0dBQUEsWUFBWSxPQUFhO0FBQ3pCLHFHQUFBLGFBQWEsT0FBYztBQVdoQixRQUFBLG9CQUFvQixHQUFHO0lBQ2xDLHdCQUF3QixFQUFFLHNCQUFjLENBQUMsMEJBQTBCO0lBQ25FLDBCQUEwQixFQUFFLHNCQUFjLENBQUMsMEJBQTBCO0lBQ3JFLHFCQUFxQixFQUFFLHNCQUFjLENBQUMsdUJBQXVCO0lBQzdELHVCQUF1QixFQUFFLHNCQUFjLENBQUMsdUJBQXVCO0lBQy9ELGtCQUFrQixFQUFFLHNCQUFjLENBQUMsbUJBQW1CO0lBQ3RELG1CQUFtQixFQUFFLHNCQUFjLENBQUMsbUJBQW1CO0lBQ3ZELFlBQVksRUFBRSxzQkFBYyxDQUFDLFlBQVk7SUFDekMsYUFBYSxFQUFFLHNCQUFjLENBQUMsYUFBYTtJQUMzQyxxQkFBcUIsRUFBRSxzQkFBYyxDQUFDLHFCQUFxQjtDQUM1RCxDQUFDO0FBVUYsU0FBUyxJQUFJLENBQXNCLEdBQXVCO0lBQ3hELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQVEsQ0FBQztBQUNqQyxDQUFDO0FBRVksUUFBQSw0QkFBNEIscUJBR3BDLElBQUksQ0FBQyw0QkFBb0IsQ0FBQztLQUMxQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLDRCQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUMvQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7SUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzVCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxFQUFFLEVBQTBDLENBQUMsRUFDaEQifQ==