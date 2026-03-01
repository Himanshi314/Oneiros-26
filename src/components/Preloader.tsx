import { useState, useEffect, useRef, useCallback } from 'react';
import './Preloader.css';
import preloaderVidDesktop from '../assets/intro_enhanced.webm';

interface PreloaderProps {
    onComplete: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
    const [fadeOut, setFadeOut] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleComplete = useCallback(() => {
        setFadeOut(true);
        setTimeout(() => {
            onComplete();
        }, 500); // matches CSS transition duration
    }, [onComplete]);

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            const { currentTime, duration } = videoRef.current;
            if (duration) {
                const rawPercent = currentTime / duration;
                // Ease-out curve, power of 5: rapidly jumps to ~90% earlier, then crawls
                const easedPercent = 1 - Math.pow(1 - rawPercent, 5);
                setProgress(Math.min(Math.round(easedPercent * 100), 100));
            }
        }
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 1.2;
            videoRef.current.play().catch(error => {
                console.warn("Autoplay was prevented by browser:", error);
            });
        }

        // Safety fallback timer in case 'onEnded' doesn't fire
        const fallbackTimer = setTimeout(handleComplete, 15000);

        return () => {
            clearTimeout(fallbackTimer);
        };
    }, [handleComplete]);

    return (
        <div className={`preloader-container ${fadeOut ? 'fade-out' : ''}`}>
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
                <source
                    src={preloaderVidDesktop}
                    type="video/webm"
                />
            </video>

            <div className="loading-wrapper">
                <div className="loading-percentage">{progress}%</div>
                <div className="loading-text">Loading 3D Experience...</div>
                <div className="loading-bar-bg">
                    <div
                        className="loading-bar-fill"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default Preloader;
