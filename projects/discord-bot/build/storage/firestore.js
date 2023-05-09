"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.FirestoreStorage = void 0;
const admin = __importStar(require("firebase-admin"));
const moment_1 = __importDefault(require("moment"));
const models_1 = require("../models");
const array_1 = require("../util/array");
const random_1 = require("../util/random");
const Actions_1 = require("../util/Actions");
const luxon_1 = require("luxon");
const polls_1 = require("idl/lib/polls/v1/polls");
admin.initializeApp();
const firestore = admin.firestore();
class FirestoreStorage {
    constructor() {
        this.pollCollection = firestore.collection("polls");
        this.ballotCollection = firestore.collection("ballots");
        this.guildCollection = firestore.collection("guilds");
        this.counters = firestore.collection("counters");
        this.pollIdCounterRef = this.counters.doc("poll_id");
    }
    incrementPollId() {
        return __awaiter(this, void 0, void 0, function* () {
            const newPollId = yield firestore.runTransaction((t) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const snapshot = yield t.get(this.pollIdCounterRef);
                const newPollId = ((_b = (_a = snapshot.data()) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0) + 1;
                t.update(this.pollIdCounterRef, { value: newPollId });
                return newPollId;
            }));
            return newPollId.toString();
        });
    }
    createPoll(pollConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const pollId = yield this.incrementPollId();
            const now = (0, moment_1.default)();
            const poll = polls_1.PollDTO.fromJSON(Object.assign(Object.assign({}, models_1.PollConfig.toJSON(pollConfig)), { id: pollId, createdAt: now.toDate(), closesAt: now
                    .add(pollConfig.features.includes(models_1.PollFeature.ELECTION_POLL) ? 3 : 7, "days")
                    .toDate(), ballots: {} }));
            poll.features = poll.features.filter((f) => f != models_1.PollFeature.UNKNOWN && f != models_1.PollFeature.UNRECOGNIZED);
            yield this.pollCollection.doc(pollId).set(models_1.Poll.toJSON(poll));
            return poll;
        });
    }
    getPoll(pollId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.pollCollection.doc(pollId).get();
            const data = snapshot.data();
            if (!data)
                return;
            let createdAt = data.createdAt;
            if (typeof createdAt === "string") {
                createdAt = luxon_1.DateTime.fromISO(createdAt).toJSDate();
            }
            else {
                createdAt = createdAt.toDate();
            }
            let closesAt = data.closesAt;
            if (typeof closesAt === "string") {
                closesAt = luxon_1.DateTime.fromISO(closesAt).toJSDate();
            }
            else {
                closesAt = closesAt.toDate();
            }
            const poll = polls_1.PollDTO.fromJSON(Object.assign(Object.assign({}, models_1.Poll.toJSON(models_1.Poll.fromJSON(data))), { createdAt: createdAt, closesAt: closesAt, features: data.features }));
            poll.features = poll.features.filter((f) => f !== models_1.PollFeature.UNKNOWN && f !== models_1.PollFeature.UNRECOGNIZED);
            return poll;
        });
    }
    updatePoll(pollId, poll) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pollCollection.doc(pollId).update(models_1.Poll.toJSON(poll));
            return yield this.getPoll(pollId);
        });
    }
    getPollMetrics(pollId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.ballotCollection
                .where("pollId", "==", pollId)
                .select("votes")
                .get();
            const ballots = snapshot.docs.map((doc) => models_1.Ballot.fromJSON(doc.data()));
            let ballotsSubmitted = 0;
            ballots.forEach((b) => {
                const votes = Object.values(b.votes);
                for (const v of votes) {
                    if (v.rank) {
                        ballotsSubmitted += 1;
                        break;
                    }
                }
            });
            return {
                ballotsRequested: ballots.length,
                ballotsSubmitted,
            };
        });
    }
    listGuildData() {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.guildCollection.select().get();
            return snapshot.docs.map((d) => d.id);
        });
    }
    getGuildData(guildId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.guildCollection.doc(guildId).get();
            if (!snapshot.exists) {
                const guildData = {
                    id: guildId,
                    admins: {},
                };
                yield this.createGuildData(guildData);
                return guildData;
            }
            return snapshot.data();
        });
    }
    createGuildData(guildData) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.guildCollection
                .doc(guildData.id)
                .set(models_1.GuildData.toJSON(guildData));
            return guildData;
        });
    }
    deleteGuildData(guildId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.guildCollection.doc(guildId).delete();
        });
    }
    createBallot(poll, { context }) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((context === null || context === void 0 ? void 0 : context.$case) !== "discord")
                throw new Error("Cannot create a ballot on a non-Discord poll.");
            const { userId, userName } = context.discord;
            const now = (0, moment_1.default)();
            const pollOptionKeys = Object.keys(poll.options);
            const votes = pollOptionKeys.reduce((acc, key) => {
                acc[key] = {
                    option: poll.options[key],
                };
                return acc;
            }, {});
            const randomizedBallotMapping = (0, array_1.zipToRecord)((0, random_1.shuffled)(pollOptionKeys), pollOptionKeys);
            const ballot = models_1.Ballot.fromJSON({
                pollId: poll.id,
                id: poll.id + userId,
                createdAt: now.toDate(),
                updatedAt: now.toDate(),
                votes,
                ballotOptionMapping: randomizedBallotMapping,
                context: {
                    $case: "discord",
                    discord: {
                        userId,
                        userName,
                    },
                },
            });
            yield this.ballotCollection
                .doc(ballot.id)
                .set(models_1.Ballot.toJSON(ballot));
            return ballot;
        });
    }
    findBallot(pollId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let snapshot = yield this.ballotCollection
                .where("pollId", "==", pollId)
                .where("discord.userId", "==", userId)
                .get();
            if (snapshot.empty) {
                snapshot = yield this.ballotCollection
                    .where("pollId", "==", pollId)
                    .where("userId", "==", userId)
                    .get();
            }
            if (snapshot.empty)
                return;
            const data = snapshot.docs[0].data();
            if (!data)
                return;
            const ballot = models_1.Ballot.fromJSON(data);
            return ballot;
        });
    }
    updateBallot(ballotId, ballot) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = this.ballotCollection.doc(ballotId);
            yield doc.update(models_1.Ballot.toJSON(ballot));
            const snapshot = yield doc.get();
            if (!snapshot.exists)
                return;
            return models_1.Ballot.fromJSON(snapshot.data());
        });
    }
    listBallots(pollId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield this.ballotCollection
                .where("pollId", "==", pollId)
                .get();
            return snapshot.docs.map((doc) => models_1.Ballot.fromJSON(doc.data()));
        });
    }
    getUserDataMetrics(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const pollSnapshot = yield this.pollCollection
                .where("ownerId", "==", userId)
                .get();
            const numPolls = pollSnapshot.size;
            const ballotSnapshot = yield this.ballotCollection
                .where("userId", "==", userId)
                .get();
            const numBallots = ballotSnapshot.size;
            return {
                numPolls,
                numBallots,
            };
        });
    }
    deleteUserData(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const pollSnapshot = yield this.pollCollection
                .where("ownerId", "==", userId)
                .get();
            const ballotSnapshot = yield this.ballotCollection
                .where("userId", "==", userId)
                .get();
            const metrics = {
                numPolls: pollSnapshot.size,
                numBallots: ballotSnapshot.size,
            };
            const deletePollActions = pollSnapshot.docs.map((doc) => () => doc.ref.delete());
            const deleteBallotActions = ballotSnapshot.docs.map((doc) => () => doc.ref.delete());
            yield Actions_1.Actions.runAll(3, [...deletePollActions, ...deleteBallotActions]);
            return metrics;
        });
    }
}
exports.FirestoreStorage = FirestoreStorage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlyZXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2UvZmlyZXN0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBd0M7QUFDeEMsb0RBQTRCO0FBQzVCLHNDQWFtQjtBQUNuQix5Q0FBNEM7QUFDNUMsMkNBQTBDO0FBQzFDLDZDQUEwQztBQUUxQyxpQ0FBaUM7QUFDakMsa0RBQWlFO0FBR2pFLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztBQUV0QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7QUFFcEMsTUFBYSxnQkFBZ0I7SUFBN0I7UUFDRSxtQkFBYyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0MscUJBQWdCLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxvQkFBZSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsYUFBUSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUE2UGxELENBQUM7SUEzUGUsZUFBZTs7WUFDM0IsTUFBTSxTQUFTLEdBQVcsTUFBTSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQU8sQ0FBQyxFQUFFLEVBQUU7O2dCQUNuRSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3BELE1BQU0sU0FBUyxHQUFXLENBQUMsTUFBQSxNQUFBLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMENBQUUsS0FBSyxtQ0FBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVELENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7Z0JBQ3RELE9BQU8sU0FBUyxDQUFDO1lBQ25CLENBQUMsQ0FBQSxDQUFDLENBQUM7WUFDSCxPQUFPLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM5QixDQUFDO0tBQUE7SUFFSyxVQUFVLENBQUMsVUFBc0I7O1lBQ3JDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQU0sR0FBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxHQUFTLGVBQU8sQ0FBQyxRQUFRLGlDQUM3QixtQkFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQVMsS0FDekMsRUFBRSxFQUFFLE1BQU0sRUFDVixTQUFTLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUN2QixRQUFRLEVBQUUsR0FBRztxQkFDVixHQUFHLENBQ0YsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsb0JBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQy9ELE1BQU0sQ0FDUDtxQkFDQSxNQUFNLEVBQUUsRUFDWCxPQUFPLEVBQUUsRUFBRSxJQUNYLENBQUM7WUFDSCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUNsQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLG9CQUFXLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxvQkFBVyxDQUFDLFlBQVksQ0FDakUsQ0FBQztZQUNGLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFRLENBQUMsQ0FBQztZQUNwRSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7S0FBQTtJQUVLLE9BQU8sQ0FBQyxNQUFjOztZQUMxQixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzdELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsSUFBSTtnQkFBRSxPQUFPO1lBQ2xCLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDL0IsSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUU7Z0JBQ2pDLFNBQVMsR0FBRyxnQkFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNwRDtpQkFBTTtnQkFDTCxTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ2hDO1lBQ0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM3QixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRTtnQkFDaEMsUUFBUSxHQUFHLGdCQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQ2xEO2lCQUFNO2dCQUNMLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDOUI7WUFDRCxNQUFNLElBQUksR0FBRyxlQUFPLENBQUMsUUFBUSxpQ0FDdkIsYUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFTLEtBQzVDLFNBQVMsRUFBRSxTQUFTLEVBQ3BCLFFBQVEsRUFBRSxRQUFRLEVBQ2xCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxJQW9CdkIsQ0FBQztZQUNILElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQ2xDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssb0JBQVcsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLG9CQUFXLENBQUMsWUFBWSxDQUNuRSxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO0tBQUE7SUFFSyxVQUFVLENBQUMsTUFBYyxFQUFFLElBQVU7O1lBQ3pDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFRLENBQUMsQ0FBQztZQUN2RSxPQUFPLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQyxDQUFDO0tBQUE7SUFFSyxjQUFjLENBQUMsTUFBYzs7WUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCO2lCQUN6QyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7aUJBQzdCLE1BQU0sQ0FBQyxPQUFPLENBQUM7aUJBQ2YsR0FBRyxFQUFFLENBQUM7WUFDVCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsZUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3hFLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JDLEtBQUssTUFBTSxDQUFDLElBQUksS0FBSyxFQUFFO29CQUNyQixJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUU7d0JBQ1YsZ0JBQWdCLElBQUksQ0FBQyxDQUFDO3dCQUN0QixNQUFNO3FCQUNQO2lCQUNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPO2dCQUNMLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxNQUFNO2dCQUNoQyxnQkFBZ0I7YUFDakIsQ0FBQztRQUNKLENBQUM7S0FBQTtJQUVLLGFBQWE7O1lBQ2pCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMzRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEMsQ0FBQztLQUFBO0lBRUssWUFBWSxDQUFDLE9BQWU7O1lBQ2hDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDL0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3BCLE1BQU0sU0FBUyxHQUFHO29CQUNoQixFQUFFLEVBQUUsT0FBTztvQkFDWCxNQUFNLEVBQUUsRUFBRTtpQkFDWCxDQUFDO2dCQUNGLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdEMsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQTJCLENBQUM7UUFDbEQsQ0FBQztLQUFBO0lBRUssZUFBZSxDQUFDLFNBQW9COztZQUN4QyxNQUFNLElBQUksQ0FBQyxlQUFlO2lCQUN2QixHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztpQkFDakIsR0FBRyxDQUFDLGtCQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBUSxDQUFDLENBQUM7WUFDM0MsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztLQUFBO0lBRUssZUFBZSxDQUFDLE9BQWU7O1lBQ25DLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbkQsQ0FBQztLQUFBO0lBRUssWUFBWSxDQUNoQixJQUFVLEVBQ1YsRUFBRSxPQUFPLEVBQWdCOztZQUV6QixJQUFJLENBQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLEtBQUssTUFBSyxTQUFTO2dCQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7WUFDbkUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQU0sR0FBRSxDQUFDO1lBQ3JCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQy9DLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRztvQkFDVCxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7aUJBQzFCLENBQUM7Z0JBQ0YsT0FBTyxHQUFHLENBQUM7WUFDYixDQUFDLEVBQUUsRUFBaUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sdUJBQXVCLEdBQUcsSUFBQSxtQkFBVyxFQUN6QyxJQUFBLGlCQUFRLEVBQUMsY0FBYyxDQUFDLEVBQ3hCLGNBQWMsQ0FDMkIsQ0FBQztZQUM1QyxNQUFNLE1BQU0sR0FBVyxlQUFNLENBQUMsUUFBUSxDQUFDO2dCQUNyQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQ2YsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTTtnQkFDcEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3ZCLFNBQVMsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFO2dCQUN2QixLQUFLO2dCQUNMLG1CQUFtQixFQUFFLHVCQUF1QjtnQkFDNUMsT0FBTyxFQUFFO29CQUNQLEtBQUssRUFBRSxTQUFTO29CQUNoQixPQUFPLEVBQUU7d0JBQ1AsTUFBTTt3QkFDTixRQUFRO3FCQUNUO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxJQUFJLENBQUMsZ0JBQWdCO2lCQUN4QixHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztpQkFDZCxHQUFHLENBQUMsZUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQVEsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7S0FBQTtJQUVLLFVBQVUsQ0FDZCxNQUFjLEVBQ2QsTUFBYzs7WUFHZCxJQUFJLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0I7aUJBQ3ZDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztpQkFDN0IsS0FBSyxDQUFDLGdCQUFnQixFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7aUJBQ3JDLEdBQUcsRUFBRSxDQUFDO1lBQ1QsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFO2dCQUVsQixRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCO3FCQUNuQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7cUJBQzdCLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztxQkFDN0IsR0FBRyxFQUFFLENBQUM7YUFDVjtZQUNELElBQUksUUFBUSxDQUFDLEtBQUs7Z0JBQUUsT0FBTztZQUMzQixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxJQUFJO2dCQUFFLE9BQU87WUFDbEIsTUFBTSxNQUFNLEdBQUcsZUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO0tBQUE7SUFFSyxZQUFZLENBQ2hCLFFBQWdCLEVBQ2hCLE1BQWM7O1lBRWQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoRCxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQVEsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sUUFBUSxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtnQkFBRSxPQUFPO1lBQzdCLE9BQU8sZUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxQyxDQUFDO0tBQUE7SUFFSyxXQUFXLENBQUMsTUFBYzs7WUFDOUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCO2lCQUN6QyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7aUJBQzdCLEdBQUcsRUFBRSxDQUFDO1lBQ1QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsZUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7S0FBQTtJQUVLLGtCQUFrQixDQUFDLE1BQWM7O1lBQ3JDLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWM7aUJBQzNDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztpQkFDOUIsR0FBRyxFQUFFLENBQUM7WUFDVCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQ25DLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQjtpQkFDL0MsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDO2lCQUM3QixHQUFHLEVBQUUsQ0FBQztZQUNULE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDdkMsT0FBTztnQkFDTCxRQUFRO2dCQUNSLFVBQVU7YUFDWCxDQUFDO1FBQ0osQ0FBQztLQUFBO0lBRUssY0FBYyxDQUFDLE1BQWM7O1lBQ2pDLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWM7aUJBQzNDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztpQkFDOUIsR0FBRyxFQUFFLENBQUM7WUFDVCxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0I7aUJBQy9DLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztpQkFDN0IsR0FBRyxFQUFFLENBQUM7WUFDVCxNQUFNLE9BQU8sR0FBRztnQkFDZCxRQUFRLEVBQUUsWUFBWSxDQUFDLElBQUk7Z0JBQzNCLFVBQVUsRUFBRSxjQUFjLENBQUMsSUFBSTthQUNoQyxDQUFDO1lBQ0YsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FDN0MsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQ2hDLENBQUM7WUFDRixNQUFNLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUNqRCxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FDaEMsQ0FBQztZQUNGLE1BQU0saUJBQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxpQkFBaUIsRUFBRSxHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUN4RSxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO0tBQUE7Q0FDRjtBQWxRRCw0Q0FrUUMifQ==