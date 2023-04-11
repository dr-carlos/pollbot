"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalResult = exports.StageResult = exports.RankedVoteCounts = exports.UserVotes = void 0;
class UserVotes extends Array {
    constructor(orderedVoteOptions = []) {
        if (typeof orderedVoteOptions === "number")
            super(orderedVoteOptions);
        else {
            super();
            this.push(...orderedVoteOptions);
        }
    }
}
exports.UserVotes = UserVotes;
class RankedVoteCounts {
    constructor(numOptions) {
        this.voteCounts = [];
        if (numOptions < 0) {
            throw new Error("numOptions must be >= 0");
        }
        this.numOptions = numOptions;
        for (let i = 0; i < numOptions; i++) {
            this.voteCounts.push(0);
        }
    }
    addVote(rank) {
        if (rank < 0 || rank >= this.numOptions) {
            throw new Error("vote rank must be >= 0 && < total options");
        }
        this.voteCounts[rank]++;
    }
}
exports.RankedVoteCounts = RankedVoteCounts;
class StageResult {
    constructor(voteOptions) {
        this.userVotes = [];
        this.rankedVoteCounts = {};
        for (let voteOption of voteOptions) {
            this.rankedVoteCounts[voteOption] = new RankedVoteCounts(voteOptions.length);
        }
    }
}
exports.StageResult = StageResult;
class FinalResult {
    constructor() {
        this.totalNumVoters = 0;
        this.stageResults = [];
        this.winner = null;
        this.tieOptions = null;
    }
}
exports.FinalResult = FinalResult;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy92b3RpbmcvaW50ZXJmYWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFzQ0EsTUFBYSxTQUFVLFNBQVEsS0FBYTtJQUMxQyxZQUFZLHFCQUF3QyxFQUFFO1FBQ3BELElBQUksT0FBTyxrQkFBa0IsS0FBSyxRQUFRO1lBQUUsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7YUFDakU7WUFDSCxLQUFLLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ2xDO0lBQ0gsQ0FBQztDQUNGO0FBUkQsOEJBUUM7QUFFRCxNQUFhLGdCQUFnQjtJQUkzQixZQUFZLFVBQWtCO1FBRjlCLGVBQVUsR0FBYSxFQUFFLENBQUM7UUFHeEIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFO1lBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztTQUM1QztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDekI7SUFDSCxDQUFDO0lBRUQsT0FBTyxDQUFDLElBQVk7UUFDbEIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztTQUM5RDtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0Y7QUFwQkQsNENBb0JDO0FBTUQsTUFBYSxXQUFXO0lBSXRCLFlBQVksV0FBcUI7UUFIakMsY0FBUyxHQUFnQixFQUFFLENBQUM7UUFDNUIscUJBQWdCLEdBQStCLEVBQUUsQ0FBQztRQUdoRCxLQUFLLElBQUksVUFBVSxJQUFJLFdBQVcsRUFBRTtZQUNsQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDdEQsV0FBVyxDQUFDLE1BQU0sQ0FDbkIsQ0FBQztTQUNIO0lBQ0gsQ0FBQztDQUNGO0FBWEQsa0NBV0M7QUFFRCxNQUFhLFdBQVc7SUFBeEI7UUFDRSxtQkFBYyxHQUFHLENBQUMsQ0FBQztRQUNuQixpQkFBWSxHQUFrQixFQUFFLENBQUM7UUFDakMsV0FBTSxHQUFrQixJQUFJLENBQUM7UUFDN0IsZUFBVSxHQUFvQixJQUFJLENBQUM7SUFDckMsQ0FBQztDQUFBO0FBTEQsa0NBS0MifQ==