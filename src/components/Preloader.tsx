import { useState, useEffect, useRef, useCallback } from 'react';
import './Preloader.css';
import preloaderVidDesktop from '../assets/intro_enhanced.webm';
import CosmicBackground from './CosmicBackground';

interface PreloaderProps {
    onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
    const [fadeOut, setFadeOut]     = useState(false);
    const [progress, setProgress]   = useState(0);
    const videoRef                  = useRef<HTMLVideoElement>(null);
    const lastProgressUpdate = useRef(0);

    const handleComplete = useCallback(() => {
        setFadeOut(true);
        window.dispatchEvent(new Event('start-experience'));
        setTimeout(() => { onComplete(); }, 500);
    }, [onComplete]);

    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (!video || !video.duration) return;

        const now = performance.now();
        if (now - lastProgressUpdate.current < 125) return;
        lastProgressUpdate.current = now;

        const rawPercent  = video.currentTime / video.duration;
        const easedPercent = 1 - Math.pow(1 - rawPercent, 5);
        setProgress(prev => {
            const next = Math.min(Math.round(easedPercent * 100), 100);
            return next !== prev ? next : prev;
        });
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.playbackRate = 1.2;
        video.play().catch(err => console.warn('Autoplay prevented:', err));

        // Pre-fetch models into browser cache
        fetch('/map.glb',       { priority: 'low' }).catch(() => {});
        fetch('/character.glb', { priority: 'low' }).catch(() => {});

        const fallbackTimer = setTimeout(handleComplete, 15000);
        return () => clearTimeout(fallbackTimer);
    }, [handleComplete]);

    return (
        <div className={`preloader-container ${fadeOut ? 'fade-out' : ''}`}>
            <CosmicBackground />

            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={handleComplete}
                onTimeUpdate={handleTimeUpdate}
                className="preloader-video"
            >
                <source src={preloaderVidDesktop} type="video/webm" />
            </video>

            <div className="loading-wrapper">
                <div className="loading-percentage">{progress}%</div>
                <div className="loading-text">Loading 3D Experience...</div>
                <div className="loading-bar-bg">
                    <div
                        className="loading-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
