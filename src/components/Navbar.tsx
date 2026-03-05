import { useState, useCallback } from 'react';
import './Navbar.css';

interface NavbarProps {
    onNavigate?: (page: string) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navMenuId = 'primary-navigation';

    const toggleMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(prev => !prev);
    }, []);

    const handleHomeClick = useCallback(() => {
        setIsMobileMenuOpen(false);
        onNavigate?.('');
    }, [onNavigate]);

    const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, page: string) => {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        onNavigate?.(page);
    }, [onNavigate]);

    return (
        <nav className="cosmos-navbar font-manrope">
            <button type="button" className="cosmos-nav-logo mobile-logo nav-logo-btn" onClick={handleHomeClick} aria-label="Go to home">
                <img src="/oneiros-logo.png" alt="ONEIROS" className="logo-img" />
            </button>

            <button
                type="button"
                className={`mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={toggleMobileMenu}
                aria-label="Toggle Navigation"
                aria-expanded={isMobileMenuOpen}
                aria-controls={navMenuId}
            >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
            </button>

            <div id={navMenuId} className={`nav-links-container ${isMobileMenuOpen ? 'mobile-visible' : ''}`}>
                <ul className="cosmos-nav-links left-links">
                    <li><a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="font-medium tracking-[0.1em]">ABOUT</a></li>
                    <li><a href="#major-events" onClick={(e) => handleNavClick(e, 'major-events')} className="font-medium tracking-[0.1em]">MAJOR EVENTS</a></li>
                    <li><a href="#minor-events" onClick={(e) => handleNavClick(e, 'minor-events')} className="font-medium tracking-[0.1em]">MINOR EVENTS</a></li>
                </ul>
                <button type="button" className="cosmos-nav-logo desktop-logo nav-logo-btn" onClick={handleHomeClick} aria-label="Go to home">
                    <img src="/oneiros-logo.png" alt="ONEIROS" className="logo-img" />
                </button>
                <ul className="cosmos-nav-links right-links">
                    <li><a href="#schedule" onClick={(e) => handleNavClick(e, 'schedule')} className="font-medium tracking-[0.1em]">SCHEDULE</a></li>
                    <li><a href="#sponsors" onClick={(e) => handleNavClick(e, 'sponsors')} className="font-medium tracking-[0.1em]">SPONSORS</a></li>
                    <li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="font-medium tracking-[0.1em]">CONTACT</a></li>
                </ul>
            </div>
        </nav>
    );
}
