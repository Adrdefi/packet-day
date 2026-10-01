import type { BandKey } from "@/lib/pdf-tokens";
import { deriveSeed, randInt, seededRng } from "./random";
import type { MazePuzzle } from "./types";

export const MAZE_SIZES: Record<BandKey, number> = { "K-2": 11, "3-5": 18, "6-8": 26 };

/** How many mazes to build; the one with the longest solution wins. */
export const MAZE_CANDIDATES = 60;

const N = 1, E = 2, S = 4, W = 8;
const STEPS = [
  { bit: N, dx: 0, dy: -1, opposite: S, letter: "N" },
  { bit: E, dx: 1, dy: 0, opposite: W, letter: "E" },
  { bit: S, dx: 0, dy: 1, opposite: N, letter: "S" },
  { bit: W, dx: -1, dy: 0, opposite: E, letter: "W" },
] as const;

/** Recursive backtracker (iterative). Always a perfect maze: exactly one path between any two cells. */
function carve(width: number, height: number, seed: number): number[] {
  const rng = seededRng(seed);
  const walls = new Array<number>(width * height).fill(N | E | S | W);
  const visited = new Uint8Array(width * height);
  const stack = [0];
  visited[0] = 1;
  while (stack.length > 0) {
    const cell = stack[stack.length - 1];
    const x = cell % width;
    const y = Math.floor(cell / width);
    const options = STEPS.filter(({ dx, dy }) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < width && ny < height && !visited[ny * width + nx];
    });
    if (options.length === 0) { stack.pop(); continue; }
    const step = options[randInt(rng, options.length)];
    const next = (y + step.dy) * width + (x + step.dx);
    walls[cell] &= ~step.bit;
    walls[next] &= ~step.opposite;
    visited[next] = 1;
    stack.push(next);
  }
  walls[0] &= ~N; // entrance
  walls[width * height - 1] &= ~S; // exit
  return walls;
}

/** Steps from the top left cell to the bottom right one, or null if there's no route. */
function solve(walls: readonly number[], width: number, height: number): string | null {
  const total = width * height;
  const prev = new Int32Array(total).fill(-1);
  const via = new Array<string>(total);
  prev[0] = 0;
  const queue = [0];
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const x = cell % width;
    const y = Math.floor(cell / width);
    for (const step of STEPS) {
      if (walls[cell] & step.bit) continue;
      const nx = x + step.dx, ny = y + step.dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (prev[next] !== -1) continue;
      prev[next] = cell;
      via[next] = step.letter;
      queue.push(next);
    }
  }
  const end = total - 1;
  if (prev[end] === -1) return null;
  const path: string[] = [];
  for (let c = end; c !== 0; c = prev[c]) path.push(via[c]);
  return path.reverse().join("");
}

export function buildMaze(band: BandKey, seed: number): MazePuzzle | null {
  const size = MAZE_SIZES[band];
  let best: { walls: number[]; solution: string } | null = null;
  for (let i = 0; i < MAZE_CANDIDATES; i++) {
    const walls = carve(size, size, deriveSeed(seed, `maze-${i}`));
    const solution = solve(walls, size, size);
    if (solution && (!best || solution.length > best.solution.length)) best = { walls, solution };
  }
  if (!best) return null;
  const puzzle: MazePuzzle = {
    type: "maze",
    band,
    width: size,
    height: size,
    walls: best.walls.map((w) => w.toString(16)).join(""),
    solution: best.solution,
  };
  return validateMaze(puzzle) === null ? puzzle : null;
}

/** Decodes the stored walls string into one bitmask per cell. */
export function mazeWalls(p: MazePuzzle): number[] {
  return [...p.walls].map((ch) => parseInt(ch, 16));
}

/**
 * Why a stored maze is unusable, or null if it's good. Checks that walls agree
 * between neighbors, the border is closed except the entrance and exit, every
 * cell is reachable, and there are exactly cells - 1 passages (so exactly one
 * route), and that the stored solution walks that route.
 */
export function validateMaze(p: MazePuzzle): string | null {
  const { width, height } = p;
  if (width !== MAZE_SIZES[p.band] || height !== MAZE_SIZES[p.band]) return "wrong size";
  if (p.walls.length !== width * height || !/^[0-9a-f]+$/.test(p.walls)) return "bad walls string";
  const walls = mazeWalls(p);
  let passages = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = y * width + x;
      for (const step of STEPS) {
        const nx = x + step.dx, ny = y + step.dy;
        const open = (walls[cell] & step.bit) === 0;
        const outside = nx < 0 || ny < 0 || nx >= width || ny >= height;
        if (outside) {
          const isEntrance = cell === 0 && step.bit === N;
          const isExit = cell === width * height - 1 && step.bit === S;
          if (open !== (isEntrance || isExit)) return `border wrong at ${x},${y}`;
          continue;
        }
        const neighborOpen = (walls[ny * width + nx] & step.opposite) === 0;
        if (open !== neighborOpen) return `walls disagree at ${x},${y}`;
        if (open && (step.bit === E || step.bit === S)) passages++;
      }
    }
  }
  if (passages !== width * height - 1) return `${passages} passages, a perfect maze has ${width * height - 1}`;
  const solution = solve(walls, width, height);
  if (solution === null) return "no route to the exit";
  // solve() visits every reachable cell; with cells - 1 passages and the exit
  // reached, the passages form a tree only if every cell was reached too.
  const seen = new Set<number>([0]);
  const queue = [0];
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const x = cell % width, y = Math.floor(cell / width);
    for (const step of STEPS) {
      if (walls[cell] & step.bit) continue;
      const nx = x + step.dx, ny = y + step.dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  if (seen.size !== width * height) return "some cells can't be reached";
  if (solution !== p.solution) return "stored solution is not the route";
  return null;
}
