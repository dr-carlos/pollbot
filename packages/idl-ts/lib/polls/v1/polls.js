"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollsServiceClientImpl = exports.WebPollContextDTO = exports.DiscordPollContextDTO = exports.PollMetricsDTO = exports.PollDTO_BallotsEntry = exports.PollDTO_OptionsEntry = exports.PollDTO = exports.PollRequestDTO_OptionsEntry = exports.PollRequestDTO = exports.WebBallotContextDTO = exports.DiscordBallotContextDTO = exports.BallotDTO_BallotOptionMappingEntry = exports.BallotDTO_VotesEntry = exports.BallotDTO = exports.BallotRequestDTO = exports.VoteDTO = exports.DeletePollResponse = exports.DeletePollRequest = exports.UpdatePollResponse = exports.UpdatePollRequest = exports.CreatePollResponse = exports.CreatePollRequest = exports.ReadPollResponse = exports.ReadPollRequest = exports.pollFeatureDTOToJSON = exports.pollFeatureDTOFromJSON = exports.PollFeatureDTO = exports.protobufPackage = void 0;
const long_1 = __importDefault(require("long"));
const minimal_1 = __importDefault(require("protobufjs/minimal"));
const timestamp_1 = require("../../google/protobuf/timestamp");
const discord_1 = require("../../discord/v1/discord");
exports.protobufPackage = "polls";
var PollFeatureDTO;
(function (PollFeatureDTO) {
    PollFeatureDTO[PollFeatureDTO["UNKNOWN"] = 0] = "UNKNOWN";
    PollFeatureDTO[PollFeatureDTO["DISABLE_RANDOMIZED_BALLOTS"] = 1] = "DISABLE_RANDOMIZED_BALLOTS";
    PollFeatureDTO[PollFeatureDTO["DISABLE_ANYTIME_RESULTS"] = 2] = "DISABLE_ANYTIME_RESULTS";
    PollFeatureDTO[PollFeatureDTO["DISABLE_PREFERENCES"] = 3] = "DISABLE_PREFERENCES";
    PollFeatureDTO[PollFeatureDTO["RANKED_PAIRS"] = 4] = "RANKED_PAIRS";
    PollFeatureDTO[PollFeatureDTO["ELECTION_POLL"] = 5] = "ELECTION_POLL";
    PollFeatureDTO[PollFeatureDTO["SENT_ELECTION_DMS"] = 6] = "SENT_ELECTION_DMS";
    PollFeatureDTO[PollFeatureDTO["UNRECOGNIZED"] = -1] = "UNRECOGNIZED";
})(PollFeatureDTO = exports.PollFeatureDTO || (exports.PollFeatureDTO = {}));
function pollFeatureDTOFromJSON(object) {
    switch (object) {
        case 0:
        case "UNKNOWN":
            return PollFeatureDTO.UNKNOWN;
        case 1:
        case "DISABLE_RANDOMIZED_BALLOTS":
            return PollFeatureDTO.DISABLE_RANDOMIZED_BALLOTS;
        case 2:
        case "DISABLE_ANYTIME_RESULTS":
            return PollFeatureDTO.DISABLE_ANYTIME_RESULTS;
        case 3:
        case "DISABLE_PREFERENCES":
            return PollFeatureDTO.DISABLE_PREFERENCES;
        case 4:
        case "RANKED_PAIRS":
            return PollFeatureDTO.RANKED_PAIRS;
        case 5:
        case "ELECTION_POLL":
            return PollFeatureDTO.ELECTION_POLL;
        case 6:
        case "SENT_ELECTION_DMS":
            return PollFeatureDTO.SENT_ELECTION_DMS;
        case -1:
        case "UNRECOGNIZED":
        default:
            return PollFeatureDTO.UNRECOGNIZED;
    }
}
exports.pollFeatureDTOFromJSON = pollFeatureDTOFromJSON;
function pollFeatureDTOToJSON(object) {
    switch (object) {
        case PollFeatureDTO.UNKNOWN:
            return "UNKNOWN";
        case PollFeatureDTO.DISABLE_RANDOMIZED_BALLOTS:
            return "DISABLE_RANDOMIZED_BALLOTS";
        case PollFeatureDTO.DISABLE_ANYTIME_RESULTS:
            return "DISABLE_ANYTIME_RESULTS";
        case PollFeatureDTO.DISABLE_PREFERENCES:
            return "DISABLE_PREFERENCES";
        case PollFeatureDTO.RANKED_PAIRS:
            return "RANKED_PAIRS";
        case PollFeatureDTO.ELECTION_POLL:
            return "ELECTION_POLL";
        case PollFeatureDTO.SENT_ELECTION_DMS:
            return "SENT_ELECTION_DMS";
        default:
            return "UNKNOWN";
    }
}
exports.pollFeatureDTOToJSON = pollFeatureDTOToJSON;
class CollectionDTO extends Map {
    find(fn, thisArg) {
        if (typeof fn !== "function")
            throw new TypeError(`${fn} is not a function`);
        if (typeof thisArg !== "undefined")
            fn = fn.bind(thisArg);
        for (const [key, val] of this) {
            if (fn(val, key, this))
                return val;
        }
        return undefined;
    }
}
function createBaseReadPollRequest() {
    return { id: "" };
}
exports.ReadPollRequest = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.id !== "") {
            writer.uint32(10).string(message.id);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseReadPollRequest();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            id: isSet(object.id) ? String(object.id) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.id !== undefined && (obj.id = message.id);
        return obj;
    },
    fromPartial(object) {
        var _a;
        const message = createBaseReadPollRequest();
        message.id = (_a = object.id) !== null && _a !== void 0 ? _a : "";
        return message;
    },
};
function createBaseReadPollResponse() {
    return { poll: undefined };
}
exports.ReadPollResponse = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.poll !== undefined) {
            exports.PollDTO.encode(message.poll, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseReadPollResponse();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.poll = exports.PollDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            poll: isSet(object.poll) ? exports.PollDTO.fromJSON(object.poll) : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.poll !== undefined &&
            (obj.poll = message.poll ? exports.PollDTO.toJSON(message.poll) : undefined);
        return obj;
    },
    fromPartial(object) {
        const message = createBaseReadPollResponse();
        message.poll =
            object.poll !== undefined && object.poll !== null
                ? exports.PollDTO.fromPartial(object.poll)
                : undefined;
        return message;
    },
};
function createBaseCreatePollRequest() {
    return { pollRequest: undefined };
}
exports.CreatePollRequest = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.pollRequest !== undefined) {
            exports.PollRequestDTO.encode(message.pollRequest, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseCreatePollRequest();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.pollRequest = exports.PollRequestDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            pollRequest: isSet(object.pollRequest)
                ? exports.PollRequestDTO.fromJSON(object.pollRequest)
                : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.pollRequest !== undefined &&
            (obj.pollRequest = message.pollRequest
                ? exports.PollRequestDTO.toJSON(message.pollRequest)
                : undefined);
        return obj;
    },
    fromPartial(object) {
        const message = createBaseCreatePollRequest();
        message.pollRequest =
            object.pollRequest !== undefined && object.pollRequest !== null
                ? exports.PollRequestDTO.fromPartial(object.pollRequest)
                : undefined;
        return message;
    },
};
function createBaseCreatePollResponse() {
    return { poll: undefined };
}
exports.CreatePollResponse = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.poll !== undefined) {
            exports.PollDTO.encode(message.poll, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseCreatePollResponse();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.poll = exports.PollDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            poll: isSet(object.poll) ? exports.PollDTO.fromJSON(object.poll) : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.poll !== undefined &&
            (obj.poll = message.poll ? exports.PollDTO.toJSON(message.poll) : undefined);
        return obj;
    },
    fromPartial(object) {
        const message = createBaseCreatePollResponse();
        message.poll =
            object.poll !== undefined && object.poll !== null
                ? exports.PollDTO.fromPartial(object.poll)
                : undefined;
        return message;
    },
};
function createBaseUpdatePollRequest() {
    return { pollRequest: undefined };
}
exports.UpdatePollRequest = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.pollRequest !== undefined) {
            exports.PollRequestDTO.encode(message.pollRequest, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUpdatePollRequest();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.pollRequest = exports.PollRequestDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            pollRequest: isSet(object.pollRequest)
                ? exports.PollRequestDTO.fromJSON(object.pollRequest)
                : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.pollRequest !== undefined &&
            (obj.pollRequest = message.pollRequest
                ? exports.PollRequestDTO.toJSON(message.pollRequest)
                : undefined);
        return obj;
    },
    fromPartial(object) {
        const message = createBaseUpdatePollRequest();
        message.pollRequest =
            object.pollRequest !== undefined && object.pollRequest !== null
                ? exports.PollRequestDTO.fromPartial(object.pollRequest)
                : undefined;
        return message;
    },
};
function createBaseUpdatePollResponse() {
    return { poll: undefined };
}
exports.UpdatePollResponse = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.poll !== undefined) {
            exports.PollDTO.encode(message.poll, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUpdatePollResponse();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.poll = exports.PollDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            poll: isSet(object.poll) ? exports.PollDTO.fromJSON(object.poll) : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.poll !== undefined &&
            (obj.poll = message.poll ? exports.PollDTO.toJSON(message.poll) : undefined);
        return obj;
    },
    fromPartial(object) {
        const message = createBaseUpdatePollResponse();
        message.poll =
            object.poll !== undefined && object.poll !== null
                ? exports.PollDTO.fromPartial(object.poll)
                : undefined;
        return message;
    },
};
function createBaseDeletePollRequest() {
    return { pollId: "" };
}
exports.DeletePollRequest = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.pollId !== "") {
            writer.uint32(10).string(message.pollId);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseDeletePollRequest();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.pollId = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            pollId: isSet(object.pollId) ? String(object.pollId) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.pollId !== undefined && (obj.pollId = message.pollId);
        return obj;
    },
    fromPartial(object) {
        var _a;
        const message = createBaseDeletePollRequest();
        message.pollId = (_a = object.pollId) !== null && _a !== void 0 ? _a : "";
        return message;
    },
};
function createBaseDeletePollResponse() {
    return { poll: undefined };
}
exports.DeletePollResponse = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.poll !== undefined) {
            exports.PollDTO.encode(message.poll, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseDeletePollResponse();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.poll = exports.PollDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            poll: isSet(object.poll) ? exports.PollDTO.fromJSON(object.poll) : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.poll !== undefined &&
            (obj.poll = message.poll ? exports.PollDTO.toJSON(message.poll) : undefined);
        return obj;
    },
    fromPartial(object) {
        const message = createBaseDeletePollResponse();
        message.poll =
            object.poll !== undefined && object.poll !== null
                ? exports.PollDTO.fromPartial(object.poll)
                : undefined;
        return message;
    },
};
function createBaseVoteDTO() {
    return { option: "", rank: undefined };
}
exports.VoteDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.option !== "") {
            writer.uint32(10).string(message.option);
        }
        if (message.rank !== undefined) {
            writer.uint32(16).int32(message.rank);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseVoteDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.option = reader.string();
                    break;
                case 2:
                    message.rank = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            option: isSet(object.option) ? String(object.option) : "",
            rank: isSet(object.rank) ? Number(object.rank) : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.option !== undefined && (obj.option = message.option);
        message.rank !== undefined && (obj.rank = Math.round(message.rank));
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBaseVoteDTO();
        message.option = (_a = object.option) !== null && _a !== void 0 ? _a : "";
        message.rank = (_b = object.rank) !== null && _b !== void 0 ? _b : undefined;
        return message;
    },
};
function createBaseBallotRequestDTO() {
    return { pollId: "", context: undefined };
}
exports.BallotRequestDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        var _a, _b;
        if (message.pollId !== "") {
            writer.uint32(10).string(message.pollId);
        }
        if (((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord") {
            exports.DiscordBallotContextDTO.encode(message.context.discord, writer.uint32(18).fork()).ldelim();
        }
        if (((_b = message.context) === null || _b === void 0 ? void 0 : _b.$case) === "web") {
            exports.WebBallotContextDTO.encode(message.context.web, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBallotRequestDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.pollId = reader.string();
                    break;
                case 2:
                    message.context = {
                        $case: "discord",
                        discord: exports.DiscordBallotContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                case 3:
                    message.context = {
                        $case: "web",
                        web: exports.WebBallotContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            pollId: isSet(object.pollId) ? String(object.pollId) : "",
            context: isSet(object.discord)
                ? {
                    $case: "discord",
                    discord: exports.DiscordBallotContextDTO.fromJSON(object.discord),
                }
                : isSet(object.web)
                    ? { $case: "web", web: exports.WebBallotContextDTO.fromJSON(object.web) }
                    : undefined,
        };
    },
    toJSON(message) {
        var _a, _b, _c, _d, _e, _f;
        const obj = {};
        message.pollId !== undefined && (obj.pollId = message.pollId);
        ((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord" &&
            (obj.discord = ((_b = message.context) === null || _b === void 0 ? void 0 : _b.discord)
                ? exports.DiscordBallotContextDTO.toJSON((_c = message.context) === null || _c === void 0 ? void 0 : _c.discord)
                : undefined);
        ((_d = message.context) === null || _d === void 0 ? void 0 : _d.$case) === "web" &&
            (obj.web = ((_e = message.context) === null || _e === void 0 ? void 0 : _e.web)
                ? exports.WebBallotContextDTO.toJSON((_f = message.context) === null || _f === void 0 ? void 0 : _f.web)
                : undefined);
        return obj;
    },
    fromPartial(object) {
        var _a, _b, _c, _d, _e, _f, _g;
        const message = createBaseBallotRequestDTO();
        message.pollId = (_a = object.pollId) !== null && _a !== void 0 ? _a : "";
        if (((_b = object.context) === null || _b === void 0 ? void 0 : _b.$case) === "discord" &&
            ((_c = object.context) === null || _c === void 0 ? void 0 : _c.discord) !== undefined &&
            ((_d = object.context) === null || _d === void 0 ? void 0 : _d.discord) !== null) {
            message.context = {
                $case: "discord",
                discord: exports.DiscordBallotContextDTO.fromPartial(object.context.discord),
            };
        }
        if (((_e = object.context) === null || _e === void 0 ? void 0 : _e.$case) === "web" &&
            ((_f = object.context) === null || _f === void 0 ? void 0 : _f.web) !== undefined &&
            ((_g = object.context) === null || _g === void 0 ? void 0 : _g.web) !== null) {
            message.context = {
                $case: "web",
                web: exports.WebBallotContextDTO.fromPartial(object.context.web),
            };
        }
        return message;
    },
};
function createBaseBallotDTO() {
    return {
        id: "",
        pollId: "",
        userId: undefined,
        userName: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        votes: {},
        ballotOptionMapping: {},
        context: undefined,
    };
}
exports.BallotDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        var _a, _b;
        if (message.id !== "") {
            writer.uint32(10).string(message.id);
        }
        if (message.pollId !== "") {
            writer.uint32(18).string(message.pollId);
        }
        if (message.userId !== undefined) {
            writer.uint32(26).string(message.userId);
        }
        if (message.userName !== undefined) {
            writer.uint32(34).string(message.userName);
        }
        if (message.createdAt !== undefined) {
            timestamp_1.Timestamp.encode(toTimestamp(message.createdAt), writer.uint32(42).fork()).ldelim();
        }
        if (message.updatedAt !== undefined) {
            timestamp_1.Timestamp.encode(toTimestamp(message.updatedAt), writer.uint32(50).fork()).ldelim();
        }
        Object.entries(message.votes).forEach(([key, value]) => {
            exports.BallotDTO_VotesEntry.encode({ key: key, value }, writer.uint32(58).fork()).ldelim();
        });
        Object.entries(message.ballotOptionMapping).forEach(([key, value]) => {
            exports.BallotDTO_BallotOptionMappingEntry.encode({ key: key, value }, writer.uint32(66).fork()).ldelim();
        });
        if (((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord") {
            exports.DiscordBallotContextDTO.encode(message.context.discord, writer.uint32(74).fork()).ldelim();
        }
        if (((_b = message.context) === null || _b === void 0 ? void 0 : _b.$case) === "web") {
            exports.WebBallotContextDTO.encode(message.context.web, writer.uint32(82).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBallotDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.string();
                    break;
                case 2:
                    message.pollId = reader.string();
                    break;
                case 3:
                    message.userId = reader.string();
                    break;
                case 4:
                    message.userName = reader.string();
                    break;
                case 5:
                    message.createdAt = fromTimestamp(timestamp_1.Timestamp.decode(reader, reader.uint32()));
                    break;
                case 6:
                    message.updatedAt = fromTimestamp(timestamp_1.Timestamp.decode(reader, reader.uint32()));
                    break;
                case 7:
                    const entry7 = exports.BallotDTO_VotesEntry.decode(reader, reader.uint32());
                    if (entry7.value !== undefined) {
                        message.votes[entry7.key] = entry7.value;
                    }
                    break;
                case 8:
                    const entry8 = exports.BallotDTO_BallotOptionMappingEntry.decode(reader, reader.uint32());
                    if (entry8.value !== undefined) {
                        message.ballotOptionMapping[entry8.key] = entry8.value;
                    }
                    break;
                case 9:
                    message.context = {
                        $case: "discord",
                        discord: exports.DiscordBallotContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                case 10:
                    message.context = {
                        $case: "web",
                        web: exports.WebBallotContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            id: isSet(object.id) ? String(object.id) : "",
            pollId: isSet(object.pollId) ? String(object.pollId) : "",
            userId: isSet(object.userId) ? String(object.userId) : undefined,
            userName: isSet(object.userName) ? String(object.userName) : undefined,
            createdAt: isSet(object.createdAt)
                ? fromJsonTimestamp(object.createdAt)
                : undefined,
            updatedAt: isSet(object.updatedAt)
                ? fromJsonTimestamp(object.updatedAt)
                : undefined,
            votes: isObject(object.votes)
                ? Object.entries(object.votes).reduce((acc, [key, value]) => {
                    acc[key] = exports.VoteDTO.fromJSON(value);
                    return acc;
                }, {})
                : {},
            ballotOptionMapping: isObject(object.ballotOptionMapping)
                ? Object.entries(object.ballotOptionMapping).reduce((acc, [key, value]) => {
                    acc[key] = String(value);
                    return acc;
                }, {})
                : {},
            context: isSet(object.discord)
                ? {
                    $case: "discord",
                    discord: exports.DiscordBallotContextDTO.fromJSON(object.discord),
                }
                : isSet(object.web)
                    ? { $case: "web", web: exports.WebBallotContextDTO.fromJSON(object.web) }
                    : undefined,
        };
    },
    toJSON(message) {
        var _a, _b, _c, _d, _e, _f;
        const obj = {};
        message.id !== undefined && (obj.id = message.id);
        message.pollId !== undefined && (obj.pollId = message.pollId);
        message.userId !== undefined && (obj.userId = message.userId);
        message.userName !== undefined && (obj.userName = message.userName);
        message.createdAt !== undefined &&
            (obj.createdAt = message.createdAt.toISOString());
        message.updatedAt !== undefined &&
            (obj.updatedAt = message.updatedAt.toISOString());
        obj.votes = {};
        if (message.votes) {
            Object.entries(message.votes).forEach(([k, v]) => {
                obj.votes[k] = exports.VoteDTO.toJSON(v);
            });
        }
        obj.ballotOptionMapping = {};
        if (message.ballotOptionMapping) {
            Object.entries(message.ballotOptionMapping).forEach(([k, v]) => {
                obj.ballotOptionMapping[k] = v;
            });
        }
        ((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord" &&
            (obj.discord = ((_b = message.context) === null || _b === void 0 ? void 0 : _b.discord)
                ? exports.DiscordBallotContextDTO.toJSON((_c = message.context) === null || _c === void 0 ? void 0 : _c.discord)
                : undefined);
        ((_d = message.context) === null || _d === void 0 ? void 0 : _d.$case) === "web" &&
            (obj.web = ((_e = message.context) === null || _e === void 0 ? void 0 : _e.web)
                ? exports.WebBallotContextDTO.toJSON((_f = message.context) === null || _f === void 0 ? void 0 : _f.web)
                : undefined);
        return obj;
    },
    fromPartial(object) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const message = createBaseBallotDTO();
        message.id = (_a = object.id) !== null && _a !== void 0 ? _a : "";
        message.pollId = (_b = object.pollId) !== null && _b !== void 0 ? _b : "";
        message.userId = (_c = object.userId) !== null && _c !== void 0 ? _c : undefined;
        message.userName = (_d = object.userName) !== null && _d !== void 0 ? _d : undefined;
        message.createdAt = (_e = object.createdAt) !== null && _e !== void 0 ? _e : undefined;
        message.updatedAt = (_f = object.updatedAt) !== null && _f !== void 0 ? _f : undefined;
        message.votes = Object.entries((_g = object.votes) !== null && _g !== void 0 ? _g : {}).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = exports.VoteDTO.fromPartial(value);
            }
            return acc;
        }, {});
        message.ballotOptionMapping = Object.entries((_h = object.ballotOptionMapping) !== null && _h !== void 0 ? _h : {}).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = String(value);
            }
            return acc;
        }, {});
        if (((_j = object.context) === null || _j === void 0 ? void 0 : _j.$case) === "discord" &&
            ((_k = object.context) === null || _k === void 0 ? void 0 : _k.discord) !== undefined &&
            ((_l = object.context) === null || _l === void 0 ? void 0 : _l.discord) !== null) {
            message.context = {
                $case: "discord",
                discord: exports.DiscordBallotContextDTO.fromPartial(object.context.discord),
            };
        }
        if (((_m = object.context) === null || _m === void 0 ? void 0 : _m.$case) === "web" &&
            ((_o = object.context) === null || _o === void 0 ? void 0 : _o.web) !== undefined &&
            ((_p = object.context) === null || _p === void 0 ? void 0 : _p.web) !== null) {
            message.context = {
                $case: "web",
                web: exports.WebBallotContextDTO.fromPartial(object.context.web),
            };
        }
        return message;
    },
};
function createBaseBallotDTO_VotesEntry() {
    return { key: "", value: undefined };
}
exports.BallotDTO_VotesEntry = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== undefined) {
            exports.VoteDTO.encode(message.value, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBallotDTO_VotesEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.key = reader.string();
                    break;
                case 2:
                    message.value = exports.VoteDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            key: isSet(object.key) ? String(object.key) : "",
            value: isSet(object.value) ? exports.VoteDTO.fromJSON(object.value) : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.key !== undefined && (obj.key = message.key);
        message.value !== undefined &&
            (obj.value = message.value ? exports.VoteDTO.toJSON(message.value) : undefined);
        return obj;
    },
    fromPartial(object) {
        var _a;
        const message = createBaseBallotDTO_VotesEntry();
        message.key = (_a = object.key) !== null && _a !== void 0 ? _a : "";
        message.value =
            object.value !== undefined && object.value !== null
                ? exports.VoteDTO.fromPartial(object.value)
                : undefined;
        return message;
    },
};
function createBaseBallotDTO_BallotOptionMappingEntry() {
    return { key: "", value: "" };
}
exports.BallotDTO_BallotOptionMappingEntry = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBallotDTO_BallotOptionMappingEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.key = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            key: isSet(object.key) ? String(object.key) : "",
            value: isSet(object.value) ? String(object.value) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.key !== undefined && (obj.key = message.key);
        message.value !== undefined && (obj.value = message.value);
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBaseBallotDTO_BallotOptionMappingEntry();
        message.key = (_a = object.key) !== null && _a !== void 0 ? _a : "";
        message.value = (_b = object.value) !== null && _b !== void 0 ? _b : "";
        return message;
    },
};
function createBaseDiscordBallotContextDTO() {
    return { userId: "", userName: "" };
}
exports.DiscordBallotContextDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.userId !== "") {
            writer.uint32(10).string(message.userId);
        }
        if (message.userName !== "") {
            writer.uint32(18).string(message.userName);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseDiscordBallotContextDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.string();
                    break;
                case 2:
                    message.userName = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            userId: isSet(object.userId) ? String(object.userId) : "",
            userName: isSet(object.userName) ? String(object.userName) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.userId !== undefined && (obj.userId = message.userId);
        message.userName !== undefined && (obj.userName = message.userName);
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBaseDiscordBallotContextDTO();
        message.userId = (_a = object.userId) !== null && _a !== void 0 ? _a : "";
        message.userName = (_b = object.userName) !== null && _b !== void 0 ? _b : "";
        return message;
    },
};
function createBaseWebBallotContextDTO() {
    return { userId: "", userName: "" };
}
exports.WebBallotContextDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.userId !== "") {
            writer.uint32(10).string(message.userId);
        }
        if (message.userName !== "") {
            writer.uint32(18).string(message.userName);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWebBallotContextDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.string();
                    break;
                case 2:
                    message.userName = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            userId: isSet(object.userId) ? String(object.userId) : "",
            userName: isSet(object.userName) ? String(object.userName) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.userId !== undefined && (obj.userId = message.userId);
        message.userName !== undefined && (obj.userName = message.userName);
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBaseWebBallotContextDTO();
        message.userId = (_a = object.userId) !== null && _a !== void 0 ? _a : "";
        message.userName = (_b = object.userName) !== null && _b !== void 0 ? _b : "";
        return message;
    },
};
function createBasePollRequestDTO() {
    return { topic: "", options: {}, features: [], context: undefined };
}
exports.PollRequestDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        var _a, _b;
        if (message.topic !== "") {
            writer.uint32(10).string(message.topic);
        }
        Object.entries(message.options).forEach(([key, value]) => {
            exports.PollRequestDTO_OptionsEntry.encode({ key: key, value }, writer.uint32(18).fork()).ldelim();
        });
        writer.uint32(26).fork();
        for (const v of message.features) {
            writer.int32(v);
        }
        writer.ldelim();
        if (((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord") {
            exports.DiscordPollContextDTO.encode(message.context.discord, writer.uint32(34).fork()).ldelim();
        }
        if (((_b = message.context) === null || _b === void 0 ? void 0 : _b.$case) === "web") {
            exports.WebPollContextDTO.encode(message.context.web, writer.uint32(42).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePollRequestDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.topic = reader.string();
                    break;
                case 2:
                    const entry2 = exports.PollRequestDTO_OptionsEntry.decode(reader, reader.uint32());
                    if (entry2.value !== undefined) {
                        message.options[entry2.key] = entry2.value;
                    }
                    break;
                case 3:
                    if ((tag & 7) === 2) {
                        const end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2) {
                            message.features.push(reader.int32());
                        }
                    }
                    else {
                        message.features.push(reader.int32());
                    }
                    break;
                case 4:
                    message.context = {
                        $case: "discord",
                        discord: exports.DiscordPollContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                case 5:
                    message.context = {
                        $case: "web",
                        web: exports.WebPollContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            topic: isSet(object.topic) ? String(object.topic) : "",
            options: isObject(object.options)
                ? Object.entries(object.options).reduce((acc, [key, value]) => {
                    acc[key] = String(value);
                    return acc;
                }, {})
                : {},
            features: Array.isArray(object === null || object === void 0 ? void 0 : object.features)
                ? object.features.map((e) => pollFeatureDTOFromJSON(e))
                : [],
            context: isSet(object.discord)
                ? {
                    $case: "discord",
                    discord: exports.DiscordPollContextDTO.fromJSON(object.discord),
                }
                : isSet(object.web)
                    ? { $case: "web", web: exports.WebPollContextDTO.fromJSON(object.web) }
                    : undefined,
        };
    },
    toJSON(message) {
        var _a, _b, _c, _d, _e, _f;
        const obj = {};
        message.topic !== undefined && (obj.topic = message.topic);
        obj.options = {};
        if (message.options) {
            Object.entries(message.options).forEach(([k, v]) => {
                obj.options[k] = v;
            });
        }
        if (message.features) {
            obj.features = message.features.map((e) => pollFeatureDTOToJSON(e));
        }
        else {
            obj.features = [];
        }
        ((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord" &&
            (obj.discord = ((_b = message.context) === null || _b === void 0 ? void 0 : _b.discord)
                ? exports.DiscordPollContextDTO.toJSON((_c = message.context) === null || _c === void 0 ? void 0 : _c.discord)
                : undefined);
        ((_d = message.context) === null || _d === void 0 ? void 0 : _d.$case) === "web" &&
            (obj.web = ((_e = message.context) === null || _e === void 0 ? void 0 : _e.web)
                ? exports.WebPollContextDTO.toJSON((_f = message.context) === null || _f === void 0 ? void 0 : _f.web)
                : undefined);
        return obj;
    },
    fromPartial(object) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const message = createBasePollRequestDTO();
        message.topic = (_a = object.topic) !== null && _a !== void 0 ? _a : "";
        message.options = Object.entries((_b = object.options) !== null && _b !== void 0 ? _b : {}).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = String(value);
            }
            return acc;
        }, {});
        message.features = ((_c = object.features) === null || _c === void 0 ? void 0 : _c.map((e) => e)) || [];
        if (((_d = object.context) === null || _d === void 0 ? void 0 : _d.$case) === "discord" &&
            ((_e = object.context) === null || _e === void 0 ? void 0 : _e.discord) !== undefined &&
            ((_f = object.context) === null || _f === void 0 ? void 0 : _f.discord) !== null) {
            message.context = {
                $case: "discord",
                discord: exports.DiscordPollContextDTO.fromPartial(object.context.discord),
            };
        }
        if (((_g = object.context) === null || _g === void 0 ? void 0 : _g.$case) === "web" &&
            ((_h = object.context) === null || _h === void 0 ? void 0 : _h.web) !== undefined &&
            ((_j = object.context) === null || _j === void 0 ? void 0 : _j.web) !== null) {
            message.context = {
                $case: "web",
                web: exports.WebPollContextDTO.fromPartial(object.context.web),
            };
        }
        return message;
    },
};
function createBasePollRequestDTO_OptionsEntry() {
    return { key: "", value: "" };
}
exports.PollRequestDTO_OptionsEntry = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePollRequestDTO_OptionsEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.key = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            key: isSet(object.key) ? String(object.key) : "",
            value: isSet(object.value) ? String(object.value) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.key !== undefined && (obj.key = message.key);
        message.value !== undefined && (obj.value = message.value);
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBasePollRequestDTO_OptionsEntry();
        message.key = (_a = object.key) !== null && _a !== void 0 ? _a : "";
        message.value = (_b = object.value) !== null && _b !== void 0 ? _b : "";
        return message;
    },
};
function createBasePollDTO() {
    return {
        id: "",
        guildId: undefined,
        ownerId: undefined,
        createdAt: undefined,
        closesAt: undefined,
        topic: "",
        options: {},
        ballots: {},
        features: [],
        messageRef: undefined,
        context: undefined,
    };
}
exports.PollDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        var _a, _b;
        if (message.id !== "") {
            writer.uint32(10).string(message.id);
        }
        if (message.guildId !== undefined) {
            writer.uint32(18).string(message.guildId);
        }
        if (message.ownerId !== undefined) {
            writer.uint32(26).string(message.ownerId);
        }
        if (message.createdAt !== undefined) {
            timestamp_1.Timestamp.encode(toTimestamp(message.createdAt), writer.uint32(34).fork()).ldelim();
        }
        if (message.closesAt !== undefined) {
            timestamp_1.Timestamp.encode(toTimestamp(message.closesAt), writer.uint32(42).fork()).ldelim();
        }
        if (message.topic !== "") {
            writer.uint32(50).string(message.topic);
        }
        Object.entries(message.options).forEach(([key, value]) => {
            exports.PollDTO_OptionsEntry.encode({ key: key, value }, writer.uint32(58).fork()).ldelim();
        });
        Object.entries(message.ballots).forEach(([key, value]) => {
            exports.PollDTO_BallotsEntry.encode({ key: key, value }, writer.uint32(66).fork()).ldelim();
        });
        writer.uint32(74).fork();
        for (const v of message.features) {
            writer.int32(v);
        }
        writer.ldelim();
        if (message.messageRef !== undefined) {
            discord_1.MessageRefDTO.encode(message.messageRef, writer.uint32(82).fork()).ldelim();
        }
        if (((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord") {
            exports.DiscordPollContextDTO.encode(message.context.discord, writer.uint32(90).fork()).ldelim();
        }
        if (((_b = message.context) === null || _b === void 0 ? void 0 : _b.$case) === "web") {
            exports.WebPollContextDTO.encode(message.context.web, writer.uint32(98).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePollDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.string();
                    break;
                case 2:
                    message.guildId = reader.string();
                    break;
                case 3:
                    message.ownerId = reader.string();
                    break;
                case 4:
                    message.createdAt = fromTimestamp(timestamp_1.Timestamp.decode(reader, reader.uint32()));
                    break;
                case 5:
                    message.closesAt = fromTimestamp(timestamp_1.Timestamp.decode(reader, reader.uint32()));
                    break;
                case 6:
                    message.topic = reader.string();
                    break;
                case 7:
                    const entry7 = exports.PollDTO_OptionsEntry.decode(reader, reader.uint32());
                    if (entry7.value !== undefined) {
                        message.options[entry7.key] = entry7.value;
                    }
                    break;
                case 8:
                    const entry8 = exports.PollDTO_BallotsEntry.decode(reader, reader.uint32());
                    if (entry8.value !== undefined) {
                        message.ballots[entry8.key] = entry8.value;
                    }
                    break;
                case 9:
                    if ((tag & 7) === 2) {
                        const end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2) {
                            message.features.push(reader.int32());
                        }
                    }
                    else {
                        message.features.push(reader.int32());
                    }
                    break;
                case 10:
                    message.messageRef = discord_1.MessageRefDTO.decode(reader, reader.uint32());
                    break;
                case 11:
                    message.context = {
                        $case: "discord",
                        discord: exports.DiscordPollContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                case 12:
                    message.context = {
                        $case: "web",
                        web: exports.WebPollContextDTO.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            id: isSet(object.id) ? String(object.id) : "",
            guildId: isSet(object.guildId) ? String(object.guildId) : undefined,
            ownerId: isSet(object.ownerId) ? String(object.ownerId) : undefined,
            createdAt: isSet(object.createdAt)
                ? fromJsonTimestamp(object.createdAt)
                : undefined,
            closesAt: isSet(object.closesAt)
                ? fromJsonTimestamp(object.closesAt)
                : undefined,
            topic: isSet(object.topic) ? String(object.topic) : "",
            roleCache: isSet(object.roleCache)
                ? new CollectionDTO(JSON.parse(object.roleCache))
                : undefined,
            options: isObject(object.options)
                ? Object.entries(object.options).reduce((acc, [key, value]) => {
                    acc[key] = String(value);
                    return acc;
                }, {})
                : {},
            ballots: isObject(object.ballots)
                ? Object.entries(object.ballots).reduce((acc, [key, value]) => {
                    acc[key] = exports.BallotDTO.fromJSON(value);
                    return acc;
                }, {})
                : {},
            features: Array.isArray(object === null || object === void 0 ? void 0 : object.features)
                ? object.features.map((e) => pollFeatureDTOFromJSON(e))
                : [],
            messageRef: isSet(object.messageRef)
                ? discord_1.MessageRefDTO.fromJSON(object.messageRef)
                : undefined,
            context: isSet(object.discord)
                ? {
                    $case: "discord",
                    discord: exports.DiscordPollContextDTO.fromJSON(object.discord),
                }
                : isSet(object.web)
                    ? { $case: "web", web: exports.WebPollContextDTO.fromJSON(object.web) }
                    : undefined,
        };
    },
    toJSON(message) {
        var _a, _b, _c, _d, _e, _f;
        const obj = {};
        message.id !== undefined && (obj.id = message.id);
        message.guildId !== undefined && (obj.guildId = message.guildId);
        message.ownerId !== undefined && (obj.ownerId = message.ownerId);
        message.createdAt !== undefined &&
            (obj.createdAt = message.createdAt.toISOString());
        message.closesAt !== undefined &&
            (obj.closesAt = message.closesAt.toISOString());
        message.topic !== undefined && (obj.topic = message.topic);
        message.roleCache !== undefined &&
            (obj.roleCache = JSON.stringify(Array.from(message.roleCache.entries()).map((entry) => [
                entry[0],
                Object.assign(Object.assign({}, (typeof entry[1].toJSON !== "undefined"
                    ? entry[1].toJSON()
                    : entry[1])), { members: entry[1].members }),
            ])));
        obj.options = {};
        if (message.options) {
            Object.entries(message.options).forEach(([k, v]) => {
                obj.options[k] = v;
            });
        }
        obj.ballots = {};
        if (message.ballots) {
            Object.entries(message.ballots).forEach(([k, v]) => {
                obj.ballots[k] = exports.BallotDTO.toJSON(v);
            });
        }
        if (message.features) {
            obj.features = message.features.map((e) => pollFeatureDTOToJSON(e));
        }
        else {
            obj.features = [];
        }
        message.messageRef !== undefined &&
            (obj.messageRef = message.messageRef
                ? discord_1.MessageRefDTO.toJSON(message.messageRef)
                : undefined);
        ((_a = message.context) === null || _a === void 0 ? void 0 : _a.$case) === "discord" &&
            (obj.discord = ((_b = message.context) === null || _b === void 0 ? void 0 : _b.discord)
                ? exports.DiscordPollContextDTO.toJSON((_c = message.context) === null || _c === void 0 ? void 0 : _c.discord)
                : undefined);
        ((_d = message.context) === null || _d === void 0 ? void 0 : _d.$case) === "web" &&
            (obj.web = ((_e = message.context) === null || _e === void 0 ? void 0 : _e.web)
                ? exports.WebPollContextDTO.toJSON((_f = message.context) === null || _f === void 0 ? void 0 : _f.web)
                : undefined);
        return obj;
    },
    fromPartial(object) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const message = createBasePollDTO();
        message.id = (_a = object.id) !== null && _a !== void 0 ? _a : "";
        message.guildId = (_b = object.guildId) !== null && _b !== void 0 ? _b : undefined;
        message.ownerId = (_c = object.ownerId) !== null && _c !== void 0 ? _c : undefined;
        message.createdAt = (_d = object.createdAt) !== null && _d !== void 0 ? _d : undefined;
        message.closesAt = (_e = object.closesAt) !== null && _e !== void 0 ? _e : undefined;
        message.topic = (_f = object.topic) !== null && _f !== void 0 ? _f : "";
        message.options = Object.entries((_g = object.options) !== null && _g !== void 0 ? _g : {}).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = String(value);
            }
            return acc;
        }, {});
        message.ballots = Object.entries((_h = object.ballots) !== null && _h !== void 0 ? _h : {}).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = exports.BallotDTO.fromPartial(value);
            }
            return acc;
        }, {});
        message.features = ((_j = object.features) === null || _j === void 0 ? void 0 : _j.map((e) => e)) || [];
        message.messageRef =
            object.messageRef !== undefined && object.messageRef !== null
                ? discord_1.MessageRefDTO.fromPartial(object.messageRef)
                : undefined;
        if (((_k = object.context) === null || _k === void 0 ? void 0 : _k.$case) === "discord" &&
            ((_l = object.context) === null || _l === void 0 ? void 0 : _l.discord) !== undefined &&
            ((_m = object.context) === null || _m === void 0 ? void 0 : _m.discord) !== null) {
            message.context = {
                $case: "discord",
                discord: exports.DiscordPollContextDTO.fromPartial(object.context.discord),
            };
        }
        if (((_o = object.context) === null || _o === void 0 ? void 0 : _o.$case) === "web" &&
            ((_p = object.context) === null || _p === void 0 ? void 0 : _p.web) !== undefined &&
            ((_q = object.context) === null || _q === void 0 ? void 0 : _q.web) !== null) {
            message.context = {
                $case: "web",
                web: exports.WebPollContextDTO.fromPartial(object.context.web),
            };
        }
        return message;
    },
};
function createBasePollDTO_OptionsEntry() {
    return { key: "", value: "" };
}
exports.PollDTO_OptionsEntry = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePollDTO_OptionsEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.key = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            key: isSet(object.key) ? String(object.key) : "",
            value: isSet(object.value) ? String(object.value) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.key !== undefined && (obj.key = message.key);
        message.value !== undefined && (obj.value = message.value);
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBasePollDTO_OptionsEntry();
        message.key = (_a = object.key) !== null && _a !== void 0 ? _a : "";
        message.value = (_b = object.value) !== null && _b !== void 0 ? _b : "";
        return message;
    },
};
function createBasePollDTO_BallotsEntry() {
    return { key: "", value: undefined };
}
exports.PollDTO_BallotsEntry = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== undefined) {
            exports.BallotDTO.encode(message.value, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePollDTO_BallotsEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.key = reader.string();
                    break;
                case 2:
                    message.value = exports.BallotDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            key: isSet(object.key) ? String(object.key) : "",
            value: isSet(object.value) ? exports.BallotDTO.fromJSON(object.value) : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.key !== undefined && (obj.key = message.key);
        message.value !== undefined &&
            (obj.value = message.value ? exports.BallotDTO.toJSON(message.value) : undefined);
        return obj;
    },
    fromPartial(object) {
        var _a;
        const message = createBasePollDTO_BallotsEntry();
        message.key = (_a = object.key) !== null && _a !== void 0 ? _a : "";
        message.value =
            object.value !== undefined && object.value !== null
                ? exports.BallotDTO.fromPartial(object.value)
                : undefined;
        return message;
    },
};
function createBasePollMetricsDTO() {
    return { ballotsRequested: 0, ballotsSubmitted: 0 };
}
exports.PollMetricsDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.ballotsRequested !== 0) {
            writer.uint32(8).int32(message.ballotsRequested);
        }
        if (message.ballotsSubmitted !== 0) {
            writer.uint32(16).int32(message.ballotsSubmitted);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePollMetricsDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.ballotsRequested = reader.int32();
                    break;
                case 2:
                    message.ballotsSubmitted = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            ballotsRequested: isSet(object.ballotsRequested)
                ? Number(object.ballotsRequested)
                : 0,
            ballotsSubmitted: isSet(object.ballotsSubmitted)
                ? Number(object.ballotsSubmitted)
                : 0,
        };
    },
    toJSON(message) {
        const obj = {};
        message.ballotsRequested !== undefined &&
            (obj.ballotsRequested = Math.round(message.ballotsRequested));
        message.ballotsSubmitted !== undefined &&
            (obj.ballotsSubmitted = Math.round(message.ballotsSubmitted));
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBasePollMetricsDTO();
        message.ballotsRequested = (_a = object.ballotsRequested) !== null && _a !== void 0 ? _a : 0;
        message.ballotsSubmitted = (_b = object.ballotsSubmitted) !== null && _b !== void 0 ? _b : 0;
        return message;
    },
};
function createBaseDiscordPollContextDTO() {
    return { guildId: "", ownerId: "", messageRef: undefined };
}
exports.DiscordPollContextDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.guildId !== "") {
            writer.uint32(10).string(message.guildId);
        }
        if (message.ownerId !== "") {
            writer.uint32(18).string(message.ownerId);
        }
        if (message.messageRef !== undefined) {
            discord_1.MessageRefDTO.encode(message.messageRef, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseDiscordPollContextDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.guildId = reader.string();
                    break;
                case 2:
                    message.ownerId = reader.string();
                    break;
                case 3:
                    message.messageRef = discord_1.MessageRefDTO.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            guildId: isSet(object.guildId) ? String(object.guildId) : "",
            ownerId: isSet(object.ownerId) ? String(object.ownerId) : "",
            messageRef: isSet(object.messageRef)
                ? discord_1.MessageRefDTO.fromJSON(object.messageRef)
                : undefined,
        };
    },
    toJSON(message) {
        const obj = {};
        message.guildId !== undefined && (obj.guildId = message.guildId);
        message.ownerId !== undefined && (obj.ownerId = message.ownerId);
        message.messageRef !== undefined &&
            (obj.messageRef = message.messageRef
                ? discord_1.MessageRefDTO.toJSON(message.messageRef)
                : undefined);
        return obj;
    },
    fromPartial(object) {
        var _a, _b;
        const message = createBaseDiscordPollContextDTO();
        message.guildId = (_a = object.guildId) !== null && _a !== void 0 ? _a : "";
        message.ownerId = (_b = object.ownerId) !== null && _b !== void 0 ? _b : "";
        message.messageRef =
            object.messageRef !== undefined && object.messageRef !== null
                ? discord_1.MessageRefDTO.fromPartial(object.messageRef)
                : undefined;
        return message;
    },
};
function createBaseWebPollContextDTO() {
    return { ownerId: "" };
}
exports.WebPollContextDTO = {
    encode(message, writer = minimal_1.default.Writer.create()) {
        if (message.ownerId !== "") {
            writer.uint32(10).string(message.ownerId);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof minimal_1.default.Reader ? input : new minimal_1.default.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWebPollContextDTO();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.ownerId = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
    fromJSON(object) {
        return {
            ownerId: isSet(object.ownerId) ? String(object.ownerId) : "",
        };
    },
    toJSON(message) {
        const obj = {};
        message.ownerId !== undefined && (obj.ownerId = message.ownerId);
        return obj;
    },
    fromPartial(object) {
        var _a;
        const message = createBaseWebPollContextDTO();
        message.ownerId = (_a = object.ownerId) !== null && _a !== void 0 ? _a : "";
        return message;
    },
};
class PollsServiceClientImpl {
    constructor(rpc) {
        this.rpc = rpc;
        this.CreatePoll = this.CreatePoll.bind(this);
        this.ReadPoll = this.ReadPoll.bind(this);
        this.UpdatePoll = this.UpdatePoll.bind(this);
        this.DeletePoll = this.DeletePoll.bind(this);
    }
    CreatePoll(request) {
        const data = exports.CreatePollRequest.encode(request).finish();
        const promise = this.rpc.request("polls.PollsService", "CreatePoll", data);
        return promise.then((data) => exports.CreatePollResponse.decode(new minimal_1.default.Reader(data)));
    }
    ReadPoll(request) {
        const data = exports.ReadPollRequest.encode(request).finish();
        const promise = this.rpc.request("polls.PollsService", "ReadPoll", data);
        return promise.then((data) => exports.ReadPollResponse.decode(new minimal_1.default.Reader(data)));
    }
    UpdatePoll(request) {
        const data = exports.UpdatePollRequest.encode(request).finish();
        const promise = this.rpc.request("polls.PollsService", "UpdatePoll", data);
        return promise.then((data) => exports.UpdatePollResponse.decode(new minimal_1.default.Reader(data)));
    }
    DeletePoll(request) {
        const data = exports.DeletePollRequest.encode(request).finish();
        const promise = this.rpc.request("polls.PollsService", "DeletePoll", data);
        return promise.then((data) => exports.DeletePollResponse.decode(new minimal_1.default.Reader(data)));
    }
}
exports.PollsServiceClientImpl = PollsServiceClientImpl;
function toTimestamp(date) {
    const seconds = date.getTime() / 1000;
    const nanos = (date.getTime() % 1000) * 1000000;
    return { seconds, nanos };
}
function fromTimestamp(t) {
    let millis = t.seconds * 1000;
    millis += t.nanos / 1000000;
    return new Date(millis);
}
function fromJsonTimestamp(o) {
    if (o instanceof Date) {
        return o;
    }
    else if (typeof o === "string") {
        return new Date(o);
    }
    else {
        return fromTimestamp(timestamp_1.Timestamp.fromJSON(o));
    }
}
if (minimal_1.default.util.Long !== long_1.default) {
    minimal_1.default.util.Long = long_1.default;
    minimal_1.default.configure();
}
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function isSet(value) {
    return value !== null && value !== undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwb2xscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxnREFBd0I7QUFDeEIsaUVBQXFDO0FBQ3JDLCtEQUE0RDtBQUM1RCxzREFBeUQ7QUFFNUMsUUFBQSxlQUFlLEdBQUcsT0FBTyxDQUFDO0FBRXZDLElBQVksY0FTWDtBQVRELFdBQVksY0FBYztJQUN4Qix5REFBVyxDQUFBO0lBQ1gsK0ZBQThCLENBQUE7SUFDOUIseUZBQTJCLENBQUE7SUFDM0IsaUZBQXVCLENBQUE7SUFDdkIsbUVBQWdCLENBQUE7SUFDaEIscUVBQWlCLENBQUE7SUFDakIsNkVBQXFCLENBQUE7SUFDckIsb0VBQWlCLENBQUE7QUFDbkIsQ0FBQyxFQVRXLGNBQWMsR0FBZCxzQkFBYyxLQUFkLHNCQUFjLFFBU3pCO0FBRUQsU0FBZ0Isc0JBQXNCLENBQUMsTUFBVztJQUNoRCxRQUFRLE1BQU0sRUFBRTtRQUNkLEtBQUssQ0FBQyxDQUFDO1FBQ1AsS0FBSyxTQUFTO1lBQ1osT0FBTyxjQUFjLENBQUMsT0FBTyxDQUFDO1FBQ2hDLEtBQUssQ0FBQyxDQUFDO1FBQ1AsS0FBSyw0QkFBNEI7WUFDL0IsT0FBTyxjQUFjLENBQUMsMEJBQTBCLENBQUM7UUFDbkQsS0FBSyxDQUFDLENBQUM7UUFDUCxLQUFLLHlCQUF5QjtZQUM1QixPQUFPLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQztRQUNoRCxLQUFLLENBQUMsQ0FBQztRQUNQLEtBQUsscUJBQXFCO1lBQ3hCLE9BQU8sY0FBYyxDQUFDLG1CQUFtQixDQUFDO1FBQzVDLEtBQUssQ0FBQyxDQUFDO1FBQ1AsS0FBSyxjQUFjO1lBQ2pCLE9BQU8sY0FBYyxDQUFDLFlBQVksQ0FBQztRQUNyQyxLQUFLLENBQUMsQ0FBQztRQUNQLEtBQUssZUFBZTtZQUNsQixPQUFPLGNBQWMsQ0FBQyxhQUFhLENBQUM7UUFDdEMsS0FBSyxDQUFDLENBQUM7UUFDUCxLQUFLLG1CQUFt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