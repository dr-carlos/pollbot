import { Timer } from "../util/timer";
import {
  StringNumDict,
  OptionNameToVoteCountsDict,
  StageResult,
  FinalResult,
  UserVotes,
  Option,
  RankingResults,
  RankingMetrics,
  Vote,
} from "./interfaces";

export function instantRunoff(
  options: string[],
  votes: UserVotes[]
): RankingResults | undefined {
  if (votes.length === 0) return;

  const computeTimer = Timer.startTimer();
  const controller = new VoteController(options);
  controller.acceptPopulationVotes(votes);
  const finalResult = controller.getFinalResult();
  const finalRankings: [string, number][] =
    finalResult.winner != null
      ? [[finalResult.winner, 1]]
      : finalResult.tieOptions?.map((o) => [o, 1]) ?? [];
  const metrics: RankingMetrics = {
    voteCount: votes.length,
    computeDuration: computeTimer.endTimer(),
  };

  return {
    rankingType: "instantRunoff",
    metrics,
    finalRankings,
  };
}

export class VoteController {
  private logic: VoteControllerLogic;
  originalVotes: UserVotes[] = [];

  constructor(public options: Option[]) {
    if (!options || options.length <= 0)
      throw new Error("options are required");
    this.logic = new VoteControllerLogic(options);
  }

  acceptUserVotes(userVotes: UserVotes): void {
    this.originalVotes.push(userVotes);
  }

  acceptPopulationVotes(allVotes: UserVotes[]): void {
    for (const userVotes of allVotes) this.acceptUserVotes(userVotes);
  }

  getFinalResult(): FinalResult {
    const finalResult = new FinalResult();
    finalResult.totalNumVoters = this.originalVotes.length;

    let stageResult = this.logic.getStageResult(this.originalVotes);
    finalResult.stageResults.push(stageResult);

    let winner = this.logic.getStageWinner(stageResult);
    while (winner === null) {
      const losers = this.logic.getLosers(stageResult);

      const optionsWithRankOneVotes = this.logic.getOptionsWithRankOneVotes(
        stageResult.rankedVoteCounts
      );

      // Tie if losers are exact same as optionsWithRankOneVotes
      if (this.logic.sameOptions(losers, optionsWithRankOneVotes)) {
        finalResult.tieOptions = optionsWithRankOneVotes;
        return finalResult;
      }

      stageResult = this.logic.getNextStageResult(stageResult, losers);
      finalResult.stageResults.push(stageResult);

      winner = this.logic.getStageWinner(stageResult);
    }

    finalResult.winner = winner;

    return finalResult;
  }
}

export class VoteControllerLogic {
  constructor(public options: Option[]) {
    if (!options || options.length <= 0) {
      throw new Error("options are required");
    }
  }

  // This comparison method only works here because we're operating
  // on arrays where options only ever appear once
  sameOptions(optionsA: string[], optionsB: string[]): boolean {
    return (
      optionsA.length === optionsB.length &&
      optionsA.every((val) => optionsB.includes(val))
    );
  }

  getNextStageResult(
    currentStageResult: StageResult,
    losers: string[]
  ): StageResult {
    if (!losers || losers.length === 0) {
      throw new Error("losers must be passed to generate the next StageResult");
    }

    const nextUserVotes: UserVotes[] = [];

    for (const userVotes of currentStageResult.userVotes) {
      const votesWithoutLosers = new UserVotes(
        userVotes.filter((option) => !losers.includes(option))
      );
      nextUserVotes.push(votesWithoutLosers);
    }

    return this.getStageResult(nextUserVotes);
  }

  getOptionsWithRankOneVotes(
    optionNameToVoteCountsDict: OptionNameToVoteCountsDict
  ): string[] {
    return Object.keys(optionNameToVoteCountsDict)
      .filter((key) => optionNameToVoteCountsDict[key].voteCounts[0] > 0)
      .map((key) => key);
  }

  getLosers(currentStageResult: StageResult): string[] {
    const losers: string[] = [];
    const allVoteCounts = currentStageResult.rankedVoteCounts;

    let fewestRankOneVotes: number | null = null;

    for (const optionName in allVoteCounts) {
      if (!this.optionHasVotes(optionName, allVoteCounts)) continue;

      const rankOneVotes = allVoteCounts[optionName].voteCounts[0];
      if (fewestRankOneVotes === null || rankOneVotes < fewestRankOneVotes)
        fewestRankOneVotes = rankOneVotes;
    }

    for (const optionName in allVoteCounts) {
      if (allVoteCounts[optionName].voteCounts[0] === fewestRankOneVotes)
        losers.push(optionName);
    }

    const numTiedLosers = losers.length;
    const numOptionsLeftWithRankOneVotes = this.getOptionsWithRankOneVotes(
      currentStageResult.rankedVoteCounts
    ).length;

    // Tie breaker logic only required if tie is between all remaining viable options
    if (numTiedLosers === 1 || numTiedLosers !== numOptionsLeftWithRankOneVotes)
      return losers;

    const eliminationScenarioCounts: StringNumDict = {};

    for (const loser of losers) {
      const nextStageResultWithoutLoser = this.getNextStageResult(
        currentStageResult,
        [loser]
      );

      for (const optionName in nextStageResultWithoutLoser.rankedVoteCounts) {
        if (!losers.includes(optionName)) continue;

        const rankOneVotes =
          nextStageResultWithoutLoser.rankedVoteCounts[optionName]
            .voteCounts[0];

        if (optionName in eliminationScenarioCounts)
          eliminationScenarioCounts[optionName] += rankOneVotes;
        else eliminationScenarioCounts[optionName] = rankOneVotes;
      }
    }

    fewestRankOneVotes = Math.min(...Object.values(eliminationScenarioCounts));

    const worstLosers = Object.keys(eliminationScenarioCounts)
      .filter((key) => eliminationScenarioCounts[key] == fewestRankOneVotes)
      .map((key) => key);

    return worstLosers;
  }

  getRankOneVotesDict(voteCounts: OptionNameToVoteCountsDict): StringNumDict {
    return Object.fromEntries(
      Object.entries(voteCounts).map(([optionName, v], i) => [
        optionName,
        voteCounts[optionName].voteCounts[0],
      ])
    );
  }

  optionHasVotes(
    optionName: string,
    allVoteCounts: OptionNameToVoteCountsDict
  ): boolean {
    for (const count of allVoteCounts[optionName].voteCounts)
      if (count > 0) return true;

    return false;
  }

  getStageResult(userVotesArray: UserVotes[]): StageResult {
    const stageResult = new StageResult(this.options);

    for (const userVotes of userVotesArray)
      for (let i = 0; i < userVotes.length; i++)
        stageResult.rankedVoteCounts[userVotes[i]].addVote(i);

    stageResult.userVotes = userVotesArray.map((v) => {
      return new UserVotes([...v]);
    });

    return stageResult;
  }

  getStageWinner(stageResult: StageResult): string | null {
    let totalFirstRankVotes = 0;

    for (const option in stageResult.rankedVoteCounts)
      totalFirstRankVotes += stageResult.rankedVoteCounts[option].voteCounts[0];

    for (const option in stageResult.rankedVoteCounts)
      if (
        stageResult.rankedVoteCounts[option].voteCounts[0] /
          totalFirstRankVotes >
        0.5
      )
        return option;

    return null;
  }
}
