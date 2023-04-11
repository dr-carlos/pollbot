"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankedPairs = exports.showMatrix = exports.buildMatrix = void 0;
const columnify_1 = __importDefault(require("columnify"));
const settings_1 = require("../settings");
const random_1 = require("../util/random");
const timer_1 = require("../util/timer");
function initMatrix(options) {
    const m = {};
    options.forEach((runner) => {
        options.forEach((opponent) => {
            m[runner] = {};
            if (runner === opponent) {
                m[runner][opponent] = undefined;
            }
            else {
                m[runner][opponent] = 0;
            }
        });
    });
    return m;
}
function addMatrices(matrixA, matrixB) {
    const options = Object.keys(matrixA);
    const result = initMatrix(options);
    options.forEach((runner) => {
        options.forEach((opponent) => {
            const a = matrixA[runner][opponent];
            const b = matrixB[runner][opponent];
            if (runner !== opponent) {
                result[runner][opponent] = (a !== null && a !== void 0 ? a : 0) + (b !== null && b !== void 0 ? b : 0);
            }
        });
    });
    return result;
}
function buildMatrix(options, votes) {
    return votes.reduce((accMatrix, vote) => {
        const matrix = initMatrix(options);
        options.forEach((runner) => {
            options.forEach((opponent) => {
                if (runner !== opponent) {
                    const voteR = vote[runner];
                    const voteO = vote[opponent];
                    if (voteR !== undefined && voteO !== undefined) {
                        if (voteR === voteO) {
                            matrix[runner][opponent] = undefined;
                        }
                        else {
                            matrix[runner][opponent] = voteR > voteO ? 1 : 0;
                        }
                    }
                }
            });
        });
        return addMatrices(accMatrix, matrix);
    }, initMatrix(options));
}
exports.buildMatrix = buildMatrix;
function showMatrix(matrix) {
    if (!matrix) {
        return "Matrix does not exist";
    }
    const options = Object.keys(matrix);
    const rows = options.map((o) => {
        const row = matrix[o];
        return Object.assign({ key: o }, row);
    });
    return (0, columnify_1.default)(rows.sort((a, b) => (a.key < b.key ? -1 : 1)), {
        columns: ["key", ...options.sort()],
        columnSplitter: " | ",
        align: "right",
        headingTransform: (t) => (t === "key" ? "" : t.toLowerCase()),
    });
}
exports.showMatrix = showMatrix;
function buildRankedPairs(options, matrix) {
    const pairs = [];
    options.forEach((runner) => {
        options.forEach((opponent) => {
            var _a, _b;
            const doneAlready = pairs.find((p) => {
                return ((p.runner === opponent && p.opponent === runner) ||
                    (p.runner === runner && p.opponent === opponent));
            });
            if (!doneAlready) {
                if (runner !== opponent) {
                    const prefersRunner = (_a = matrix[runner][opponent]) !== null && _a !== void 0 ? _a : 0;
                    const prefersOpponent = (_b = matrix[opponent][runner]) !== null && _b !== void 0 ? _b : 0;
                    const total = prefersRunner + prefersOpponent;
                    if (total > 0) {
                        if (prefersRunner > prefersOpponent) {
                            pairs.push({
                                runner,
                                opponent,
                                result: {
                                    winner: runner,
                                    loser: opponent,
                                    percentage: prefersRunner / total,
                                },
                            });
                        }
                        else {
                            pairs.push({
                                runner,
                                opponent,
                                result: {
                                    winner: opponent,
                                    loser: runner,
                                    percentage: prefersOpponent / total,
                                },
                            });
                        }
                    }
                }
            }
        });
    });
    return pairs;
}
function sortRankedPairs(rankedPairs) {
    return rankedPairs.sort((p1, p2) => {
        return p1.result.percentage - p2.result.percentage;
    });
}
function addEdge(g, { start, end }) {
    if (!g[start]) {
        g[start] = [end];
        return;
    }
    if (end in g[start]) {
        return;
    }
    g[start].push(end);
}
function deleteEdge(g, { start, end }) {
    const nextNodes = g[start];
    if (nextNodes) {
        const nextIndex = nextNodes.findIndex((n) => n === end);
        g[start] = nextNodes.splice(nextIndex, 1);
    }
}
function dfs(g, start, pred) {
    return dfsVisited(g, start, [], 0, pred);
}
function dfsVisited(g, start, visited, depth, pred) {
    if (pred(start, depth)) {
        return start;
    }
    if (visited.indexOf(start) !== -1) {
        return;
    }
    if (!g[start]) {
        return;
    }
    visited.push(start);
    const nextNodes = g[start];
    for (const next of nextNodes) {
        const foundInSubgraph = dfsVisited(g, next, visited, depth + 1, pred);
        if (foundInSubgraph) {
            return foundInSubgraph;
        }
    }
}
function addAcyclicEdge(g, edge) {
    addEdge(g, edge);
    const hasCycle = dfs(g, edge.start, (n, depth) => {
        return n === edge.start && depth !== 0;
    });
    if (hasCycle) {
        settings_1.L.d("New edge would create cycle", edge, g);
        deleteEdge(g, edge);
    }
}
function nodes(g) {
    return Object.keys(g);
}
function edges(g) {
    const ns = nodes(g);
    const edges = ns.map((start) => g[start].map((end) => ({
        start,
        end,
    })));
    return edges.flat();
}
function union(setA, setB) {
    return new Set([...setA, ...setB]);
}
function intersection(setA, setB) {
    const i = new Set();
    setA.forEach((a) => {
        if (setB.has(a)) {
            i.add(a);
        }
    });
    return i;
}
function subtract(setA, setB) {
    const result = new Set(setA);
    setB.forEach((b) => {
        if (result.has(b)) {
            result.delete(b);
        }
    });
    return result;
}
function findRoot(g) {
    const ns = new Set(nodes(g));
    const es = new Set(edges(g));
    const nonRoots = new Set();
    es.forEach(({ end }) => {
        nonRoots.add(end);
    });
    const roots = subtract(ns, nonRoots);
    return roots.keys().next().value;
}
function lockRankedPairs(rankedPairs) {
    const g = {};
    rankedPairs.forEach((p) => {
        if (!g[p.result.loser]) {
            g[p.result.loser] = [];
        }
        if (!g[p.result.winner]) {
            g[p.result.winner] = [];
        }
        addAcyclicEdge(g, {
            start: p.result.winner,
            end: p.result.loser,
        });
    });
    return g;
}
function sortBy(arr, key) {
    return arr.sort((a, b) => key(a) - key(b));
}
function _rankedPairs(options, votes) {
    options = options.slice(0);
    if (options.length === 0)
        return [];
    if (votes.length === 0)
        return (0, random_1.shuffled)(options).map((o) => [o, 0]);
    const matrix = buildMatrix(options, votes);
    const rankedPairs = buildRankedPairs(options, matrix);
    const sorted = sortRankedPairs(rankedPairs);
    const locked = lockRankedPairs(sorted);
    const _rankings = sortBy(options.map((option) => {
        var _a, _b;
        return ({
            key: option,
            score: (_b = (_a = locked[option]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0,
        });
    }), ({ score }) => -score);
    const runWinner = _rankings[0];
    if (!runWinner)
        return [];
    const runWinnerIndex = options.indexOf(runWinner.key);
    options.splice(runWinnerIndex, 1);
    const restRankings = _rankedPairs(options, votes);
    return [[runWinner.key, runWinner.score], ...restRankings];
}
function rankedPairs(options, votes) {
    if (votes.length === 0)
        return;
    const computeTimer = timer_1.Timer.startTimer();
    const matrix = buildMatrix(options, votes);
    const finalRankings = _rankedPairs(options, votes);
    const metrics = {
        voteCount: votes.length,
        computeDuration: computeTimer.endTimer(),
    };
    return {
        rankingType: "rankedPairs",
        matrix,
        metrics,
        finalRankings,
    };
}
exports.rankedPairs = rankedPairs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZG9yY2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3ZvdGluZy9jb25kb3JjZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMERBQWtDO0FBQ2xDLDBDQUFnQztBQUNoQywyQ0FBMEM7QUFDMUMseUNBQXNDO0FBU3RDLFNBQVMsVUFBVSxDQUFDLE9BQWlCO0lBQ25DLE1BQU0sQ0FBQyxHQUFpQixFQUFFLENBQUM7SUFDM0IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ3pCLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUMzQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2YsSUFBSSxNQUFNLEtBQUssUUFBUSxFQUFFO2dCQUN2QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsU0FBUyxDQUFDO2FBQ2pDO2lCQUFNO2dCQUNMLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDekI7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQ2xCLE9BQXFCLEVBQ3JCLE9BQXFCO0lBRXJCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUN6QixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDM0IsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwQyxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7Z0JBQ3ZCLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBRCxDQUFDLGNBQUQsQ0FBQyxHQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFELENBQUMsY0FBRCxDQUFDLEdBQUksQ0FBQyxDQUFDLENBQUM7YUFDaEQ7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxPQUFpQixFQUFFLEtBQWE7SUFDMUQsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDekIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUMzQixJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7b0JBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM3QixJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTt3QkFDOUMsSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFOzRCQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsU0FBUyxDQUFDO3lCQUN0Qzs2QkFBTTs0QkFDTCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ2xEO3FCQUNGO2lCQUNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sV0FBVyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN4QyxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQXBCRCxrQ0FvQkM7QUFFRCxTQUFnQixVQUFVLENBQUMsTUFBZ0M7SUFDekQsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE9BQU8sdUJBQXVCLENBQUM7S0FDaEM7SUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUM3QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsdUJBQ0UsR0FBRyxFQUFFLENBQUMsSUFDSCxHQUFHLEVBQ047SUFDSixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sSUFBQSxtQkFBUyxFQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzdDO1FBQ0UsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25DLGNBQWMsRUFBRSxLQUFLO1FBQ3JCLEtBQUssRUFBRSxPQUFPO1FBQ2QsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7S0FDOUQsQ0FDRixDQUFDO0FBQ0osQ0FBQztBQXJCRCxnQ0FxQkM7QUFRRCxTQUFTLGdCQUFnQixDQUN2QixPQUFpQixFQUNqQixNQUFvQjtJQUVwQixNQUFNLEtBQUssR0FBaUIsRUFBRSxDQUFDO0lBQy9CLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUN6QixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7O1lBQzNCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDbkMsT0FBTyxDQUNMLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUM7b0JBQ2hELENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FDakQsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDaEIsSUFBSSxNQUFNLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLGFBQWEsR0FBRyxNQUFBLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsbUNBQUksQ0FBQyxDQUFDO29CQUNwRCxNQUFNLGVBQWUsR0FBRyxNQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsbUNBQUksQ0FBQyxDQUFDO29CQUN0RCxNQUFNLEtBQUssR0FBRyxhQUFhLEdBQUcsZUFBZSxDQUFDO29CQUM5QyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7d0JBQ2IsSUFBSSxhQUFhLEdBQUcsZUFBZSxFQUFFOzRCQUNuQyxLQUFLLENBQUMsSUFBSSxDQUFDO2dDQUNULE1BQU07Z0NBQ04sUUFBUTtnQ0FDUixNQUFNLEVBQUU7b0NBQ04sTUFBTSxFQUFFLE1BQU07b0NBQ2QsS0FBSyxFQUFFLFFBQVE7b0NBQ2YsVUFBVSxFQUFFLGFBQWEsR0FBRyxLQUFLO2lDQUNsQzs2QkFDRixDQUFDLENBQUM7eUJBQ0o7NkJBQU07NEJBQ0wsS0FBSyxDQUFDLElBQUksQ0FBQztnQ0FDVCxNQUFNO2dDQUNOLFFBQVE7Z0NBQ1IsTUFBTSxFQUFFO29DQUNOLE1BQU0sRUFBRSxRQUFRO29DQUNoQixLQUFLLEVBQUUsTUFBTTtvQ0FDYixVQUFVLEVBQUUsZUFBZSxHQUFHLEtBQUs7aUNBQ3BDOzZCQUNGLENBQUMsQ0FBQzt5QkFDSjtxQkFDRjtpQkFDRjthQUNGO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLFdBQXlCO0lBQ2hELE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtRQUNqQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ3JELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVNELFNBQVMsT0FBTyxDQUFDLENBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQVE7SUFDN0MsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNiLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLE9BQU87S0FDUjtJQUNELElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNuQixPQUFPO0tBQ1I7SUFDRCxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxDQUFRLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFRO0lBQ2hELE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQixJQUFJLFNBQVMsRUFBRTtRQUNiLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDM0M7QUFDSCxDQUFDO0FBRUQsU0FBUyxHQUFHLENBQ1YsQ0FBUSxFQUNSLEtBQVcsRUFDWCxJQUE0QztJQUU1QyxPQUFPLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUNqQixDQUFRLEVBQ1IsS0FBVyxFQUNYLE9BQWUsRUFDZixLQUFhLEVBQ2IsSUFBNEM7SUFFNUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFO1FBQ3RCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDakMsT0FBTztLQUNSO0lBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNiLE9BQU87S0FDUjtJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNCLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFO1FBQzVCLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RFLElBQUksZUFBZSxFQUFFO1lBQ25CLE9BQU8sZUFBZSxDQUFDO1NBQ3hCO0tBQ0Y7QUFDSCxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsQ0FBUSxFQUFFLElBQVU7SUFDMUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNqQixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxRQUFRLEVBQUU7UUFDWixZQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3JCO0FBQ0gsQ0FBQztBQUVELFNBQVMsS0FBSyxDQUFDLENBQVE7SUFDckIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFRO0lBQ3JCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDN0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyQixLQUFLO1FBQ0wsR0FBRztLQUNKLENBQUMsQ0FBQyxDQUNKLENBQUM7SUFDRixPQUFPLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUN0QixDQUFDO0FBRUQsU0FBUyxLQUFLLENBQUksSUFBWSxFQUFFLElBQVk7SUFDMUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUksSUFBWSxFQUFFLElBQVk7SUFDakQsTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUssQ0FBQztJQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDakIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2YsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBSSxJQUFZLEVBQUUsSUFBWTtJQUM3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBSSxJQUFJLENBQUMsQ0FBQztJQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDakIsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pCLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEI7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxDQUFRO0lBQ3hCLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdCLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFRLENBQUM7SUFDakMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtRQUNyQixRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyQyxPQUFPLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFDbkMsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLFdBQXlCO0lBQ2hELE1BQU0sQ0FBQyxHQUFVLEVBQUUsQ0FBQztJQUNwQixXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDeEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUN4QjtRQUNELElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDekI7UUFDRCxjQUFjLENBQUMsQ0FBQyxFQUFFO1lBQ2hCLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU07WUFDdEIsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztTQUNwQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFJLEdBQVEsRUFBRSxHQUFxQjtJQUNoRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLE9BQWlCLEVBQUUsS0FBYTtJQUNwRCxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzQixJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBRXBDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQUUsT0FBTyxJQUFBLGlCQUFRLEVBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXBFLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0MsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3RELE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM1QyxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFdkMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O1FBQUMsT0FBQSxDQUFDO1lBQ3ZCLEdBQUcsRUFBRSxNQUFNO1lBQ1gsS0FBSyxFQUFFLE1BQUEsTUFBQSxNQUFNLENBQUMsTUFBTSxDQUFDLDBDQUFFLE1BQU0sbUNBQUksQ0FBQztTQUNuQyxDQUFDLENBQUE7S0FBQSxDQUFDLEVBQ0gsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FDdEIsQ0FBQztJQUVGLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsU0FBUztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBRTFCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RELE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sWUFBWSxHQUF1QixZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFDN0QsQ0FBQztBQUVELFNBQWdCLFdBQVcsQ0FDekIsT0FBaUIsRUFDakIsS0FBYTtJQUViLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQUUsT0FBTztJQUUvQixNQUFNLFlBQVksR0FBRyxhQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDeEMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQyxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ25ELE1BQU0sT0FBTyxHQUFtQjtRQUM5QixTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU07UUFDdkIsZUFBZSxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUU7S0FDekMsQ0FBQztJQUVGLE9BQU87UUFDTCxXQUFXLEVBQUUsYUFBYTtRQUMxQixNQUFNO1FBQ04sT0FBTztRQUNQLGFBQWE7S0FDZCxDQUFDO0FBQ0osQ0FBQztBQXBCRCxrQ0FvQkMifQ==