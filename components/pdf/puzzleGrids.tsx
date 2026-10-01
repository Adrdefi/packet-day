// Server-side only. The four puzzle break grids, drawn as react-pdf <Svg> at
// an exact size the page plans in lib/puzzles/pageLayout.ts. Each takes
// `solved` so the parent answer key can reuse the same drawing.

import { Circle, G, Line, Path, Rect, Svg, Text } from "@react-pdf/renderer";
import { color } from "@/lib/pdf-tokens";
import {
  CW_CELL,
  CW_MARGIN,
  MAZE_CELL,
  MAZE_LABEL_ROW,
  MAZE_MARGIN_X,
  MAZE_MARGIN_Y,
  SUDOKU_CELL,
  SUDOKU_MARGIN,
  WS_CELL,
  WS_MARGIN,
  gridViewBox,
} from "@/lib/puzzles/pageLayout";
import { mazeWalls } from "@/lib/puzzles/maze";
import {
  WORD_DIRECTIONS,
  type BuiltPuzzle,
  type CrosswordPuzzle,
  type MazePuzzle,
  type SudokuPuzzle,
  type WordSearchPuzzle,
} from "@/lib/puzzles/types";

const INK = color.textPrimary;
const GRID_LINE = "#E6E0D7";
const GIVEN_FILL = "#F6F2EA";
const HIGHLIGHT = "#F2C97E";
const START_COLOR = color.sageDark;
const FINISH_COLOR = color.coralDark;

const nunito = (size: number) => ({ fontFamily: "Nunito", fontWeight: 700 as const, fontSize: size });
const fraunces = (size: number) => ({ fontFamily: "Fraunces", fontWeight: 800 as const, fontSize: size });

// ─── Word search ──────────────────────────────────────────────────────────────

function WordSearchGrid({ p, solved }: { p: WordSearchPuzzle; solved: boolean }) {
  const n = p.size;
  const c = WS_CELL;
  const o = WS_MARGIN;
  const end = o + n * c;
  return (
    <G>
      {Array.from({ length: n + 1 }, (_, i) => (
        <G key={`l${i}`}>
          <Line x1={o} y1={o + i * c} x2={end} y2={o + i * c} stroke={GRID_LINE} strokeWidth={1.2} />
          <Line x1={o + i * c} y1={o} x2={o + i * c} y2={end} stroke={GRID_LINE} strokeWidth={1.2} />
        </G>
      ))}
      {solved &&
        p.words.map((w, i) => {
          const [dx, dy] = WORD_DIRECTIONS[w.dir];
          const last = w.word.length - 1;
          return (
            <Line
              key={`h${i}`}
              x1={o + w.x * c + c / 2}
              y1={o + w.y * c + c / 2}
              x2={o + (w.x + dx * last) * c + c / 2}
              y2={o + (w.y + dy * last) * c + c / 2}
              stroke={HIGHLIGHT}
              strokeWidth={c * 0.72}
              strokeLinecap="round"
              strokeOpacity={0.75}
            />
          );
        })}
      {p.grid.map((row, y) =>
        [...row].map((letter, x) => (
          <Text key={`t${x}-${y}`} x={o + x * c + c / 2} y={o + y * c + c / 2 + 7} textAnchor="middle" fill={INK} style={nunito(20)}>
            {letter}
          </Text>
        ))
      )}
    </G>
  );
}

// ─── Maze ─────────────────────────────────────────────────────────────────────

const MAZE_STROKE = { "K-2": 4, "3-5": 3.2, "6-8": 2.6 } as const;

/** A small filled arrow pointing down, its tip at (x, tipY). */
function DownArrow({ x, tipY, fill }: { x: number; tipY: number; fill: string }) {
  return <Path d={`M${x - 4.5} ${tipY - 6} L${x + 4.5} ${tipY - 6} L${x} ${tipY} Z`} fill={fill} />;
}

function MazeGrid({ p, solved }: { p: MazePuzzle; solved: boolean }) {
  const c = MAZE_CELL;
  const ox = MAZE_MARGIN_X;
  const oy = MAZE_MARGIN_Y;
  const walls = mazeWalls(p);
  const segs: string[] = [];
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const w = walls[y * p.width + x];
      const X = ox + x * c;
      const Y = oy + y * c;
      if (w & 1) segs.push(`M${X} ${Y}h${c}`);
      if (w & 8) segs.push(`M${X} ${Y}v${c}`);
      if (y === p.height - 1 && w & 4) segs.push(`M${X} ${Y + c}h${c}`);
      if (x === p.width - 1 && w & 2) segs.push(`M${X + c} ${Y}v${c}`);
    }
  }
  const startX = ox + c / 2;
  const finishX = ox + (p.width - 1) * c + c / 2;
  const bottom = oy + p.height * c;

  let route = "";
  if (solved) {
    const pts: string[] = [`M${startX} ${oy - 4}`];
    let x = 0;
    let y = 0;
    pts.push(`L${ox + c / 2} ${oy + c / 2}`);
    for (const step of p.solution) {
      if (step === "N") y--;
      if (step === "S") y++;
      if (step === "E") x++;
      if (step === "W") x--;
      pts.push(`L${ox + x * c + c / 2} ${oy + y * c + c / 2}`);
    }
    pts.push(`L${finishX} ${bottom + 4}`);
    route = pts.join(" ");
  }

  return (
    <G>
      {solved && (
        // One solid line along the route, drawn as a single open path so it reads as one route.
        <Path d={route} fill="none" stroke={color.coral} strokeWidth={c * 0.2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <Path d={segs.join(" ")} stroke={INK} strokeWidth={MAZE_STROKE[p.band]} strokeLinecap="round" fill="none" />
    </G>
  );
}

/**
 * START (above the maze, over the entrance) or FINISH (below it, under the
 * exit), drawn at real point size outside the scaled grid. `cellCenter` is
 * the entrance or exit cell's center, in points from the grid's left edge.
 */
export function MazeLabelRow({ kind, width, cellCenter }: { kind: "start" | "finish"; width: number; cellCenter: number }) {
  const h = MAZE_LABEL_ROW;
  const isStart = kind === "start";
  const fill = isStart ? START_COLOR : FINISH_COLOR;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      {isStart ? (
        <G>
          <Text x={Math.max(0, cellCenter - 6)} y={8} fill={fill} style={nunito(9)}>
            START
          </Text>
          <DownArrow x={cellCenter} tipY={h - 1} fill={fill} />
        </G>
      ) : (
        <G>
          <DownArrow x={cellCenter} tipY={9} fill={fill} />
          <Text x={Math.min(width, cellCenter + 6)} y={h - 1} textAnchor="end" fill={fill} style={nunito(9)}>
            FINISH
          </Text>
        </G>
      )}
    </Svg>
  );
}

// ─── Sudoku ───────────────────────────────────────────────────────────────────

/** K-2 shapes, centered on (cx, cy), sized for a cell of `c`: 1 circle, 2 square, 3 triangle, 4 star. */
export function SudokuShape({ shape, cx, cy, c, stroke }: { shape: number; cx: number; cy: number; c: number; stroke: string }) {
  const r = c * 0.27;
  const sw = c * 0.055;
  if (shape === 1) return <Circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={sw} />;
  if (shape === 2) return <Rect x={cx - r * 0.92} y={cy - r * 0.92} width={r * 1.84} height={r * 1.84} fill="none" stroke={stroke} strokeWidth={sw} />;
  if (shape === 3) {
    return <Path d={`M${cx} ${cy - r * 1.08} L${cx + r * 1.08} ${cy + r * 0.9} L${cx - r * 1.08} ${cy + r * 0.9} Z`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  }
  // Five pointed star.
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r * 1.15 : r * 0.5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return <Path d={`M${pts.join(" L")} Z`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
}

function SudokuGrid({ p, solved }: { p: SudokuPuzzle; solved: boolean }) {
  const n = p.size;
  const c = SUDOKU_CELL;
  const o = SUDOKU_MARGIN;
  const givens = [...p.givens].map(Number);
  const solution = [...p.solution].map(Number);
  const cells: React.ReactElement[] = [];
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      const i = r * n + col;
      if (givens[i]) cells.push(<Rect key={`g${i}`} x={o + col * c} y={o + r * c} width={c} height={c} fill={GIVEN_FILL} />);
    }
  }
  const lines: React.ReactElement[] = [];
  for (let i = 0; i <= n; i++) {
    lines.push(<Line key={`h${i}`} x1={o} y1={o + i * c} x2={o + n * c} y2={o + i * c} stroke={INK} strokeWidth={i % p.boxRows === 0 ? 3.5 : 1.2} />);
    lines.push(<Line key={`v${i}`} x1={o + i * c} y1={o} x2={o + i * c} y2={o + n * c} stroke={INK} strokeWidth={i % p.boxCols === 0 ? 3.5 : 1.2} />);
  }
  const marks: React.ReactElement[] = [];
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      const i = r * n + col;
      const v = givens[i] || (solved ? solution[i] : 0);
      if (!v) continue;
      const ink = givens[i] ? INK : color.coral;
      const cx = o + col * c + c / 2;
      const cy = o + r * c + c / 2;
      marks.push(
        p.shapes ? (
          <SudokuShape key={`m${i}`} shape={v} cx={cx} cy={cy} c={c} stroke={ink} />
        ) : (
          <Text key={`m${i}`} x={cx} y={cy + c * 0.18} textAnchor="middle" fill={ink} style={fraunces(c * 0.52)}>
            {String(v)}
          </Text>
        )
      );
    }
  }
  return (
    <G>
      {cells}
      {lines}
      {marks}
    </G>
  );
}

/** The K-2 shape key: the four shapes in a row. */
export function SudokuShapeKey({ size }: { size: number }) {
  const gap = size * 0.9;
  const width = 4 * size + 3 * gap;
  return (
    <Svg width={width} height={size} viewBox={`0 0 ${width} ${size}`}>
      {[1, 2, 3, 4].map((s, i) => (
        <SudokuShape key={s} shape={s} cx={i * (size + gap) + size / 2} cy={size / 2} c={size * 1.6} stroke={INK} />
      ))}
    </Svg>
  );
}

// ─── Crossword ────────────────────────────────────────────────────────────────

function CrosswordGrid({ p, solved }: { p: CrosswordPuzzle; solved: boolean }) {
  const c = CW_CELL;
  const o = CW_MARGIN;
  const letters = new Map<string, string>();
  for (const e of p.entries) {
    for (let i = 0; i < e.answer.length; i++) {
      const x = e.dir === "across" ? e.x + i : e.x;
      const y = e.dir === "down" ? e.y + i : e.y;
      letters.set(`${x},${y}`, e.answer[i]);
    }
  }
  const numbers = new Map(p.entries.map((e) => [`${e.x},${e.y}`, e.number]));
  return (
    <G>
      {[...letters.entries()].map(([k, letter]) => {
        const [x, y] = k.split(",").map(Number);
        const X = o + x * c;
        const Y = o + y * c;
        const num = numbers.get(k);
        return (
          <G key={k}>
            <Rect x={X} y={Y} width={c} height={c} fill="#FFFFFF" stroke={INK} strokeWidth={1.8} />
            {num !== undefined && (
              <Text x={X + 3} y={Y + 14} fill={INK} style={nunito(14)}>
                {String(num)}
              </Text>
            )}
            {solved && (
              <Text x={X + c / 2} y={Y + c * 0.74} textAnchor="middle" fill={color.coral} style={fraunces(22)}>
                {letter}
              </Text>
            )}
          </G>
        );
      })}
    </G>
  );
}

// ─── Any grid ─────────────────────────────────────────────────────────────────

/** Draws a built puzzle at exactly width x height points. */
export function PuzzleGrid({ puzzle, width, height, solved = false }: { puzzle: BuiltPuzzle; width: number; height: number; solved?: boolean }) {
  const vb = gridViewBox(puzzle);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${vb.width} ${vb.height}`}>
      {puzzle.type === "word_search" && <WordSearchGrid p={puzzle} solved={solved} />}
      {puzzle.type === "maze" && <MazeGrid p={puzzle} solved={solved} />}
      {puzzle.type === "sudoku" && <SudokuGrid p={puzzle} solved={solved} />}
      {puzzle.type === "crossword" && <CrosswordGrid p={puzzle} solved={solved} />}
    </Svg>
  );
}
