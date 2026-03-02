import { useState, useCallback } from 'react';
import './Navbar.css';

interface NavbarProps {
    onNavigate?: (page: string) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(prev => !prev);
    }, []);

    const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, page: string) => {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        onNavigate?.(page);
    }, [onNavigate]);

    return (
        <nav className="cosmos-navbar font-manrope">
            <div className="cosmos-nav-logo mobile-logo" onClick={() => onNavigate?.('')} style={{ cursor: 'pointer' }}>
                <img src="/oneiros-logo.png" alt="ONEIROS" className="logo-img" />
            </div>

            <button
                className={`mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={toggleMobileMenu}
                aria-label="Toggle Navigation"
            >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
            </button>

            <div className={`nav-links-container ${isMobileMenuOpen ? 'mobile-visible' : ''}`}>
                <ul className="cosmos-nav-links left-links">
                    <li><a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="font-medium tracking-[0.1em]">ABOUT</a></li>
                    <li><a href="#events" onClick={(e) => handleNavClick(e, 'events')} className="font-medium tracking-[0.1em]">EVENTS</a></li>
                    <li><a href="#gallery" onClick={(e) => handleNavClick(e, 'gallery')} className="font-medium tracking-[0.1em]">GALLERY</a></li>
                </ul>
                <div className="cosmos-nav-logo desktop-logo" onClick={() => onNavigate?.('')} style={{ cursor: 'pointer' }}>
                    <img src="/oneiros-logo.png" alt="ONEIROS" className="logo-img" />
                </div>
                <ul className="cosmos-nav-links right-links">
                    <li><a href="#schedule" onClick={(e) => handleNavClick(e, 'schedule')} className="font-medium tracking-[0.1em]">SCHEDULE</a></li>
                    <li><a href="#sponsors" onClick={(e) => handleNavClick(e, 'sponsors')} className="font-medium tracking-[0.1em]">SPONSORS</a></li>
                    <li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="font-medium tracking-[0.1em]">CONTACT</a></li>
                </ul>
            </div>
        </nav>
    );
}
