import {
  ButtonInteraction,
  Collection,
  CommandInteraction,
  DiscordAPIError,
  GuildBasedChannel,
  GuildChannel,
  GuildChannelManager,
  GuildMember,
  Message,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  MessageEditOptions,
  MessageEmbed,
  PartialMessage,
  PartialUser,
  Snowflake,
  Team,
  ThreadChannel,
  ThreadMember,
  ThreadMemberManager,
  User,
} from "discord.js";
import moment from "moment-timezone";
import {
  Option,
  PollOptionKey,
  Poll,
  PollConfig,
  PollId,
  Vote,
  PollFeature,
  POLL_FEATURES_MAPPER,
} from "./models";
import storage from "./storage";
import { computeResults, resultsSummary } from "./voting";
import { showMatrix } from "./voting/condorcet";
import { L, PREFIX } from "./settings";
import { reverseLookup } from "./util/record";
import { DateTime } from "luxon";
import columnify from "columnify";
import {
  AnySlashCommandBuilder,
  AnyUser,
  Context,
  Interaction,
} from "./Context";
import { PollMetricsDTO } from "idl/lib/polls/v1/polls";
import {
  deleteMyUserDataCommand,
  helpCommand,
  pollAuditCommand,
  pollCloseCommand,
  pollCreateCommand,
  pollElectionCommand,
  pollResultsCommand,
  pollUpdateCommand,
} from "./slashCommands";
import { APIApplicationCommandOption } from "discord-api-types/v9";

export const POLLBOT_PREFIX = PREFIX;
export const CREATE_POLL_COMMAND = `${POLLBOT_PREFIX} poll`;
export const CLOSE_POLL_COMMAND = `${POLLBOT_PREFIX} close`;
export const POLL_RESULTS_COMMAND = `${POLLBOT_PREFIX} results`;
export const AUDIT_POLL_COMMAND = `${POLLBOT_PREFIX} audit`;
export const ADD_POLL_FEATURES_COMMAND = `${POLLBOT_PREFIX} addFeatures`;
export const REMOVE_POLL_FEATURES_COMMAND = `${POLLBOT_PREFIX} removeFeatures`;
export const SET_POLL_PROPERTIES_COMMAND = `${POLLBOT_PREFIX} set`;
export const DELETE_MY_USER_DATA_COMMAND = `${POLLBOT_PREFIX} deleteMyUserData`;

export const POLL_ID_PREFIX = "Poll ";

export function isTeam(
  userTeam: User | Team | null | undefined,
): userTeam is Team {
  return userTeam !== undefined && (userTeam as Team).ownerId !== null;
}

function simpleEmbed(title: string, description?: string) {
  return new MessageEmbed({
    title,
    description,
  });
}

function simpleSendable(title: string, description?: string) {
  return {
    embeds: [simpleEmbed(title, description)],
  };
}

export async function createPoll(
  _ctx: Context<CommandInteraction>,
  topic: string,
  optionsString: string,
  randomizedBallots: boolean,
  anytimeResults: boolean,
  preferential: boolean,
  rankedPairs: boolean,
  election: boolean,
  forceAllPreferences: boolean,
  pacps: boolean,
  majorityClose: boolean,
) {
  const ctx = await _ctx.defer();

  const optionsList: string[] = optionsString
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o !== "");

  if (optionsList.length < 2)
    return await ctx.editReply(
      simpleSendable("You must specify at least two options in a poll."),
    );
  if (optionsList.length > 26)
    return await ctx.editReply(
      simpleSendable("Polls cannot have more than 26 options"),
    );

  const options: Record<PollOptionKey, Option> = {};
  optionsList.forEach((o, i) => {
    const key = String.fromCharCode(97 + i);
    options[key] = o;
  });

  if (!ctx.guild) {
    await ctx.editReply("Couldn't determine your server...");
    throw new Error("Couldn't determine guild...");
  }

  const features: PollFeature[] = [];
  if (!randomizedBallots) features.push(PollFeature.DISABLE_RANDOMIZED_BALLOTS);
  if (!anytimeResults) features.push(PollFeature.DISABLE_ANYTIME_RESULTS);

  if (election) {
    features.push(PollFeature.ELECTION_POLL);
    if (pacps) features.push(PollFeature.PACPS);
  }

  if (!preferential || optionsList.length == 2) {
    features.push(PollFeature.DISABLE_PREFERENCES);
    if (majorityClose) features.push(PollFeature.CLOSE_ON_MAJORITY);
  } else {
    if (forceAllPreferences) features.push(PollFeature.FORCE_ALL_PREFERENCES);
    if (rankedPairs) features.push(PollFeature.RANKED_PAIRS);
  }

  const context: Poll["context"] = {
    $case: "discord",
    discord: {
      guildId: ctx.guild.id,
      ownerId: ctx.user.id,
    },
  };

  const pollConfig: PollConfig = {
    topic,
    options,
    features,
    context,
  };

  const poll = await storage.createPoll(pollConfig);
  if (!poll)
    return await ctx.editReply(
      simpleSendable("I couldn't make this poll. Something went wrong."),
    );

  poll.roleCache = ctx.guild?.roles.cache;

  if (election) poll.closesAt = moment().add(2, "days").toDate();

  const metrics = await storage.getPollMetrics(poll.id);
  const pollMessage = await ctx.editReply({
    embeds: [await createPollEmbed(ctx, poll, metrics)],
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("request_ballot")
          .setLabel(election ? "Re-Request Ballot" : "Request Ballot")
          .setStyle("PRIMARY"),
      ),
    ],
  });

  const pollMsgEmbed = await createPollEmbed(ctx, poll, metrics, {
    message: pollMessage,
  });
  pollMessage.embeds = [pollMsgEmbed];

  if (poll.context?.$case === "discord") {
    poll.context.discord.messageRef = {
      channelId: pollMessage.channelId,
      id: pollMessage.id,
    };
  }
  await storage.updatePoll(poll.id, poll);
}

async function createPollEmbed(
  ctx: Context,
  poll: Poll,
  metrics?: PollMetricsDTO,
  result?: { message: Message },
): Promise<MessageEmbed> {
  const election: boolean = poll.features.includes(PollFeature.ELECTION_POLL);
  const { message } = result ?? {};
  const closesAt = moment(poll.closesAt)
    .tz("Australia/Hobart")
    .format("dddd, MMMM Do YYYY, h:mm zz");

  if (
    election &&
    message != null &&
    !poll.features.includes(PollFeature.SENT_ELECTION_DMS)
  ) {
    const channel: GuildBasedChannel | null | undefined =
      await ctx.guild?.channels.fetch(message.channelId);
    const rawMembers:
      | Collection<Snowflake, GuildMember>
      | ThreadMemberManager
      | undefined = channel?.members;
    // console.log(rawMembers);

    if (rawMembers != null) {
      let newMembers: null | Collection<Snowflake, GuildMember> = null;
      if ("add" in rawMembers) {
        const fetchedMembers = await rawMembers.fetch();
        if ("concat" in fetchedMembers) {
          const mappedMembers = (
            fetchedMembers as unknown as Collection<Snowflake, ThreadMember>
          ).mapValues((member) => member.guildMember);

          mappedMembers.sweep((member) => member == null);

          newMembers = mappedMembers as Collection<Snowflake, GuildMember>;
        } else {
          newMembers =
            fetchedMembers.guildMember == null
              ? new Collection()
              : new Collection([["0", fetchedMembers.guildMember]]);
        }
      }

      const members: Collection<string | Snowflake, GuildMember> = (
        newMembers == null ? rawMembers : newMembers
      ) as Collection<string | Snowflake, GuildMember>;

      const a = await channel?.fetch();
      const b = message.guild?.channels.cache.find(
        (ch) => ch.name == channel?.name,
      );
      console.log(a?.members);

      if (poll.features.includes(PollFeature.PACPS)) {
        const candidateRoles: string[] = Object.values(poll.options).map(
          (o) =>
            ctx.guild?.roles.cache.find((role) => role.name === o)?.id ?? "",
        );

        const roleMap: { [roleID: string]: User[] } = {};
        const nonCandidateVoters: User[] = [];

        candidateRoles.forEach((roleID) => (roleMap[roleID] = []));

        members.each(function (member) {
          if (member.user?.bot) return;

          let candidate = false;

          for (const role of member.roles.cache.values())
            if (candidateRoles.includes(role.id)) {
              roleMap[role.id].push(member.user);
              candidate = true;
            }

          if (!candidate) nonCandidateVoters.push(member.user);
        });

        for (const users of Object.values(roleMap))
          createBallot(
            ctx,
            message,
            users[Math.floor(Math.random() * users.length)],
            false,
          );

        for (const user of nonCandidateVoters)
          createBallot(ctx, message, user, false);
      } else
        for (const member of members)
          if (!member[1].user.bot)
            createBallot(ctx, message, member[1].user, false);

      poll.features.push(PollFeature.SENT_ELECTION_DMS);
    }
  }

  const optionText = Object.values(poll?.options)
    .map((o) =>
      election
        ? `<@&${poll.roleCache?.find((role) => role.name == o)?.id}>` ??
          `\`${o}\``
        : `\`${o}\``,
    )
    .join(", ");
  let footerText = `This poll closes at ${closesAt}`;

  if ((metrics || election) && message?.editable)
    footerText += `\nBallots: ${metrics ? metrics.ballotsSubmitted : 0} submitted / ${
      metrics ? metrics.ballotsRequested : 0
    } ${election ? "sent" : "requested"}`;

  L.d(footerText);

  return new MessageEmbed({
    title: `${POLL_ID_PREFIX}${poll.id}`,
    description: election
      ? poll.features.includes(PollFeature.PACPS)
        ? "Someone in each party has been DM-ed a ballot, as have all non-candidates."
        : "All voters have been DM-ed a ballot"
      : "React to this message for me to DM you a ballot",
  })
    .addField(poll.topic, optionText)
    .setFooter({
      text: footerText,
    });
}

export async function updatePoll(
  _ctx: Context<CommandInteraction>,
  pollId: string,
  topic?: string,
  closesAt?: string,
  randomizedBallots?: boolean,
  anytimeResults?: boolean,
  preferential?: boolean,
  rankedPairs?: boolean,
  forceAllPreferences?: boolean,
  pacps?: boolean,
  majorityClose?: boolean,
) {
  const ctx = await _ctx.defer({ ephemeral: true });
  const poll = await storage.getPoll(pollId);
  if (!poll) {
    return await ctx.editReply({
      ...simpleSendable(`I couldn't find poll ${pollId}`),
      ephemeral: true,
    });
  }

  try {
    await ctx.checkPermissions(
      ["botOwner", "guildAdmin", "pollbotAdmin", "pollOwner"],
      poll,
    );
  } catch {
    return await ctx.editReply({
      ...simpleSendable(`You don't have permission to edit this poll`),
      ephemeral: true,
    });
  }

  let embed = new MessageEmbed({ description: `Poll#${poll.id} updated!` });
  if (topic) {
    poll.topic = topic;
    embed = embed.addField("topic", topic);
  }
  if (closesAt) {
    const date = DateTime.fromISO(closesAt);
    if (!date.isValid) {
      return await ctx.editReply({
        ...simpleSendable(`The date for \`closes_at\` is invalid.`),
        ephemeral: true,
      });
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
    } else {
      removePollFeature(poll, "disableRandomizedBallots");
      embed = embed.addField("randomized_ballots", "enabled");
    }
  }
  if (anytimeResults !== undefined) {
    if (anytimeResults) {
      removePollFeature(poll, "disableAnytimeResults");
      embed = embed.addField("anytime_results", "enabled");
    } else {
      addPollFeature(poll, "disableAnytimeResults");
      embed = embed.addField("anytime_results", "disabled");
    }
  }
  if (preferential !== undefined) {
    if (preferential) {
      removePollFeature(poll, "disablePreferences");
      embed = embed.addField("preferential", "enabled");
    } else {
      addPollFeature(poll, "disablePreferences");
      embed = embed.addField("preferential", "disabled");
    }
  }
  if (rankedPairs !== undefined) {
    if (rankedPairs) {
      addPollFeature(poll, "RANKED_PAIRS");
      embed = embed.addField("ranked_pairs", "enabled");
    } else {
      removePollFeature(poll, "RANKED_PAIRS");
      embed = embed.addField("ranked_pairs", "disabled");
    }
  }
  if (forceAllPreferences !== undefined) {
    if (forceAllPreferences) {
      addPollFeature(poll, "FORCE_ALL_PREFERENCES");
      embed = embed.addField("force_all_preferences", "enabled");
    } else {
      removePollFeature(poll, "FORCE_ALL_PREFERENCES");
      embed = embed.addField("force_all_preferences", "disabled");
    }
  }
  if (pacps !== undefined) {
    if (pacps) {
      addPollFeature(poll, "PACPS");
      embed = embed.addField("pacps", "enabled");
    } else {
      removePollFeature(poll, "PACPS");
      embed = embed.addField("pacps", "disabled");
    }
  }
  if (majorityClose !== undefined) {
    if (majorityClose) {
      addPollFeature(poll, "CLOSE_ON_MAJORITY");
      embed = embed.addField("close_on_majority", "enabled");
    } else {
      removePollFeature(poll, "CLOSE_ON_MAJORITY");
      embed = embed.addField("close_on_majority", "disabled");
    }
  }

  await storage.updatePoll(poll.id, poll);
  await ctx.editReply({
    embeds: [embed],
    ephemeral: true,
  });
  try {
    const metrics = await storage.getPollMetrics(poll.id);
    await updatePollMessage(ctx, poll, async (channel) => ({
      embeds: [await createPollEmbed(ctx, poll, metrics, channel)],
    }));
  } catch (e) {
    if (e instanceof DiscordAPIError && e.code === 50001) {
      await ctx.followUp({
        embeds: [
          new MessageEmbed({
            color: "RED",
            description:
              "I couldn't update the poll message with your changes. Please make sure that I'm invited to the poll channel and my permissions are correct.",
          }),
        ],
      });
    }
  }
}

function addPollFeature(
  poll: Poll,
  featureOrName: PollFeature | keyof typeof POLL_FEATURES_MAPPER,
) {
  let feature = PollFeature.UNKNOWN;
  if (typeof featureOrName === "string") {
    feature = POLL_FEATURES_MAPPER[featureOrName];
  } else {
    feature = featureOrName;
  }
  if (!poll.features) {
    poll.features = [feature];
  } else {
    if (poll.features.indexOf(feature) === -1) {
      poll.features.push(feature);
    }
  }
}
function removePollFeature(
  poll: Poll,
  featureOrName: PollFeature | keyof typeof POLL_FEATURES_MAPPER,
) {
  let feature = PollFeature.UNKNOWN;
  if (typeof featureOrName === "string") {
    feature = POLL_FEATURES_MAPPER[featureOrName];
  } else {
    feature = featureOrName;
  }
  if (poll.features) {
    const i = poll.features.indexOf(feature);
    if (i !== -1) {
      poll.features.splice(i, 1);
    }
  }
}

async function getPollChannel(ctx: Context, poll: Poll) {
  let guild = ctx.guild;
  if (!guild) {
    const client = await ctx.client();
    let guildId = poll.guildId;
    if (!guildId && poll.context?.$case === "discord") {
      guildId = poll.context.discord.guildId;
    }
    if (!guildId) return;
    guild = await client.guilds.fetch(guildId);
  }
  let messageRef = poll.messageRef;
  if (poll.context?.$case === "discord") {
    messageRef = poll.context.discord.messageRef;
  }
  if (!guild || !messageRef) return;
  const channel = await guild.channels.fetch(messageRef.channelId);
  return {
    channel,
    guild,
    messageRef,
  };
}

async function updatePollMessage(
  ctx: Context,
  poll: Poll,
  optionsBuilder: (
    inputs: Awaited<ReturnType<typeof getPollChannel>> & { message: Message },
  ) => Promise<MessageEditOptions>,
) {
  const result = await getPollChannel(ctx, poll);
  if (!result) return;
  const { channel, messageRef } = result;
  if (!channel?.isText() || !messageRef) {
    L.d("Channel is not valid");
    return;
  }
  const permissions = channel.permissionsFor(ctx.user.id);
  if (
    permissions?.has("SEND_MESSAGES") &&
    permissions.has("READ_MESSAGE_HISTORY")
  ) {
    const message = await channel.messages.fetch(messageRef.id);
    if (message.editable) {
      return await message.edit({
        ...(await optionsBuilder({
          ...result,
          message,
        })),
      });
    } else {
      L.d("Message is not editable");
    }
  } else {
    L.d("Cannot edit poll message");
  }
}

export async function closePoll(_ctx: Context<Interaction>, pollId: string) {
  const ctx = await _ctx.defer();
  const poll: Poll | undefined = await storage.getPoll(pollId);
  if (!poll) {
    return await ctx.editReply(
      simpleSendable(`I couldn't find poll ${pollId}`),
    );
  }

  try {
    await ctx.checkPermissions(
      ["botOwner", "guildAdmin", "pollbotAdmin", "pollOwner"],
      poll,
    );
  } catch {
    return await ctx.editReply(
      simpleSendable(`You don't have permission to close this poll`),
    );
  }
  // Update poll closing time in background
  poll.closesAt = moment().toDate();
  await storage.updatePoll(poll.id, poll);
  const metrics = await storage.getPollMetrics(poll.id);
  await updatePollMessage(ctx, poll, async (channel) => ({
    embeds: [await createPollEmbed(ctx, poll, metrics, channel)],
  }));
  try {
    const ballots = await storage.listBallots(poll.id);
    const results = computeResults(poll, ballots);
    if (!results) {
      return await ctx.editReply(
        simpleSendable(
          `${POLL_ID_PREFIX}${poll.id} is now closed. There are no results...`,
        ),
      );
    }

    const election: boolean = poll.features.includes(PollFeature.ELECTION_POLL);

    if (election) {
      const [summary, tied] = resultsSummary(poll, results);
      summary.setTitle("The election is now closed.");

      const message = await ctx.editReply({
        embeds: [summary],
      });

      if (tied) {
        const options: string[] = Object.values(poll.options).sort();

        const finalRankings = columnify(
          ballots
            .sort(() => 0.5 - Math.random())
            .map((b) => {
              const votes: Record<string, number | undefined> = {};
              const votedOptions: string[] = Object.values(poll.options);
              Object.values(b.votes).forEach((v) => {
                votes[v.option] = v.rank;
                votedOptions.splice(votedOptions.indexOf(v.option), 1);
              });

              votes[votedOptions[0]] = options.length;

              return votes;
            }),
          {
            columns: options,
            align: "right",
            columnSplitter: " | ",
          },
        );

        await message.reply({
          embeds: [
            new MessageEmbed({
              description: `Here's all ballot data for the election, where '1' is 1st preference, '2' is 2nd preference, '3' is 3rd, etc. You can manually see who won. \`\`\`${finalRankings}\`\`\``,
            }),
          ],
        });
      }

      return message;
    } else {
      const summary = resultsSummary(poll, results)[0];
      summary.setTitle(`${POLL_ID_PREFIX}${poll.id} is now closed.`);

      return await ctx.editReply({
        embeds: [summary],
      });
    }
  } catch (e) {
    L.d(e);
    return await ctx.editReply(
      `There was an issue computing results for poll ${poll.id}`,
    );
  }
}

export async function pollResults(
  _ctx: Context<CommandInteraction>,
  pollId: string,
  ephemeral: boolean,
) {
  const ctx = await _ctx.defer({ ephemeral });
  const poll = await storage.getPoll(pollId);
  if (!poll) {
    return await ctx.editReply({
      ...simpleSendable(`Poll ${pollId} not found.`),
      ephemeral: true,
    });
  }
  try {
    await ctx.checkPermissions(
      ["botOwner", "pollOwner", "pollGuild", "guildAdmin"],
      poll,
    );
  } catch {
    return await ctx.editReply({
      ...simpleSendable(
        `You can't view results for poll ${pollId} in this channel.`,
      ),
      ephemeral: true,
    });
  }
  if (
    poll.features &&
    poll.features.indexOf(PollFeature.DISABLE_ANYTIME_RESULTS) !== -1
  ) {
    if (poll.closesAt && poll.closesAt > moment().toDate()) {
      return await ctx.editReply({
        ...simpleSendable(
          `${POLL_ID_PREFIX}${pollId} has disabled anytime results and is not closed`,
        ),
        ephemeral: true,
      });
    }
  }
  const ballots = await storage.listBallots(poll.id);
  const results = computeResults(poll, ballots);
  if (!results) {
    return await ctx.editReply({
      ...simpleSendable("There are no results yet"),
      ephemeral,
    });
  }

  const summary = resultsSummary(poll, results)[0];
  return await ctx.editReply({
    embeds: [summary],
    ephemeral,
  });
}

const POLL_EXPR = new RegExp(`^>?\\s?${POLL_ID_PREFIX}(.+)`);

function extractPollId(text: string | undefined): PollId | undefined {
  const m = text?.match(POLL_EXPR);
  if (!m || m.length < 2) return;
  return m[1];
}

function findPollId(message: Message | PartialMessage): string | undefined {
  let pollId = extractPollId(message.content ?? "");
  if (pollId) return pollId;
  pollId = extractPollId(message.embeds[0]?.title ?? undefined);
  return pollId;
}

function getNickname(ctx: Context): string | undefined {
  // Return early if we don't have a member in our interaction
  if (ctx.interaction == null) return;
  if (!("member" in ctx.interaction)) return;

  return (
    // Get nickname from ctx.interaction.member
    (ctx.interaction.member instanceof GuildMember
      ? ctx.interaction.member?.nickname
      : ctx.interaction.member?.nick) ?? undefined
  );
}

export async function createBallotFromButton(ctx: Context<ButtonInteraction>) {
  const user = ctx.interaction.user;
  const message = await ctx.resolveMessage(ctx.interaction.message);
  const pollId = findPollId(message);
  if (!pollId) {
    L.d(
      `Couldn't find poll for new ballot: ${message.content?.substring(
        0,
        POLL_ID_PREFIX.length,
      )}`,
    );
    return await user.send(
      simpleSendable(
        "There was an issue creating your ballot",
        "Couldn't parse pollId",
      ),
    );
  }
  const poll = await storage.getPoll(pollId);
  if (!poll)
    return await user.send(
      simpleSendable(
        "There was an issue creating your ballot",
        "Couldn't find the poll",
      ),
    );

  if (poll.closesAt && poll.closesAt < moment().toDate()) {
    return await user.send(simpleSendable(`Poll ${poll.id} is closed.`));
  }

  let ballot = await storage.findBallot(poll.id, user.id);
  if (!ballot) {
    if (poll.features.includes(PollFeature.ELECTION_POLL))
      return await user.send(
        simpleSendable(
          "You were not sent a ballot. Please check with other members of your party to see if they were sent the ballot.",
        ),
      );

    const nickname = getNickname(ctx);
    if (nickname)
      ballot = await storage.createBallot(poll, {
        pollId: poll.id,
        context: {
          $case: "discord",
          discord: {
            userId: user.id,
            userName: nickname,
          },
        },
      });
  } else {
    for (const o in ballot.votes) {
      ballot.votes[o].rank = undefined;
    }
    await storage.updateBallot(ballot.id, ballot);
  }

  if (!ballot) {
    return await user.send(
      simpleSendable("There was an issue creating your ballot."),
    );
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
    await storage.updateBallot(ballot.id, ballot);
  }

  let optionText = "";
  const disableRandomizedBallots =
    poll.features?.includes(PollFeature.DISABLE_RANDOMIZED_BALLOTS) ?? false;
  const ballotOptionMapping = ballot.ballotOptionMapping;

  const disablePreferences =
    poll.features?.includes(PollFeature.DISABLE_PREFERENCES) ?? false;

  if (ballotOptionMapping && !disableRandomizedBallots) {
    optionText = Object.keys(ballotOptionMapping)
      .sort()
      .map((ballotKey) => {
        const pollOptionKey = ballotOptionMapping[ballotKey] ?? "";
        const pollOption = poll.options[pollOptionKey];
        return `${ballotKey}| ${pollOption}`;
      })
      .join("\n");
  } else {
    optionText = Object.keys(poll.options)
      .sort()
      .map((key) => `${key}| ${poll.options[key]}`)
      .join("\n");
  }
  const responseEmbed = new MessageEmbed({
    title: `${POLL_ID_PREFIX}${poll.id}`,
    description: `Here's your ballot.`,
  })
    .setURL(message.url)
    .addField(
      "Instructions",
      `To vote, ${
        disablePreferences
          ? "state your preferred option e.g. `a`"
          : "order the options from best to worst in a comma-separated list e.g. `c,b,a,d`"
      }\n` + `_Invalid options will be ignored_\n`,
    )
    .addField(poll.topic, `\`\`\`\n${optionText}\n\`\`\``)
    .setFooter({
      text: `Privacy notice: Your user id and current user name is linked to your ballot. Your ballot is viewable by you and bot admins.\n\nballot#${ballot.id}`,
    });
  const dm = await user.send({
    embeds: [responseEmbed],
  });
  await ctx.interaction.reply({
    embeds: [
      new MessageEmbed({
        title: "Here's your new ballot",
        url: dm.url,
      }),
    ],
    ephemeral: true,
  });

  const metrics = await storage.getPollMetrics(poll.id);
  await updatePollMessage(ctx, poll, async (result) => ({
    embeds: [await createPollEmbed(ctx, poll, metrics, result)],
  }));
}

export async function createBallot(
  ctx: Context,
  message: Message | PartialMessage,
  user: User | PartialUser,
  fromReaction = true,
) {
  if (user == null) return;

  const pollId = findPollId(message);
  if (!pollId) {
    L.d(
      `Couldn't find poll for new ballot: ${message.content?.substring(
        0,
        POLL_ID_PREFIX.length,
      )}`,
    );
    return await user.send(
      simpleSendable(
        "There was an issue creating your ballot",
        "Couldn't parse pollId",
      ),
    );
  }
  const poll = await storage.getPoll(pollId);
  if (!poll)
    return await user.send(
      simpleSendable(
        "There was an issue creating your ballot",
        "Couldn't find the poll",
      ),
    );

  if (poll.features.includes(PollFeature.ELECTION_POLL) && fromReaction) return;

  if (poll.closesAt && poll.closesAt < moment().toDate()) {
    return await user.send(simpleSendable(`Poll ${poll.id} is closed.`));
  }

  let ballot = await storage.findBallot(poll.id, user.id);
  if (!ballot) {
    ballot = await storage.createBallot(poll, {
      pollId: poll.id,
      context: {
        $case: "discord",
        discord: {
          userId: user.id,
          userName: getNickname(ctx) ?? "",
        },
      },
    });
  } else {
    for (const o in ballot.votes) {
      ballot.votes[o].rank = undefined;
    }
    await storage.updateBallot(ballot.id, ballot);
  }

  if (!ballot) {
    return await user.send(
      simpleSendable("There was an issue creating your ballot."),
    );
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
    await storage.updateBallot(ballot.id, ballot);
  }

  let optionText = "";
  const disableRandomizedBallots =
    poll.features?.includes(PollFeature.DISABLE_RANDOMIZED_BALLOTS) ?? false;
  const ballotOptionMapping = ballot.ballotOptionMapping;

  const disablePreferences =
    poll.features?.includes(PollFeature.DISABLE_PREFERENCES) ?? false;

  if (ballotOptionMapping && !disableRandomizedBallots) {
    optionText = Object.keys(ballotOptionMapping)
      .sort()
      .map((ballotKey) => {
        const pollOptionKey = ballotOptionMapping[ballotKey] ?? "";
        const pollOption = poll.options[pollOptionKey];
        return `${ballotKey}| ${pollOption}`;
      })
      .join("\n");
  } else {
    optionText = Object.keys(poll.options)
      .sort()
      .map((key) => `${key}| ${poll.options[key]}`)
      .join("\n");
  }
  const responseEmbed = new MessageEmbed({
    title: `${POLL_ID_PREFIX}${poll.id}`,
    description: `Here's your ballot.`,
  })
    .setURL(message.url)
    .addField(
      "Instructions",
      `To vote, ${
        disablePreferences
          ? "state your preferred option e.g. `a`"
          : "order the options from best to worst in a comma-separated list e.g. `c,b,a,d`"
      }\n` + `_Invalid options will be ignored_\n`,
    )
    .addField(poll.topic, `\`\`\`\n${optionText}\n\`\`\``)
    .setFooter({
      text: `Privacy notice: Your user id and current user name is linked to your ballot. Your ballot is viewable by you and bot admins.\n\nballot#${ballot.id}`,
    });
  await user.send({
    embeds: [responseEmbed],
  });

  const metrics = await storage.getPollMetrics(poll.id);
  await updatePollMessage(ctx, poll, async (channel) => ({
    embeds: [await createPollEmbed(ctx, poll, metrics, channel)],
  }));
}

export async function submitBallot(ctx: Context<Message>, message: Message) {
  const limit = 50;
  const history = await message.channel.messages.fetch({ limit });
  const lastBallotText = history.find((m) => findPollId(m) !== undefined);
  if (!lastBallotText) {
    return await message.channel.send(
      simpleSendable(`Could not find a pollId in the last ${limit} messages`),
    );
  }

  const messageContent = message.content.toLowerCase();
  if (messageContent.startsWith(POLLBOT_PREFIX)) {
    return await message.channel.send(
      simpleSendable(
        "DMs are for submitting ballots. Manage polls in public channels.",
      ),
    );
  }

  const pollId = findPollId(lastBallotText);
  if (!pollId) {
    return await message.channel.send(
      simpleSendable(`Could not find a pollId in the last ${limit} messages`),
    );
  }

  const poll = await storage.getPoll(pollId);
  if (!poll) {
    return await message.channel.send(
      simpleSendable(`Could not find a poll with id ${pollId}`),
    );
  }

  if (poll.closesAt && poll.closesAt < moment().toDate()) {
    return await message.channel.send(
      simpleSendable(`Poll ${poll.id} is closed.`),
    );
  }

  const ballot = await storage.findBallot(pollId, message.author.id);
  if (!ballot) {
    return await message.channel.send(
      simpleSendable(`I couldn't find a ballot for you on poll ${pollId}`),
    );
  }

  const validOptionKeys = Object.keys(poll.options).sort();

  const voteKeys: string[] = messageContent
    .trim()
    .split(",")
    .map((key) => key.trim());

  let validVoteKeys: string[] = voteKeys.filter((key) =>
    validOptionKeys.find((ok) => ok === key),
  );

  let votes: Record<PollOptionKey, Vote> = {};

  const disableRandomizedBallot =
    poll.features?.includes(PollFeature.DISABLE_RANDOMIZED_BALLOTS) ?? false;
  const disablePreferences =
    poll.features?.includes(PollFeature.DISABLE_PREFERENCES) ?? false;
  const forceAllPreferences =
    poll.features?.includes(PollFeature.FORCE_ALL_PREFERENCES) ?? false;

  const ballotOptionMapping = ballot.ballotOptionMapping;

  if (disablePreferences) validVoteKeys = [validVoteKeys[0]];

  if (
    forceAllPreferences &&
    validVoteKeys.length < Object.keys(poll.options).length - 1
  )
    return await message.channel.send(
      simpleSendable("You must preference all options."),
    );

  if (ballotOptionMapping && !disableRandomizedBallot) {
    votes = validVoteKeys.reduce(
      (acc, ballotKey, i) => {
        const pollOptionKey = ballotOptionMapping[ballotKey];
        if (pollOptionKey) {
          acc[pollOptionKey] = {
            option: poll.options[pollOptionKey],
            rank: i + 1,
          };
        }
        return acc;
      },
      {} as Record<PollOptionKey, Vote>,
    );
  } else {
    votes = validVoteKeys.reduce(
      (acc, pollOptionKey, i) => {
        acc[pollOptionKey] = {
          option: poll.options[pollOptionKey],
          rank: i + 1,
        };
        return acc;
      },
      {} as Record<PollOptionKey, Vote>,
    );
  }

  const updatedBallot = await storage.updateBallot(ballot.id, {
    ...ballot,
    updatedAt: moment().toDate(),
    votes,
  });
  if (!updatedBallot) {
    return await message.channel.send(
      simpleSendable("There was a problem recording your ballot."),
    );
  }

  let summaryLines = [];

  if (ballotOptionMapping && !disableRandomizedBallot) {
    summaryLines = validOptionKeys.map(
      (key) =>
        ` ${votes[key] ? votes[key].rank : "_"}    | ${reverseLookup(
          ballotOptionMapping,
          key,
        )}   | ${poll.options[key]}`,
    );
  } else {
    summaryLines = validOptionKeys.map(
      (key) =>
        ` ${votes[key] ? votes[key].rank : "_"}    | ${key}   | ${
          poll.options[key]
        }`,
    );
  }

  summaryLines.sort();
  if (disablePreferences)
    summaryLines = [summaryLines[0].replace(/.+ {4}\|/, "")];

  const responseEmbed = new MessageEmbed({
    description: `I've recorded your ballot.`,
  })
    .addField(
      "Vote summary",
      `\`\`\`` +
        (disablePreferences ? " key | option\n" : " rank | key | option\n") +
        "====================\n" +
        summaryLines.join("\n") +
        `\`\`\``,
    )
    .setFooter({ text: `${POLL_ID_PREFIX}${poll.id}\nballot#${ballot.id}` })
    .setTimestamp();

  await message.channel.send({
    embeds: [responseEmbed],
  });
  const metrics = await storage.getPollMetrics(poll.id);

  await updatePollMessage(ctx, poll, async (channel) => ({
    embeds: [await createPollEmbed(ctx, poll, metrics, channel)],
  }));
}

function shortCommandHelp(command: AnySlashCommandBuilder): string {
  return `\`/${command.name}\` - ${command.description}`;
}

function optionHelp(option: APIApplicationCommandOption): string {
  return `\`${option.name}\` - ${option.description}`;
}

export function commandHelp(command: AnySlashCommandBuilder): MessageEmbed {
  const embed = new MessageEmbed({
    title: `Help: \`/${command.name}\``,
    description: command.description,
  });

  const options: APIApplicationCommandOption[] = command.options.map(
    (o) => o.toJSON() as APIApplicationCommandOption,
  );
  const requiredOptions = options.filter((o) => o.required === true);
  const optionalOptions = options.filter((o) => o.required !== true);
  if (requiredOptions.length > 0) {
    embed.addField(
      "Required Options",
      requiredOptions.map((o) => optionHelp(o)).join("\n"),
    );
  }
  if (optionalOptions.length > 0) {
    embed.addField(
      "Options",
      optionalOptions.map((o) => optionHelp(o)).join("\n"),
    );
  }
  return embed;
}

export function helpEmbed() {
  return new MessageEmbed({
    title: "Help",
  })
    .addField("General Commands", shortCommandHelp(helpCommand))
    .addField(
      "Poll Commands",
      `${shortCommandHelp(pollCreateCommand)}\n` +
        `${shortCommandHelp(pollElectionCommand)}\n` +
        `${shortCommandHelp(pollResultsCommand)}\n\n` +
        `_These are privileged commands for poll owners, admins, pollbot admins, and bot owners_\n` +
        `${shortCommandHelp(pollCloseCommand)}\n` +
        `${shortCommandHelp(pollUpdateCommand)}\n` +
        `${shortCommandHelp(pollAuditCommand)}\n`,
    )
    .addField("Destructive Commands", shortCommandHelp(deleteMyUserDataCommand))
    .addField(
      "More questions?",
      "Read the FAQ (https://github.com/qntnt/pollbot/wiki/FAQ)",
    );
}

export async function help(ctx: Context<Message>, message: Message) {
  message.channel.send({
    embeds: [helpEmbed()],
  });
}

function toCSVRow(
  columns: string[],
  record: Record<string, string | number | undefined>,
): string {
  return columns.map((col) => record[col]).join(",");
}

function toCSVRows(
  columns: string[],
  records: Record<string, string | number | undefined>[],
) {
  return records.map((rec) => toCSVRow(columns, rec)).join("\n");
}

export function toCSV(
  columns: string[],
  records: Record<string, string | number | undefined>[],
): string {
  const header: string = columns.join(",");
  return [header, toCSVRows(columns, records)].join("\n");
}

export type PollbotPermission =
  | "pollOwner"
  | "botOwner"
  | "guildAdmin"
  | "pollGuild"
  | "pollbotAdmin";

export function isGuildMember(user?: AnyUser | null): user is GuildMember {
  if (user) {
    return (user as GuildMember).guild !== undefined;
  }
  return false;
}

async function belongsToGuild(
  ctx: Context,
  poll: Poll,
  bypassForBotOwner = true,
) {
  try {
    const isOwner = await ctx.checkPermissions(["botOwner"], poll);
    if (bypassForBotOwner && isOwner) return true;
  } catch (e) {
    if (poll.context?.$case === "discord") {
      return poll.context.discord.guildId === ctx.guild?.id;
    }
    return poll.guildId === ctx.guild?.id;
  }
}

export async function auditPoll(
  _ctx: Context<CommandInteraction>,
  pollId: string,
) {
  const ctx = await _ctx.defer({ ephemeral: true });
  const poll = await storage.getPoll(pollId);
  L.d("Poll", poll);
  if (poll === undefined) {
    L.d("Couldn\t find poll", poll);
    return await ctx.editReply({
      ...simpleSendable(`Poll ${pollId} not found.`),
      ephemeral: true,
    });
  }
  L.d("Check guild", poll);
  const inGuild = await belongsToGuild(ctx, poll, true);
  if (!inGuild) {
    L.d("Poll doesn't belong to this guild", poll);
    return await ctx.editReply({
      ...simpleSendable(`Poll ${pollId} does not belong to this server.`),
      ephemeral: true,
    });
  }

  try {
    await ctx.checkPermissions(
      ["botOwner", "guildAdmin", "pollbotAdmin", "pollOwner"],
      poll,
    );
  } catch (e) {
    L.d(e);
    return await ctx.editReply({
      ...simpleSendable(
        `You are not allowed to audit this poll.`,
        `Only admins, pollbot admins, poll owners, and bot owners may audit poll results and export ballot data.`,
      ),
      ephemeral: true,
    });
  }

  const ballots = await storage.listBallots(poll.id);

  const results = computeResults(poll, ballots);
  if (!results) {
    return await ctx.editReply({
      ...simpleSendable(`There was an issue computing results`),
      ephemeral: true,
    });
  }
  const summary = resultsSummary(poll, results)[0];
  const matrixSummary = showMatrix(results.matrix);
  await ctx.editReply({
    embeds: [summary],
    ephemeral: true,
  });
  const matrixEmbed = new MessageEmbed({
    title: "Pairwise Comparison Matrix",
    description:
      "To read this, each value in a row shows who wins a matchup between candidates\n" +
      "```" +
      matrixSummary +
      "```",
  });
  if (matrixEmbed.length <= 2000) {
    await ctx.followUp({
      embeds: [matrixEmbed],
      ephemeral: true,
    });
  } else {
    await ctx.followUp({
      ...simpleSendable(
        "Your poll has too many options to render a pairwise comparison matrix.",
      ),
      ephemeral: true,
    });
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
  const csvText = toCSV(
    columns,
    ballots.map((b) => {
      const votes: Record<string, number | undefined> = {};
      Object.values(b.votes).forEach((v) => {
        votes[v.option] = v.rank;
      });
      let userId = "";
      let userName = "";
      if (b.context?.$case === "discord") {
        userId = b.context.discord.userId;
        userName = b.context.discord.userName;
      }
      return {
        ballotId: b.id,
        createdAt: moment(b.createdAt).toISOString(),
        updatedAt: moment(b.updatedAt).toISOString(),
        userId,
        userName,
        ...votes,
      };
    }),
  );
  const csvBuffer = Buffer.from(csvText);
  const attachment = new MessageAttachment(
    csvBuffer,
    `poll_${poll.id}_votes.csv`,
  );

  await ctx.directMessage({
    embeds: [
      new MessageEmbed({
        description: `Here's a file containing all ballot data for \`${POLL_ID_PREFIX}${poll.id}\``,
      }),
    ],
    files: [attachment],
  });
  await ctx.followUp({
    embeds: [
      new MessageEmbed({
        description: `I sent you a direct message with a \`.csv\` file that contains all ballot data for \`${POLL_ID_PREFIX}${poll.id}\`.`,
      }),
    ],
    ephemeral: true,
  });
}

export async function deleteMyUserData(
  _ctx: Context<CommandInteraction>,
  user: User,
) {
  const ctx = await _ctx.defer({ ephemeral: true });
  if (ctx.user.id !== user.id) {
    return await ctx.editReply("The user does not match your account.");
  }

  await ctx.editReply({
    embeds: [
      new MessageEmbed({
        color: "RED",
        description: "Deleting your data...",
      }),
    ],
  });
  try {
    const metrics = await storage.deleteUserData(ctx.user.id);
    await ctx.interaction.editReply({
      embeds: [
        new MessageEmbed({
          color: "RED",
          description: `${metrics.numPolls} polls and ${metrics.numBallots} ballots were deleted.`,
        }),
      ],
    });
  } catch (e) {
    await ctx.interaction.editReply({
      embeds: [
        new MessageEmbed({
          color: "RED",
          description:
            "There was an issue while deleting your data. Please contact Pollbot support.",
        }),
      ],
    });
  }
}
