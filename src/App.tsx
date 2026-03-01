import { useState } from 'react';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';

export default function App() {
    const [loading, setLoading] = useState(true);

    return (
        <>
            <Navbar />
            {loading && <Preloader onComplete={() => setLoading(false)} />}
            {!loading && (
                <div className="main-content">
                </div>
            )}
        </>
    )
}