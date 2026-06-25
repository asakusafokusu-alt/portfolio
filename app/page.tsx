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

    // CLOSED BY DEFAULT: Toggle State initialized to false
    const [isFooterVisible, setIsFooterVisible] = useState(false);

    // Particle Wind System
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, vx: 0, vy: 0, radius: 150 };
        const particlesArray: any[] = [];
        const numberOfParticles = 250;

        class Particle {
            x: number; y: number; size: number; alpha: number;
            vx: number; vy: number; windX: number; windY: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 0.5 + 0.2;
                this.alpha = Math.random() * 0.4 + 0.2;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.windX = 0; this.windY = 0;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
                ctx.shadowBlur = 3;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            update() {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.hypot(dx, dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const dirX = dx / distance;
                    const dirY = dy / distance;
                    this.windX -= (dirX * force * 2) + (mouse.vx * force * 0.2);
                    this.windY -= (dirY * force * 2) + (mouse.vy * force * 0.2);
                }

                this.windX *= 0.95; this.windY *= 0.95;
                this.x += this.vx + this.windX;
                this.y += this.vy + this.windY;

                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }
        }

        for (let i = 0; i < numberOfParticles; i++) particlesArray.push(new Particle());

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            mouse.vx *= 0.8; mouse.vy *= 0.8;
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

    // --- SAFEST COMPATIBILITY AUTOPLAY LOGIC ---
    useEffect(() => {
        const audio = new Audio('/audio/ausio.mp3');
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = volume;
        audioInstance.current = audio;

        const attemptAutoplay = () => {
            if (!audioInstance.current) return;

            audioInstance.current.play()
                .then(() => {
                    setIsPlaying(true);
                    cleanupListeners();
                })
                .catch(() => {});
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
            if (audioInstance.current) {
                audioInstance.current.pause();
            }
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
            audioInstance.current.play()
                .then(() => {
                    setIsPlaying(true);
                })
                .catch((err) => {
                    console.error("Playback failed to start:", err);
                });
        }
    };

    // Section Tracking for Navigation Indicators
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

            {/* --- TOP FIXED CONTAINER --- */}
            <div className="fixed top-0 left-0 w-full z-50 flex flex-col">
                {/* Brutalist Utility Row with Dynamic Toggle Height */}
                <footer
                    className={`w-full border-b-2 border-white bg-[#050505] text-white select-none font-mono tracking-widest text-[10px] md:text-xs uppercase font-bold transition-all duration-300 ease-in-out overflow-hidden ${
                        isFooterVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none border-b-0'
                    }`}
                >
                    <div className="max-w-7xl mx-auto flex flex-row divide-x-2 divide-white">
                        {/* Box 1: Core Signature */}
                        <div className="p-3 md:p-4 flex-1 flex items-center gap-3">
                            <span className="text-white/40 hidden sm:inline">DESIGNED_BY //</span>
                            <span>RAESVET</span>
                        </div>

                        {/* Box 2: System Status Index */}
                        <div className="p-3 md:p-4 flex-1 flex items-center gap-3">
                            <span className="text-white/40 hidden sm:inline">SYSTEM //</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE_CORE_2026
                            </span>
                        </div>

                        {/* Box 3: Terminal Block Index */}
                        <div className="p-3 md:p-4 pr-6 md:w-64 flex items-center justify-between">
                            <span className="text-white/40 hidden sm:inline">SYS_REF //</span>
                            <span>[wealthy.trade]</span>
                        </div>
                    </div>
                </footer>

                {/* Sub-Header Navigation */}
                <header className="w-full px-8 py-4 flex justify-between items-center backdrop-blur-[2px] border-b border-white/5 bg-[#0a0a0a]/10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => scrollToSection(0)}
                            className="text-white font-bold tracking-wider hover:opacity-80 transition-opacity focus:outline-none"
                        >
                            RAESVET
                        </button>

                        {/* Persistent Toggle Arrow right next to RAESVET. Starts flipped 180° pointing downward */}
                        <button
                            onClick={() => setIsFooterVisible(!isFooterVisible)}
                            className="text-white/40 hover:text-white transition-transform duration-300 ease-in-out px-1 font-sans font-normal text-sm focus:outline-none"
                            style={{
                                transform: isFooterVisible ? 'rotate(0deg)' : 'rotate(180deg)',
                            }}
                            title={isFooterVisible ? "Hide panel" : "Show panel"}
                        >
                            ▲
                        </button>
                    </div>

                    <nav className="flex gap-8 text-sm tracking-widest text-white/50 font-light">
                        <button
                            onClick={() => scrollToSection(1)}
                            className={`hover:text-white transition-colors ${activeSection === 1 ? 'text-white font-medium' : ''}`}
                        >
                            PROJECTS
                        </button>
                        <button
                            onClick={() => scrollToSection(2)}
                            className={`hover:text-white transition-colors ${activeSection === 2 ? 'text-white font-medium' : ''}`}
                        >
                            ABOUT
                        </button>
                        <button
                            onClick={() => scrollToSection(3)}
                            className={`hover:text-white transition-colors ${activeSection === 3 ? 'text-white font-medium' : ''}`}
                        >
                            CONTACT
                        </button>
                    </nav>
                </header>
            </div>

            {/* Side Navigation Dots */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                {[0, 1, 2, 3, 4].map((index) => (
                    <button
                        key={index}
                        onClick={() => scrollToSection(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            activeSection === index
                                ? 'bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                                : 'bg-white/20 hover:bg-white/50'
                        }`}
                        aria-label={`Go to section ${index + 1}`}
                    />
                ))}
            </div>

            {/* Minimalist Bottom Volume Controller */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 bg-black/40 border border-white/5 rounded-full z-50 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)] group hover:border-white/10 transition-all duration-300">
                <button
                    onClick={togglePlayback}
                    className="text-white/40 hover:text-white transition-colors text-xs tracking-widest font-light flex items-center gap-1.5 focus:outline-none"
                >
                    <div className="flex gap-0.5 items-center h-2.5 w-3.5">
                        <span className={`w-[2px] bg-current rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse h-2.5' : 'h-1'}`} />
                        <span className={`w-[2px] bg-current rounded-full transition-all duration-300 delay-75 ${isPlaying ? 'animate-pulse h-1.5' : 'h-1'}`} />
                        <span className={`w-[2px] bg-current rounded-full transition-all duration-300 delay-150 ${isPlaying ? 'animate-pulse h-2' : 'h-1'}`} />
                    </div>
                    {isPlaying ? 'SOUND ON' : 'SOUND OFF'}
                </button>

                <div className="h-3 w-[1px] bg-white/10" />

                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 md:w-28 accent-white cursor-pointer opacity-30 group-hover:opacity-80 transition-opacity duration-300 filter drop-shadow-[0_0_4px_rgba(255,255,255,0.5)] h-1 rounded-lg"
                    style={{
                        background: `linear-gradient(to right, #fff ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
                    }}
                />
            </div>

            {/* --- SECTION 1 --- */}
            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6 pt-32">
                <ScrollReveal>
                    <div className="text-center max-w-xl">
                        <h1
                            className="text-6xl font-bold text-white tracking-wide mix-blend-screen mb-4"
                            style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.3)' }}
                        >
                            RAESVET
                        </h1>
                        <p className="text-white/40 text-lg tracking-wider font-light">
                            Soundcloud rapper
                        </p>
                    </div>
                </ScrollReveal>
            </section>

            {/* --- SECTION 2 --- */}
            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl flex flex-col gap-3">
                    <ScrollReveal>
                        <h2 className="text-4xl font-bold text-white tracking-wide">
                            PROJECTS
                        </h2>
                    </ScrollReveal>
                    <ScrollReveal delay="200ms">
                        <p className="text-white/50 text-base leading-relaxed font-light">
                            nothing much rn
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* --- SECTION 3 --- */}
            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl flex flex-col gap-3">
                    <ScrollReveal>
                        <h2 className="text-4xl font-bold text-white tracking-wide">
                            ABOUT ME
                        </h2>
                    </ScrollReveal>
                    <ScrollReveal delay="200ms">
                        <p className="text-white/50 text-base leading-relaxed font-light">
                            I'm looking for a dev team like 2 people that know typescript and more to make a link in bio like guns.lol, i'm a beginner so hmu
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* --- SECTION 4 --- */}
            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl flex flex-col gap-3">
                    <ScrollReveal>
                        <h2 className="text-4xl font-bold text-white tracking-wide">
                            CONTACT
                        </h2>
                    </ScrollReveal>
                    <ScrollReveal delay="200ms">
                        <p className="text-white/50 text-base leading-relaxed font-light">
                            discord: raesvet
                        </p>
                    </ScrollReveal>
                </div>
            </section>

            {/* --- SECTION 5 --- */}
            <section className="snap-section w-full h-screen flex items-center justify-center relative z-10 snap-start px-6">
                <div className="text-center max-w-xl">
                    <ScrollReveal>
                        <p
                            className="text-2xl md:text-4xl font-bold text-white tracking-wide select-none animate-snow-dissolve"
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

                {/* Subtle Snow Micro-Particle Shimmer */}
                <style jsx global>{`
                    @keyframes snowFlurry {
                        0%, 100% {
                            text-shadow:
                                    0 0 10px rgba(255, 255, 255, 0.8),
                                    0 0 20px rgba(255, 255, 255, 0.3),
                                    1px 1px 2px rgba(255,255,255,0.2),
                                    -1px -1px 1px rgba(255,255,255,0.1);
                            transform: translateY(0) scale(1);
                        }
                        33% {
                            text-shadow:
                                    0 0 12px rgba(255, 255, 255, 0.85),
                                    0 0 22px rgba(255, 255, 255, 0.35),
                                    1.5px 2px 3px rgba(255,255,255,0.4),
                                    -1.5px 0.5px 2px rgba(255,255,255,0.2);
                            transform: translateY(0.2px) scale(0.998);
                        }
                        66% {
                            text-shadow:
                                    0 0 9px rgba(255, 255, 255, 0.75),
                                    0 0 18px rgba(255, 255, 255, 0.25),
                                    0.5px 3px 4px rgba(255,255,255,0.3),
                                    -0.5px 1.5px 1px rgba(255,255,255,0.1);
                            transform: translateY(0.4px) scale(1.001);
                        }
                    }

                    .animate-snow-dissolve {
                        animation: snowFlurry 6s infinite ease-in-out;
                    }
                `}</style>
            </section>
        </div>
    );
}