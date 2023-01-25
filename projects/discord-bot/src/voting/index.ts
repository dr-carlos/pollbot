import columnify from "columnify";
import { MessageEmbed } from "discord.js";
import { POLL_ID_PREFIX } from "../commands";
import { Ballot, Poll, PollFeature } from "../models";
import { DEBUG } from "../settings";
import { shuffled } from "../util/random";
import { rankedPairs, showMatrix } from "./condorcet";
import { RankingResults, RankingType, Vote, UserVotes } from "./interfaces";
import { instantRunoff } from "./instantRunoff";
import { firstPastThePost } from "./firstPastThePost";

export function computeResults(
  poll: Poll,
  ballots: Ballot[]
): RankingResults | undefined {
  const optionKeys = Object.keys(poll?.options ?? {}).sort();

  for (let i = 0; i < ballots.length; i++)
    if (Object.values(ballots[i].votes).every((option) => option.rank == null))
      ballots.splice(i, 1);

  if (poll.features.includes(PollFeature.DISABLE_PREFERENCES)) {
    const votes: string[] = ballots.map((b) => {
      return Object.keys(b.votes)[0];
    });

    return firstPastThePost(votes);
  } else if (poll.features.includes(PollFeature.RANKED_PAIRS)) {
    const votes: Vote[] = ballots.map((b) => {
      const v: Record<string, number> = {};
      optionKeys.forEach((k) => {
        v[k] = optionKeys.length - (b.votes[k]?.rank ?? optionKeys.length);
      });
      return v;
    });

    return rankedPairs(optionKeys, votes);
  } else {
    const votes: UserVotes[] = ballots.map((b) => {
      const v: Record<string, number> = {};
      optionKeys.forEach((k) => {
        v[k] = optionKeys.length - (b.votes[k]?.rank ?? optionKeys.length);
      });
      const k: string[] = Object.keys(v);
      k.sort((a, b) => (v[a] < v[b] ? 1 : v[a] > v[b] ? -1 : 0));
      return new UserVotes(k);
    });

    return instantRunoff(optionKeys, votes);
  }
}

function displayRankingType(rankingType: RankingType): string {
  switch (rankingType) {
    case "rankedPairs":
      return "**Ranked Pairs - Tideman** (<https://en.wikipedia.org/wiki/Ranked_pairs>)";
    case "instantRunoff":
      return "**Instant-Runoff** (<https://en.wikipedia.org/Instant-runoff_voting>)";
    case "firstPastThePost":
      return "**First-Past-the-Post** (<https://en.wikipedia.org/wiki/First-past-the-post_voting>)";
  }
}

export function resultsSummary(
  poll: Poll,
  results: RankingResults
): [MessageEmbed, boolean] {
  const footer = `Ranking Type: ${displayRankingType(results.rankingType)}\n`;

  const columns =
    DEBUG || results.rankingType == "firstPastThePost"
      ? ["rank", "option", "score"]
      : ["rank", "option"];

  let rank = 1;
  const rankingLines = results.finalRankings.map(([key, score], i) => ({
    option: poll.options[key],
    rank:
      i == results.finalRankings.length - 1 ||
      results.finalRankings[i + 1][1] == score
        ? rank
        : rank++,
    score,
  }));

  if (results.rankingType === "firstPastThePost") rankingLines.reverse();

  const finalRankings = columnify(rankingLines, {
    columns,
    align: "right",
    columnSplitter: " | ",
  });

  const metrics =
    `Ballot count: ${results.metrics.voteCount}\n` +
    `Time to compute: ${results.metrics.computeDuration.toFormat("S")}ms\n`;

  const finalRankingsSort = [...results.finalRankings];

  finalRankingsSort.sort((a, b) => {
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
  });

  const highestRanking: number = finalRankingsSort[0][1];
  const winners = finalRankingsSort.filter(
    (option) => option[1] === highestRanking
  );

  const tied: boolean = winners.length != 1;
  const description: string = poll.features.includes(PollFeature.ELECTION_POLL)
    ? tied
      ? winners
          .map(
            (winner) =>
              "<@&" +
                poll.roleCache?.find(
                  (role) => role.name === poll.options[winner[0]]
                )?.id +
                ">" ?? poll.options[winner[0]]
          )
          .join(", ") + " tie!"
      : `<@&${
          poll.roleCache?.find(
            (role) => role.name === poll.options[results.finalRankings[0][0]]
          )?.id ?? poll.options[results.finalRankings[0][0]]
        }> wins!`
    : "```" + finalRankings + "```";

  const embed = new MessageEmbed({
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
      embed.addField(
        "These were close calls!",
        closeCallMsg.substring(0, 1024)
      );
    }
  }

  embed
    .addField("Metrics", metrics.substring(0, 1024))
    .addField("Info", footer.substring(0, 1024))
    .setFooter({ text: `${POLL_ID_PREFIX}${poll.id}` });
  return [embed, tied];
}

export function explainResults(poll: Poll, results: RankingResults): string {
  const summary = resultsSummary(poll, results);
  const matrixText = showMatrix(results.matrix);
  return summary + "\n```" + matrixText + "```";
}
