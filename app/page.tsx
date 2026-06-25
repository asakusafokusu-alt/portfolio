'use client';

import React, { useEffect, useRef, useState } from 'react';

// --- REUSABLE SCROLL REVEAL COMPONENT ---
interface ScrollRevealProps {
    children: React.ReactNode;
    delay?: string;
}

const ScrollReveal = ({ children, delay = '0ms' }: ScrollRevealProps) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            { threshold: 0.2 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: delay }}
            className={`transition-all duration-1000 ease-out transform ${
                isIntersecting
                    ? 'opacity-100 translate-y-0 filter blur-0'
                    : 'opacity-0 translate-y-8 filter blur-[2px]'
            }`}
        >
            {children}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function Page() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioInstance = useRef<HTMLAudioElement | null>(null);

    const [activeSection, setActiveSection] = useState(0);
    const [volume, setVolume] = useState(0.3);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(false);

    // Cosmic Fluid System with Fixed Edge-Exploding Comets
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const mouse = {
            x: -1000, y: -1000,
            prevX: -1000, prevY: -1000,
            vx: 0, vy: 0,
            smoothedVx: 0, smoothedVy: 0,
            radius: 85
        };

        const particlesArray: Particle[] = [];
        let activeComets: Comet[] = [];
        let explosionFragments: Fragment[] = [];

        const numberOfParticles = 1200;
        const spawnIntervalFrames = 1800; // 30 seconds at 60fps

        // --- STANDARD BACKGROUND COSMIC DUST ---
        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            alpha: number;
            baseSpeed: number;
            angleOffset: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = 0;
                this.vy = 0;
                this.size = Math.random() * 0.7 + 0.3;
                this.alpha = Math.random() * 0.4 + 0.2;
                this.baseSpeed = Math.random() * 0.5 + 0.2;
                this.angleOffset = Math.random() * Math.PI * 2;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
                ctx.fill();
            }

            update(time: number) {
                const flowAngle = Math.sin(this.x * 0.004 + time * 0.0008) * Math.cos(this.y * 0.004 + time * 0.0008) * Math.PI * 2 + this.angleOffset;

                const targetVx = Math.cos(flowAngle) * this.baseSpeed;
                const targetVy = Math.sin(flowAngle) * this.baseSpeed;

                this.vx += (targetVx - this.vx) * 0.02;
                this.vy += (targetVy - this.vy) * 0.02;

                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distance = Math.hypot(dx, dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const smoothForce = force * force;
                    const pushAngle = Math.atan2(dy, dx);

                    this.vx += Math.cos(pushAngle) * smoothForce * 4.5 + mouse.smoothedVx * smoothForce * 0.35;
                    this.vy += Math.sin(pushAngle) * smoothForce * 4.5 + mouse.smoothedVy * smoothForce * 0.35;
                }

                this.vx *= 0.94;
                this.vy *= 0.94;

                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }
        }

        // --- HIGH-SPEED BLAST FRAGMENT ---
        class Fragment {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            alpha: number;
            decay: number;
            toRemove: boolean;

            constructor(x: number, y: number, cometVx: number, cometVy: number) {
                this.x = x;
                this.y = y;

                // Creates a massive, energetic blast directed outwards away from the wall impact point
                const baseAngle = Math.atan2(cometVy, cometVx);
                const spreadAngle = baseAngle + (Math.random() - 0.5) * Math.PI * 1.5;
                const blastSpeed = Math.random() * 12 + 6; // Drastically increased force to throw them to edges

                this.vx = Math.cos(spreadAngle) * blastSpeed + cometVx * 0.4;
                this.vy = Math.sin(spreadAngle) * blastSpeed + cometVy * 0.4;

                this.size = Math.random() * 1.5 + 0.5; // Slightly chunkier sparks
                this.alpha = 1.0;
                this.decay = Math.random() * 0.02 + 0.015; // Lives slightly longer to hit far walls
                this.toRemove = false;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
                ctx.fill();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                this.vx *= 0.98; // Very low friction so they maintain crazy speeds
                this.vy *= 0.98;

                this.alpha -= this.decay;
                if (this.alpha <= 0) {
                    this.toRemove = true;
                }
            }
        }

        // --- FAST TIMED COMET ---
        class Comet {
            x: number = 0;
            y: number = 0;
            vx: number = 0;
            vy: number = 0;
            size: number = 0;
            hitRadius: number = 45; // Enhanced impact radius for background dust
            toRemove: boolean = false;
            hasExploded: boolean = false;
            lifeTicks: number = 0; // Tracks frames alive to prevent instant edge deaths

            constructor() {
                this.spawn();
            }

            spawn() {
                const side = Math.floor(Math.random() * 4);
                if (side === 0) { // Spawns Left -> Moves Right
                    this.x = 5; this.y = Math.random() * height;
                    this.vx = Math.random() * 5 + 8; this.vy = (Math.random() - 0.5) * 4;
                } else if (side === 1) { // Spawns Right -> Moves Left
                    this.x = width - 5; this.y = Math.random() * height;
                    this.vx = -(Math.random() * 5 + 8); this.vy = (Math.random() - 0.5) * 4;
                } else if (side === 2) { // Spawns Top -> Moves Bottom
                    this.x = Math.random() * width; this.y = 5;
                    this.vx = (Math.random() - 0.5) * 4; this.vy = Math.random() * 5 + 8;
                } else { // Spawns Bottom -> Moves Top
                    this.x = Math.random() * width; this.y = height - 5;
                    this.vx = (Math.random() - 0.5) * 4; this.vy = -(Math.random() * 5 + 8);
                }
                this.size = Math.random() * 1.5 + 1.5; // Easier to see
            }

            triggerExplosion() {
                if (this.hasExploded) return;
                this.hasExploded = true;
                this.toRemove = true;

                // Unleash 60 lightning-fast sparks
                for (let i = 0; i < 60; i++) {
                    explosionFragments.push(new Fragment(this.x, this.y, this.vx, this.vy));
                }
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#fff';
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            update(targets: Particle[]) {
                this.x += this.vx;
                this.y += this.vy;
                this.lifeTicks++;

                // Collide with standard dust
                for (let i = 0; i < targets.length; i++) {
                    const p = targets[i];
                    const cDx = p.x - this.x;
                    const cDy = p.y - this.y;
                    const cDist = Math.hypot(cDx, cDy);

                    if (cDist < this.hitRadius) {
                        const collisionForce = (this.hitRadius - cDist) / this.hitRadius;
                        p.vx += this.vx * collisionForce * 0.6;
                        p.vy += this.vy * collisionForce * 0.6;
                    }
                }

                // If it has been flying for more than 10 frames and touches any screen limit, boom!
                if (this.lifeTicks > 10) {
                    if (this.x <= 0 || this.x >= width || this.y <= 0 || this.y >= height) {
                        this.triggerExplosion();
                    }
                }
            }
        }

        for (let i = 0; i < numberOfParticles; i++) particlesArray.push(new Particle());

        let timeCount = 0;
        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            timeCount++;

            if (timeCount % spawnIntervalFrames === 0) {
                activeComets.push(new Comet());
            }

            mouse.smoothedVx += (mouse.vx - mouse.smoothedVx) * 0.12;
            mouse.smoothedVy += (mouse.vy - mouse.smoothedVy) * 0.12;

            // 1. Fluid Dust Layer
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update(timeCount);
                particlesArray[i].draw();
            }

            // 2. High-speed Shockwave Interceptor Comets
            for (let i = activeComets.length - 1; i >= 0; i--) {
                activeComets[i].update(particlesArray);
                if (!activeComets[i].toRemove) {
                    activeComets[i].draw();
                } else {
                    activeComets.splice(i, 1);
                }
            }

            // 3. Ultra-Fast Explosion Debris
            for (let i = explosionFragments.length - 1; i >= 0; i--) {
                explosionFragments[i].update();
                if (!explosionFragments[i].toRemove) {
                    explosionFragments[i].draw();
                } else {
                    explosionFragments.splice(i, 1);
                }
            }

            mouse.vx *= 0.85; mouse.vy *= 0.85;
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        const handleMouseMove = (e: MouseEvent) => {
            if (mouse.prevX !== -1000) {
                mouse.vx = e.clientX - mouse.prevX;
                mouse.vy = e.clientY - mouse.prevY;
            }
            mouse.x = e.clientX; mouse.y = e.clientY;
            mouse.prevX = e.clientX; mouse.prevY = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000; mouse.y = -1000;
            mouse.prevX = -1000; mouse.prevY = -1000;
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // --- AUTOPLAY MUSIC LOGIC ---
    useEffect(() => {
        const audio = new Audio('/audio/ausio.mp3');
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = volume;
        audioInstance.current = audio;

        const attemptAutoplay = () => {
            if (!audioInstance.current) return;
            audioInstance.current.play().then(() => {
                setIsPlaying(true);
                cleanupListeners();
            }).catch(() => {});
        };

        const cleanupListeners = () => {
            window.removeEventListener('click', attemptAutoplay);
            window.removeEventListener('keydown', attemptAutoplay);
            window.removeEventListener('wheel', attemptAutoplay);
            window.removeEventListener('touchstart', attemptAutoplay);
        };

        window.addEventListener('click', attemptAutoplay);
        window.addEventListener('keydown', attemptAutoplay);
        window.addEventListener('wheel', attemptAutoplay, { passive: true });
        window.addEventListener('touchstart', attemptAutoplay, { passive: true });

        attemptAutoplay();

        return () => {
            cleanupListeners();
            if (audioInstance.current) audioInstance.current.pause();
        };
    }, []);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioInstance.current) {
            audioInstance.current.volume = newVolume;
            if (newVolume === 0) {
                audioInstance.current.pause();
                setIsPlaying(false);
            } else if (audioInstance.current.paused && isPlaying) {
                audioInstance.current.play().catch(() => {});
            }
        }
    };

    const togglePlayback = () => {
        if (!audioInstance.current) return;
        if (isPlaying) {
            audioInstance.current.pause();
            setIsPlaying(false);
        } else {
            audioInstance.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
    };

    useEffect(() => {
        const sections = document.querySelectorAll('.snap-section');
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(Array.from(sections).indexOf(entry.target));
                    }
                });
            },
            { root: null, threshold: 0.5 }
        );
        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, []);

    const scrollToSection = (index: number) => {
        const sections = document.querySelectorAll('.snap-section');
        sections[index]?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="h-screen w-screen bg-[#0a0a0a] overflow-y-scroll snap-y snap-mandatory scroll-smooth select-none hide-scrollbar">
            <canvas ref={canvasRef} className="fixed inset-0 block pointer-events-none z-0" />

            {/* --- TOP HEADER ROW --- */}
            <div className="fixed top-0 left-0 w-full z-50 flex flex-col">
                <footer
                    className={`w-full border-b-2 border-white bg-[#050505] text-white select-none font-mono tracking-widest text-[10px] md:text-xs uppercase font-bold transition-all duration-300 ease-in-out overflow-hidden ${
                        isFooterVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none border-b-0'
                    }`}
                >
                    <div className="max-w-7xl mx-auto flex flex-row divide-x-2 divide-white">
                        <div className="p-3 md:p-4 flex-1 flex items-center gap-3">
                            <span className="text-white/40 hidden sm:inline">DESIGNED_BY //</span>
                            <span>RAESVET</span>
                        </div>
                        <div className="p-3 md:p-4 flex-1 flex items-center gap-3">
                            <span className="text-white/40 hidden sm:inline">SYSTEM //</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE_CORE_2026
                            </span>
                        </div>
                        <div className="p-3 md:p-4 pr-6 md:w-64 flex items-center justify-between">
                            <span className="text-white/40 hidden sm:inline">SYS_REF //</span>
                            <span>[wealthy.trade]</span>
                        </div>
                    </div>
                </footer>

                <header className="w-full px-8 py-4 flex justify-between items-center backdrop-blur-[2px] border-b border-white/5 bg-[#0a0a0a]/10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => scrollToSection(0)} className="text-white font-bold tracking-wider hover:opacity-80 transition-opacity focus:outline-none">
                            RAESVET
                        </button>
                        <button
                            onClick={() => setIsFooterVisible(!isFooterVisible)}
                            className="text-white/40 hover:text-white transition-transform duration-300 ease-in-out px-1 font-sans font-normal text-sm focus:outline-none"
                            style={{ transform: isFooterVisible ? 'rotate(0deg)' : 'rotate(180deg)' }}
                        >
                            ▲
                        </button>
                    </div>

                    <nav className="flex gap-8 text-sm tracking-widest text-white/50 font-light">
                        <button onClick={() => scrollToSection(1)} className={`hover:text-white transition-colors ${activeSection === 1 ? 'text-white font-medium' : ''}`}>PROJECTS</button>
                        <button onClick={() => scrollToSection(2)} className={`hover:text-white transition-colors ${activeSection === 2 ? 'text-white font-medium' : ''}`}>ABOUT</button>
                        <button onClick={() => scrollToSection(3)} className={`hover:text-white transition-colors ${activeSection === 3 ? 'text-white font-medium' : ''}`}>CONTACT</button>
                    </nav>
                </header>
            </div>

            {/* Side Indicators */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                {[0, 1, 2, 3, 4].map((index) => (
                    <button
                        key={index}
                        onClick={() => scrollToSection(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            activeSection === index ? 'bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20 hover:bg-white/50'
                        }`}
                        aria-label={`Go to section ${index + 1}`}
                    />
                ))}
            </div>

            {/* Music Controls */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 bg-black/40 border border-white/5 rounded-full z-50 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)] group hover:border-white/10 transition-all duration-300">
                <button onClick={togglePlayback} className="text-white/40 hover:text-white transition-colors text-xs tracking-widest font-light flex items-center gap-1.5 focus:outline-none">
                    <div className="flex gap-0.5 items-center h-2.5 w-3.5">
                        <span className={`w-[2px] bg-current rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse h-2.5' : 'h-1'}`} />
                        <span className={`w-[2px] bg-current rounded-full transition-all duration-300 delay-75 ${isPlaying ? 'animate-pulse h-1.5' : 'h-1'}`} />
                        <span className={`w-[2px] bg-current rounded-full transition-all duration-300 delay-150 ${isPlaying ? 'animate-pulse h-2' : 'h-1'}`} />
                    </div>
                    {isPlaying ? 'SOUND ON' : 'SOUND OFF'}
                </button>
                <div className="h-3 w-[1px] bg-white/10" />
                <input
                    type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange}
                    className="w-20 md:w-28 accent-white cursor-pointer opacity-30 group-hover:opacity-80 transition-opacity duration-300 filter drop-shadow-[0_0_4px_rgba(255,255,255,0.5)] h-1 rounded-lg"
                    style={{ background: `linear-gradient(to right, #fff ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)` }}
                />
            </div>

            {/* CONTENT SECTIONS */}
            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6 pt-32">
                <ScrollReveal>
                    <div className="text-center max-w-xl">
                        <h1 className="text-6xl font-bold text-white tracking-wide mix-blend-screen mb-4" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.3)' }}>RAESVET</h1>
                        <p className="text-white/40 text-lg tracking-wider font-light">Soundcloud rapper</p>
                    </div>
                </ScrollReveal>
            </section>

            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl flex flex-col gap-3">
                    <ScrollReveal><h2 className="text-4xl font-bold text-white tracking-wide">PROJECTS</h2></ScrollReveal>
                    <ScrollReveal delay="200ms"><p className="text-white/50 text-base leading-relaxed font-light">nothing much rn</p></ScrollReveal>
                </div>
            </section>

            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl flex flex-col gap-3">
                    <ScrollReveal><h2 className="text-4xl font-bold text-white tracking-wide">ABOUT ME</h2></ScrollReveal>
                    <ScrollReveal delay="200ms"><p className="text-white/50 text-base leading-relaxed font-light">I'm looking for a dev team like 2 people that know typescript and more to make a link in bio like guns.lol, i'm a beginner so hmu</p></ScrollReveal>
                </div>
            </section>

            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl flex flex-col gap-3">
                    <ScrollReveal><h2 className="text-4xl font-bold text-white tracking-wide">CONTACT</h2></ScrollReveal>
                    <ScrollReveal delay="200ms"><p className="text-white/50 text-base leading-relaxed font-light">discord: raesvet</p></ScrollReveal>
                </div>
            </section>

            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl">
                    <ScrollReveal>
                        <p className="text-2xl md:text-4xl font-bold text-white tracking-wide select-none animate-snow-dissolve"
                           style={{
                               textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.3)',
                               WebkitBackgroundClip: 'text',
                               WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.65) 85%, rgba(0,0,0,0.9) 100%)'
                           }}
                        >
                            There is not much to say more tbh, just hmu on dc, see ya
                        </p>
                    </ScrollReveal>
                </div>

                <style jsx global>{`
                    @keyframes snowFlurry {
                        0%, 100% { transform: translateY(0) scale(1); }
                        33% { transform: translateY(0.2px) scale(0.998); }
                        66% { transform: translateY(0.4px) scale(1.001); }
                    }
                    .animate-snow-dissolve { animation: snowFlurry 6s infinite ease-in-out; }
                `}</style>
            </section>
        </div>
    );
}
