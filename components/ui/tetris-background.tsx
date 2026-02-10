"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

type Tetromino = {
    colors: [string, string, string];
    shape: number[][];
};

type GameState = {
    x: number;
    width: number;
    height: number;
    unit: number;
    boardWidth: number;
    boardHeight: number;
    board: (null | [string, string, string])[][];
    piece: {
        shape: number[][];
        x: number;
        y: number;
        colors: [string, string, string];
    };
    lastDrop: number;
    dropInterval: number;
};

const TETROMINOS: Tetromino[] = [
    {
        colors: ["rgb(59,84,165)", "rgb(118,137,196)", "rgb(79,111,182)"],
        shape: [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
        ],
    },
    {
        colors: ["rgb(214,30,60)", "rgb(241,108,107)", "rgb(236,42,75)"],
        shape: [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
        ],
    },
    {
        colors: ["rgb(88,178,71)", "rgb(150,204,110)", "rgb(115,191,68)"],
        shape: [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 1, 1],
            [0, 0, 0, 0],
        ],
    },
    {
        colors: ["rgb(62,170,212)", "rgb(120,205,244)", "rgb(54,192,240)"],
        shape: [
            [0, 0, 0, 0],
            [0, 1, 1, 1],
            [0, 0, 1, 0],
            [0, 0, 0, 0],
        ],
    },
    {
        colors: ["rgb(236,94,36)", "rgb(234,154,84)", "rgb(228,126,37)"],
        shape: [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [1, 1, 0, 0],
            [0, 0, 0, 0],
        ],
    },
    {
        colors: ["rgb(220,159,39)", "rgb(246,197,100)", "rgb(242,181,42)"],
        shape: [
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
        ],
    },
    {
        colors: ["rgb(158,35,126)", "rgb(193,111,173)", "rgb(179,63,151)"],
        shape: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
        ],
    },
];

const copyShape = (shape: number[][]) => shape.map((row) => row.slice());

const rotateShape = (shape: number[][]) => {
    const size = shape.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            rotated[y][x] = shape[size - x - 1][y];
        }
    }
    return rotated;
};

const createBoard = (width: number, height: number) =>
    Array.from({ length: height }, () => Array(width).fill(null));

const createPiece = (boardWidth: number) => {
    const tetromino = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
    return {
        shape: copyShape(tetromino.shape),
        x: Math.max(0, Math.floor((boardWidth - 4) / 2)),
        y: -2,
        colors: tetromino.colors,
    };
};

const canMove = (
    board: (null | [string, string, string])[][],
    piece: GameState["piece"],
    nextX: number,
    nextY: number
) => {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (!piece.shape[y][x]) continue;
            const boardX = nextX + x;
            const boardY = nextY + y;
            if (boardX < 0 || boardX >= board[0].length) return false;
            if (boardY >= board.length) return false;
            if (boardY >= 0 && board[boardY][boardX]) return false;
        }
    }
    return true;
};

const mergePiece = (board: GameState["board"], piece: GameState["piece"]) => {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (!piece.shape[y][x]) continue;
            const boardX = piece.x + x;
            const boardY = piece.y + y;
            if (boardY >= 0 && boardY < board.length && boardX >= 0 && boardX < board[0].length) {
                board[boardY][boardX] = piece.colors;
            }
        }
    }
};

const clearLines = (board: GameState["board"]) => {
    for (let y = board.length - 1; y >= 0; y--) {
        if (board[y].every((cell) => cell !== null)) {
            board.splice(y, 1);
            board.unshift(Array(board[0].length).fill(null));
            y++;
        }
    }
};

const seedBoard = (board: GameState["board"]) => {
    const height = board.length;
    const startRow = Math.floor(height * 0.25);
    for (let y = startRow; y < height; y++) {
        const depth = (y - startRow) / Math.max(1, height - startRow - 1);
        const density = 0.35 + depth * 0.5;
        for (let x = 0; x < board[0].length; x++) {
            if (Math.random() < density) {
                const tetromino = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
                board[y][x] = tetromino.colors;
            }
        }
    }
};

const createGame = (x: number, width: number, height: number, unit: number): GameState => {
    const boardWidth = Math.max(6, Math.floor(width / unit));
    const boardHeight = Math.max(12, Math.floor(height / unit));
    const board = createBoard(boardWidth, boardHeight);
    seedBoard(board);
    return {
        x,
        width,
        height,
        unit,
        boardWidth,
        boardHeight,
        board,
        piece: createPiece(boardWidth),
        lastDrop: 0,
        dropInterval: 35 + Math.random() * 55,
    };
};

export const TetrisBackground = ({ className }: { className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number | null>(null);
    const gamesRef = useRef<GameState[]>([]);
    const prefersReducedMotion = usePrefersReducedMotion();
    const lastFrameRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        const buildGames = () => {
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const unit = width < 768 ? 14 : 18;
            const boards = Math.max(2, Math.floor(width / 220));
            const boardWidth = Math.floor(width / boards);
            gamesRef.current = [];
            for (let i = 0; i < boards; i++) {
                gamesRef.current.push(createGame(i * boardWidth, boardWidth, height, unit));
            }
        };

        buildGames();

        const resizeObserver = new ResizeObserver(buildGames);
        resizeObserver.observe(canvas);

        const drawBoard = (game: GameState) => {
            const { board, unit, x } = game;
            for (let y = 0; y < board.length; y++) {
                for (let col = 0; col < board[y].length; col++) {
                    const colors = board[y][col];
                    if (!colors) continue;
                    const px = x + col * unit;
                    const py = y * unit;
                    ctx.fillStyle = colors[0];
                    ctx.fillRect(px, py, unit, unit);
                    ctx.fillStyle = colors[1];
                    ctx.fillRect(px + 2, py + 2, unit - 4, unit - 4);
                    ctx.fillStyle = colors[2];
                    ctx.fillRect(px + 4, py + 4, unit - 8, unit - 8);
                }
            }
        };

        const drawPiece = (game: GameState) => {
            const { piece, unit, x } = game;
            for (let y = 0; y < piece.shape.length; y++) {
                for (let col = 0; col < piece.shape[y].length; col++) {
                    if (!piece.shape[y][col]) continue;
                    const boardY = piece.y + y;
                    if (boardY < 0) continue;
                    const px = x + (piece.x + col) * unit;
                    const py = boardY * unit;
                    ctx.fillStyle = piece.colors[0];
                    ctx.fillRect(px, py, unit, unit);
                    ctx.fillStyle = piece.colors[1];
                    ctx.fillRect(px + 2, py + 2, unit - 4, unit - 4);
                    ctx.fillStyle = piece.colors[2];
                    ctx.fillRect(px + 4, py + 4, unit - 8, unit - 8);
                }
            }
        };

        const updateGame = (game: GameState, now: number) => {
            if (now - game.lastDrop < game.dropInterval) return;
            game.lastDrop = now;

            if (canMove(game.board, game.piece, game.piece.x, game.piece.y + 1)) {
                game.piece.y += 1;
                return;
            }

            mergePiece(game.board, game.piece);
            clearLines(game.board);
            game.piece = createPiece(game.boardWidth);

            if (!canMove(game.board, game.piece, game.piece.x, game.piece.y)) {
                game.board = createBoard(game.boardWidth, game.boardHeight);
                seedBoard(game.board);
            }

            if (Math.random() > 0.7) {
                const rotated = rotateShape(game.piece.shape);
                if (canMove(game.board, { ...game.piece, shape: rotated }, game.piece.x, game.piece.y)) {
                    game.piece.shape = rotated;
                }
            }
        };

        const drawFrame = (time: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 0.65;
            const now = time;
            gamesRef.current.forEach((game) => {
                updateGame(game, now);
                drawBoard(game);
                drawPiece(game);
            });
            ctx.globalAlpha = 1;
        };

        if (prefersReducedMotion) {
            drawFrame(performance.now());
            return () => {
                resizeObserver.disconnect();
            };
        }

        const targetFrameMs = 1000 / 30;
        const render = (time: number) => {
            if (time - lastFrameRef.current >= targetFrameMs) {
                lastFrameRef.current = time;
                drawFrame(time);
            }
            animationRef.current = requestAnimationFrame(render);
        };

        animationRef.current = requestAnimationFrame(render);

        const onVisibilityChange = () => {
            if (document.hidden && animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            } else if (!document.hidden && !animationRef.current) {
                animationRef.current = requestAnimationFrame(render);
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            resizeObserver.disconnect();
        };
    }, [prefersReducedMotion]);

    return (
        <canvas
            ref={canvasRef}
            className={cn("absolute inset-0 h-full w-full", className)}
            style={{ pointerEvents: "none" }}
        />
    );
};
