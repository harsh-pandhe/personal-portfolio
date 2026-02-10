"use client";

import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";

interface CrowdCanvasProps {
    src: string;
    rows?: number;
    cols?: number;
    className?: string;
}

type Peep = {
    image: HTMLImageElement;
    rect: number[];
    width: number;
    height: number;
    drawArgs: unknown[];
    x: number;
    y: number;
    anchorY: number;
    scaleX: number;
    walk: gsap.core.Timeline | null;
    setRect: (rect: number[]) => void;
    render: (ctx: CanvasRenderingContext2D) => void;
};

const CrowdCanvas = ({
    src,
    rows = 15,
    cols = 7,
    className,
}: CrowdCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const config = { src, rows, cols };

        // ── utils ──
        const randomRange = (min: number, max: number) =>
            min + Math.random() * (max - min);
        const randomIndex = <T,>(array: T[]) => (randomRange(0, array.length) | 0);
        const removeFromArray = <T,>(array: T[], i: number) => array.splice(i, 1)[0];
        const removeItemFromArray = <T,>(array: T[], item: T) =>
            removeFromArray(array, array.indexOf(item));
        const removeRandomFromArray = <T,>(array: T[]) =>
            removeFromArray(array, randomIndex(array));
        const getRandomFromArray = <T,>(array: T[]) =>
            array[randomIndex(array) | 0];

        // ── tween factories ──
        const stage = { width: 0, height: 0 };

        const resetPeep = (peep: Peep) => {
            const direction = Math.random() > 0.5 ? 1 : -1;
            const offsetY =
                100 - 250 * gsap.parseEase("power2.in")(Math.random());
            const startY = stage.height - peep.height + offsetY;
            let startX: number;
            let endX: number;

            if (direction === 1) {
                startX = -peep.width;
                endX = stage.width;
                peep.scaleX = 1;
            } else {
                startX = stage.width + peep.width;
                endX = 0;
                peep.scaleX = -1;
            }

            peep.x = startX;
            peep.y = startY;
            peep.anchorY = startY;

            return { startX, startY, endX };
        };

        const normalWalk = (peep: Peep, props: { startX: number; startY: number; endX: number }) => {
            const { startY, endX } = props;
            const xDuration = 10;
            const yDuration = 0.25;

            const tl = gsap.timeline();
            tl.timeScale(randomRange(0.5, 1.5));
            tl.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
            tl.to(
                peep,
                {
                    duration: yDuration,
                    repeat: xDuration / yDuration,
                    yoyo: true,
                    y: startY - 10,
                },
                0,
            );

            return tl;
        };

        const walks = [normalWalk];

        // ── peep factory ──
        const createPeep = (image: HTMLImageElement, rect: number[]): Peep => {
            const peep: Peep = {
                image,
                rect: [],
                width: 0,
                height: 0,
                drawArgs: [],
                x: 0,
                y: 0,
                anchorY: 0,
                scaleX: 1,
                walk: null,
                setRect(r: number[]) {
                    this.rect = r;
                    this.width = r[2];
                    this.height = r[3];
                    this.drawArgs = [this.image, ...r, 0, 0, this.width, this.height];
                },
                render(c: CanvasRenderingContext2D) {
                    c.save();
                    c.translate(this.x, this.y);
                    c.scale(this.scaleX, 1);
                    c.drawImage(
                        this.image,
                        this.rect[0],
                        this.rect[1],
                        this.rect[2],
                        this.rect[3],
                        0,
                        0,
                        this.width,
                        this.height,
                    );
                    c.restore();
                },
            };

            peep.setRect(rect);
            return peep;
        };

        // ── main ──
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";

        const allPeeps: Peep[] = [];
        const availablePeeps: Peep[] = [];
        const crowd: Peep[] = [];

        const createPeeps = () => {
            const { rows, cols } = config;
            const { naturalWidth: width, naturalHeight: height } = img;
            const total = rows * cols;
            const rectWidth = width / rows;
            const rectHeight = height / cols;

            for (let i = 0; i < total; i++) {
                allPeeps.push(
                    createPeep(img, [
                        (i % rows) * rectWidth,
                        ((i / rows) | 0) * rectHeight,
                        rectWidth,
                        rectHeight,
                    ]),
                );
            }
        };

        const addPeepToCrowd = (): Peep => {
            const peep = removeRandomFromArray(availablePeeps);
            const walkFn = getRandomFromArray(walks);
            const props = resetPeep(peep);
            const walk = walkFn(peep, props).eventCallback("onComplete", () => {
                removePeepFromCrowd(peep);
                addPeepToCrowd();
            });

            peep.walk = walk;
            crowd.push(peep);
            crowd.sort((a, b) => a.anchorY - b.anchorY);

            return peep;
        };

        const removePeepFromCrowd = (peep: Peep) => {
            removeItemFromArray(crowd, peep);
            availablePeeps.push(peep);
        };

        const initCrowd = () => {
            while (availablePeeps.length) {
                addPeepToCrowd().walk!.progress(Math.random());
            }
        };

        const render = () => {
            if (!canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(devicePixelRatio, devicePixelRatio);
            crowd.forEach((peep) => peep.render(ctx));
            ctx.restore();
        };

        const resize = () => {
            if (!canvas) return;
            stage.width = canvas.clientWidth;
            stage.height = canvas.clientHeight;
            canvas.width = stage.width * devicePixelRatio;
            canvas.height = stage.height * devicePixelRatio;

            crowd.forEach((peep) => peep.walk?.kill());
            crowd.length = 0;
            availablePeeps.length = 0;
            availablePeeps.push(...allPeeps);
            initCrowd();
        };

        const init = () => {
            createPeeps();
            resize();
            gsap.ticker.add(render);
        };

        img.onload = init;
        img.src = config.src;

        window.addEventListener("resize", resize);

        return () => {
            window.removeEventListener("resize", resize);
            gsap.ticker.remove(render);
            crowd.forEach((peep) => peep.walk?.kill());
        };
    }, [src, rows, cols]);

    return (
        <canvas
            ref={canvasRef}
            className={className ?? "absolute bottom-0 h-[90vh] w-full"}
        />
    );
};

export default CrowdCanvas;
