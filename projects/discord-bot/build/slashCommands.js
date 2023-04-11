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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = exports.matchCommand = exports.helpCommand = exports.deleteMyUserDataCommand = exports.pollUpdateCommand = exports.pollAuditCommand = exports.pollCloseCommand = exports.pollResultsCommand = exports.pollElectionCommand = exports.pollCreateCommand = void 0;
const builders_1 = require("@discordjs/builders");
const rest_1 = require("@discordjs/rest");
const v9_1 = require("discord-api-types/v9");
const settings_1 = require("./settings");
exports.pollCreateCommand = new builders_1.SlashCommandBuilder()
    .setName("poll_create")
    .setDescription("Create a poll")
    .addStringOption((option) => option
    .setName("topic")
    .setDescription("The topic of the poll")
    .setRequired(true))
    .addStringOption((option) => option
    .setName("options")
    .setDescription("Comma-separated poll options")
    .setRequired(true))
    .addBooleanOption((option) => option
    .setName("randomized_ballots")
    .setDescription("Enables randomized ballot option ordering if true. (default: True)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("anytime_results")
    .setDescription("Allows users to view results before the poll is closed. (default: True)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("preferential")
    .setDescription("Allows users to select preferences when voting. (default: True)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("ranked_pairs")
    .setDescription("Use ranked pairs voting instead of instant-runoff voting. (default: False)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("force_all_preferences")
    .setDescription("Force users to include all preferences when answering ballots. (default: False)")
    .setRequired(false));
exports.pollElectionCommand = new builders_1.SlashCommandBuilder()
    .setName("poll_election")
    .setDescription("Create an election poll")
    .addStringOption((option) => option
    .setName("candidates")
    .setDescription("Comma-separated candidate party names")
    .setRequired(true));
exports.pollResultsCommand = new builders_1.SlashCommandBuilder()
    .setName("poll_results")
    .setDescription("View poll results")
    .addStringOption((option) => option
    .setName("poll_id")
    .setDescription("The poll id to view results for")
    .setRequired(true))
    .addBooleanOption((option) => option
    .setName("private")
    .setDescription("Makes the command response private. (default: False)")
    .setRequired(false));
exports.pollCloseCommand = new builders_1.SlashCommandBuilder()
    .setName("poll_close")
    .setDescription("Close a poll")
    .addStringOption((option) => option
    .setName("poll_id")
    .setDescription("The poll id to close")
    .setRequired(true));
exports.pollAuditCommand = new builders_1.SlashCommandBuilder()
    .setName("poll_audit")
    .setDescription("Audit a poll. Only the poll owner, admins, or pollbotAdmins can audit a poll.")
    .addStringOption((option) => option
    .setName("poll_id")
    .setDescription("The poll id to audit")
    .setRequired(true));
exports.pollUpdateCommand = new builders_1.SlashCommandBuilder()
    .setName("poll_update")
    .setDescription("Update a poll")
    .addStringOption((option) => option
    .setName("poll_id")
    .setDescription("The poll id to update")
    .setRequired(true))
    .addStringOption((option) => option.setName("topic").setDescription("Update the poll's topic"))
    .addStringOption((option) => option
    .setName("closes_at")
    .setDescription("Update the poll's closing time. ISO-format"))
    .addBooleanOption((option) => option
    .setName("randomized_ballots")
    .setDescription("Enables randomized ballot option ordering if true. (default: True)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("anytime_results")
    .setDescription("Allows users to view results before the poll is closed. (default: True)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("preferential")
    .setDescription("Allows users to select preferences when voting. (default: True)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("ranked_pairs")
    .setDescription("Use ranked pairs voting instead of instant-runoff voting. (default: False)")
    .setRequired(false))
    .addBooleanOption((option) => option
    .setName("force_all_preferences")
    .setDescription("Force users to include all preferences when answering ballots. (default: False)")
    .setRequired(false));
exports.deleteMyUserDataCommand = new builders_1.SlashCommandBuilder()
    .setName("unsafe_delete_my_user_data")
    .setDescription(`Deletes all of your polls and ballots. This is cannot be reversed.`)
    .addUserOption((option) => option
    .setName("confirm_user")
    .setDescription("Confirm your account")
    .setRequired(true));
const nonHelpCommands = [
    exports.pollCreateCommand,
    exports.pollElectionCommand,
    exports.pollResultsCommand,
    exports.pollCloseCommand,
    exports.pollAuditCommand,
    exports.pollUpdateCommand,
    exports.deleteMyUserDataCommand,
];
exports.helpCommand = new builders_1.SlashCommandBuilder()
    .setName("help")
    .setDescription(`View information about pollbot commands`)
    .addBooleanOption((option) => option
    .setName("public")
    .setDescription("Help message is visible to other users")
    .setRequired(false))
    .addStringOption((option) => option
    .setName("command")
    .setDescription("Prints detailed help information for a command")
    .setRequired(false)
    .setChoices(...nonHelpCommands.map((c) => Object({
    name: c.name,
    value: c.name,
}))));
const okCommands = [...nonHelpCommands, exports.helpCommand];
const commands = [...okCommands];
function matchCommand(commandName) {
    return okCommands.find((c) => c.name === commandName);
}
exports.matchCommand = matchCommand;
const clientId = settings_1.DISCORD_CLIENT_ID;
const rest = new rest_1.REST({ version: "9" }).setToken(settings_1.DISCORD_TOKEN);
function registerCommands() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Started refreshing application (/) commands.");
            yield rest.put(v9_1.Routes.applicationCommands(clientId), { body: commands });
            console.log("Successfully reloaded application (/) commands.");
        }
        catch (error) {
            console.error(error);
        }
    });
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xhc2hDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zbGFzaENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLGtEQUEwRDtBQUMxRCwwQ0FBdUM7QUFDdkMsNkNBRzhCO0FBQzlCLHlDQUE4RDtBQUVqRCxRQUFBLGlCQUFpQixHQUFHLElBQUksOEJBQW1CLEVBQUU7S0FDdkQsT0FBTyxDQUFDLGFBQWEsQ0FBQztLQUN0QixjQUFjLENBQUMsZUFBZSxDQUFDO0tBQy9CLGVBQWUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzFCLE1BQU07S0FDSCxPQUFPLENBQUMsT0FBTyxDQUFDO0tBQ2hCLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQztLQUN2QyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQ3JCO0tBQ0EsZUFBZSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDMUIsTUFBTTtLQUNILE9BQU8sQ0FBQyxTQUFTLENBQUM7S0FDbEIsY0FBYyxDQUFDLDhCQUE4QixDQUFDO0tBQzlDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FDckI7S0FDQSxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzNCLE1BQU07S0FDSCxPQUFPLENBQUMsb0JBQW9CLENBQUM7S0FDN0IsY0FBYyxDQUNiLG9FQUFvRSxDQUNyRTtLQUNBLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FDdEI7S0FDQSxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzNCLE1BQU07S0FDSCxPQUFPLENBQUMsaUJBQWlCLENBQUM7S0FDMUIsY0FBYyxDQUNiLHlFQUF5RSxDQUMxRTtLQUNBLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FDdEI7S0FDQSxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzNCLE1BQU07S0FDSCxPQUFPLENBQUMsY0FBYyxDQUFDO0tBQ3ZCLGNBQWMsQ0FDYixpRUFBaUUsQ0FDbEU7S0FDQSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQ3RCO0tBQ0EsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUMzQixNQUFNO0tBQ0gsT0FBTyxDQUFDLGNBQWMsQ0FBQztLQUN2QixjQUFjLENBQ2IsNEVBQTRFLENBQzdFO0tBQ0EsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUN0QjtLQUNBLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDM0IsTUFBTTtLQUNILE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztLQUNoQyxjQUFjLENBQ2IsaUZBQWlGLENBQ2xGO0tBQ0EsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUN0QixDQUFDO0FBRVMsUUFBQSxtQkFBbUIsR0FBRyxJQUFJLDhCQUFtQixFQUFFO0tBQ3pELE9BQU8sQ0FBQyxlQUFlLENBQUM7S0FDeEIsY0FBYyxDQUFDLHlCQUF5QixDQUFDO0tBQ3pDLGVBQWUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzFCLE1BQU07S0FDSCxPQUFPLENBQUMsWUFBWSxDQUFDO0tBQ3JCLGNBQWMsQ0FBQyx1Q0FBdUMsQ0FBQztLQUN2RCxXQUFXLENBQUMsSUFBSSxDQUFDLENBQ3JCLENBQUM7QUFFUyxRQUFBLGtCQUFrQixHQUFHLElBQUksOEJBQW1CLEVBQUU7S0FDeEQsT0FBTyxDQUFDLGNBQWMsQ0FBQztLQUN2QixjQUFjLENBQUMsbUJBQW1CLENBQUM7S0FDbkMsZUFBZSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDMUIsTUFBTTtLQUNILE9BQU8sQ0FBQyxTQUFTLENBQUM7S0FDbEIsY0FBYyxDQUFDLGlDQUFpQyxDQUFDO0tBQ2pELFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FDckI7S0FDQSxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzNCLE1BQU07S0FDSCxPQUFPLENBQUMsU0FBUyxDQUFDO0tBQ2xCLGNBQWMsQ0FBQyxzREFBc0QsQ0FBQztLQUN0RSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQ3RCLENBQUM7QUFFUyxRQUFBLGdCQUFnQixHQUFHLElBQUksOEJBQW1CLEVBQUU7S0FDdEQsT0FBTyxDQUFDLFlBQVksQ0FBQztLQUNyQixjQUFjLENBQUMsY0FBYyxDQUFDO0tBQzlCLGVBQWUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzFCLE1BQU07S0FDSCxPQUFPLENBQUMsU0FBUyxDQUFDO0tBQ2xCLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQztLQUN0QyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQ3JCLENBQUM7QUFFUyxRQUFBLGdCQUFnQixHQUFHLElBQUksOEJBQW1CLEVBQUU7S0FDdEQsT0FBTyxDQUFDLFlBQVksQ0FBQztLQUNyQixjQUFjLENBQ2IsK0VBQStFLENBQ2hGO0tBQ0EsZUFBZSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDMUIsTUFBTTtLQUNILE9BQU8sQ0FBQyxTQUFTLENBQUM7S0FDbEIsY0FBYyxDQUFDLHNCQUFzQixDQUFDO0tBQ3RDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FDckIsQ0FBQztBQUVTLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSw4QkFBbUIsRUFBRTtLQUN2RCxPQUFPLENBQUMsYUFBYSxDQUFDO0tBQ3RCLGNBQWMsQ0FBQyxlQUFlLENBQUM7S0FDL0IsZUFBZSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDMUIsTUFBTTtLQUNILE9BQU8sQ0FBQyxTQUFTLENBQUM7S0FDbEIsY0FBYyxDQUFDLHVCQUF1QixDQUFDO0tBQ3ZDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FDckI7S0FDQSxlQUFlLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUMxQixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUNsRTtLQUNBLGVBQWUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzFCLE1BQU07S0FDSCxPQUFPLENBQUMsV0FBVyxDQUFDO0tBQ3BCLGNBQWMsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUNoRTtLQUNBLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDM0IsTUFBTTtLQUNILE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztLQUM3QixjQUFjLENBQ2Isb0VBQW9FLENBQ3JFO0tBQ0EsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUN0QjtLQUNBLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDM0IsTUFBTTtLQUNILE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztLQUMxQixjQUFjLENBQ2IseUVBQXlFLENBQzFFO0tBQ0EsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUN0QjtLQUNBLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDM0IsTUFBTTtLQUNILE9BQU8sQ0FBQyxjQUFjLENBQUM7S0FDdkIsY0FBYyxDQUNiLGlFQUFpRSxDQUNsRTtLQUNBLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FDdEI7S0FDQSxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzNCLE1BQU07S0FDSCxPQUFPLENBQUMsY0FBYyxDQUFDO0tBQ3ZCLGNBQWMsQ0FDYiw0RUFBNEUsQ0FDN0U7S0FDQSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQ3RCO0tBQ0EsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUMzQixNQUFNO0tBQ0gsT0FBTyxDQUFDLHVCQUF1QixDQUFDO0tBQ2hDLGNBQWMsQ0FDYixpRkFBaUYsQ0FDbEY7S0FDQSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQ3RCLENBQUM7QUFFUyxRQUFBLHVCQUF1QixHQUFHLElBQUksOEJBQW1CLEVBQUU7S0FDN0QsT0FBTyxDQUFDLDRCQUE0QixDQUFDO0tBQ3JDLGNBQWMsQ0FDYixvRUFBb0UsQ0FDckU7S0FDQSxhQUFhLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUN4QixNQUFNO0tBQ0gsT0FBTyxDQUFDLGNBQWMsQ0FBQztLQUN2QixjQUFjLENBQUMsc0JBQXNCLENBQUM7S0FDdEMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUNyQixDQUFDO0FBRUosTUFBTSxlQUFlLEdBQUc7SUFDdEIseUJBQWlCO0lBQ2pCLDJCQUFtQjtJQUNuQiwwQkFBa0I7SUFDbEIsd0JBQWdCO0lBQ2hCLHdCQUFnQjtJQUNoQix5QkFBaUI7SUFDakIsK0JBQXVCO0NBQ3hCLENBQUM7QUFFVyxRQUFBLFdBQVcsR0FBRyxJQUFJLDhCQUFtQixFQUFFO0tBQ2pELE9BQU8sQ0FBQyxNQUFNLENBQUM7S0FDZixjQUFjLENBQUMseUNBQXlDLENBQUM7S0FDekQsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUMzQixNQUFNO0tBQ0gsT0FBTyxDQUFDLFFBQVEsQ0FBQztLQUNqQixjQUFjLENBQUMsd0NBQXdDLENBQUM7S0FDeEQsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUN0QjtLQUNBLGVBQWUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzFCLE1BQU07S0FDSCxPQUFPLENBQUMsU0FBUyxDQUFDO0tBQ2xCLGNBQWMsQ0FBQyxnREFBZ0QsQ0FBQztLQUNoRSxXQUFXLENBQUMsS0FBSyxDQUFDO0tBQ2xCLFVBQVUsQ0FDVCxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQ3BCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDSixNQUFNLENBQUM7SUFDTCxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7SUFDWixLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUk7Q0FDZCxDQUE4QyxDQUNsRCxDQUNGLENBQ0osQ0FBQztBQUVKLE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBRyxlQUFlLEVBQUUsbUJBQVcsQ0FBQyxDQUFDO0FBRXJELE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztBQUVqQyxTQUFnQixZQUFZLENBQUMsV0FBbUI7SUFDOUMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFGRCxvQ0FFQztBQUVELE1BQU0sUUFBUSxHQUFHLDRCQUFpQixDQUFDO0FBRW5DLE1BQU0sSUFBSSxHQUFHLElBQUksV0FBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLHdCQUFhLENBQUMsQ0FBQztBQUVoRSxTQUFzQixnQkFBZ0I7O1FBQ3BDLElBQUk7WUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7WUFFNUQsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBRXpFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaURBQWlELENBQUMsQ0FBQztTQUNoRTtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN0QjtJQUNILENBQUM7Q0FBQTtBQVZELDRDQVVDIn0=