import { useState, useCallback } from 'react';
import './Navbar.css';

const Navbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(prev => !prev);
    }, []);

    return (
        <nav className="cosmos-navbar">
            <div className="cosmos-nav-logo mobile-logo">
                <span className="neon-text">ONEIROS</span>
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
                    <li><a href="#about">ABOUT</a></li>
                    <li><a href="#events">EVENTS</a></li>
                    <li><a href="#gallery">GALLERY</a></li>
                </ul>
                <div className="cosmos-nav-logo desktop-logo">
                    <span className="neon-text">ONEIROS</span>
                </div>
                <ul className="cosmos-nav-links right-links">
                    <li><a href="#schedule">SCHEDULE</a></li>
                    <li><a href="#sponsors">SPONSORS</a></li>
                    <li><a href="#contact">CONTACT</a></li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
