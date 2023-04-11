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
            const poll = polls_1.PollDTO.fromJSON(Object.assign(Object.assign({}, models_1.PollConfig.toJSON(pollConfig)), { id: pollId, createdAt: now.toDate(), closesAt: now.add(3, "days").toDate(), ballots: {} }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlyZXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2UvZmlyZXN0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBd0M7QUFDeEMsb0RBQTRCO0FBQzVCLHNDQWFtQjtBQUNuQix5Q0FBNEM7QUFDNUMsMkNBQTBDO0FBQzFDLDZDQUEwQztBQUUxQyxpQ0FBaUM7QUFDakMsa0RBQWlFO0FBR2pFLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztBQUV0QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7QUFFcEMsTUFBYSxnQkFBZ0I7SUFBN0I7UUFDRSxtQkFBYyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0MscUJBQWdCLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxvQkFBZSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsYUFBUSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUF3UGxELENBQUM7SUF0UGUsZUFBZTs7WUFDM0IsTUFBTSxTQUFTLEdBQVcsTUFBTSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQU8sQ0FBQyxFQUFFLEVBQUU7O2dCQUNuRSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3BELE1BQU0sU0FBUyxHQUFXLENBQUMsTUFBQSxNQUFBLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMENBQUUsS0FBSyxtQ0FBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVELENB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