import { Duration } from "luxon";

export type RankingType = "rankedPairs" | "instantRunoff" | "firstPastThePost";

/* Ranked Pairs */

// Inputs
export type Option = string;
export type Vote = Record<Option, number | undefined>;

// Processing
type Rows<T> = Record<Option, T>;
type Cols<T> = Record<Option, T>;

export type OptionMatrix = Rows<Cols<number | undefined>>;

// Outputs
export interface Ranking {
  rank: number;
  key: string;
  score: number;
}

export interface RankingMetrics {
  voteCount: number;
  computeDuration: Duration;
}

export interface RankingResults {
  rankingType: RankingType;
  rankings?: Ranking[];
  matrix?: OptionMatrix;
  metrics: RankingMetrics;
  finalRankings: [Option, number][];
}

/* Instant Runoff */

export class UserVotes extends Array<string> {
  constructor(orderedVoteOptions: string[] = []) {
    super();
    this.push(...orderedVoteOptions);
  }
}

export class RankedVoteCounts {
  numOptions;
  voteCounts: number[] = [];

  constructor(numOptions: number) {
    if (numOptions < 0) {
      throw new Error("numOptions must be >= 0");
    }
    this.numOptions = numOptions;
    for (let i = 0; i < numOptions; i++) {
      this.voteCounts.push(0);
    }
  }

  addVote(rank: number): void {
    if (rank < 0 || rank >= this.numOptions) {
      throw new Error("vote rank must be >= 0 && < total options");
    }
    this.voteCounts[rank]++;
  }
}

export type OptionNameToVoteCountsDict = { [key: string]: RankedVoteCounts };

export type StringNumDict = { [key: string]: number };

export class StageResult {
  userVotes: UserVotes[] = [];
  rankedVoteCounts: OptionNameToVoteCountsDict = {};

  constructor(voteOptions: Option[]) {
    for (let voteOption of voteOptions) {
      this.rankedVoteCounts[voteOption] = new RankedVoteCounts(
        voteOptions.length
      );
    }
  }
}

export class FinalResult {
  totalNumVoters = 0;
  stageResults: StageResult[] = [];
  winner: string | null = null;
  tieOptions: string[] | null = null;
}
