import { useState } from 'react';
import { fetchDrivers } from '../services/api';

const HomePage = () => {
    const [year, setYear] = useState('');
    const [grandPrix, setGrandPrix] = useState('');
    const [session, setSession] = useState('');
    const [drivers, setDrivers] = useState([]);

    const handleFetch = async () => {
        try {
            const data = await fetchDrivers(year, grandPrix, session);
            setDrivers(data);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
            />
            <input
                type="text"
                placeholder="Grand Prix"
                value={grandPrix}
                onChange={(e) => setGrandPrix(e.target.value)}
            />
            <input
                type="text"
                placeholder="Session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
            />
            <button onClick={handleFetch}>Fetch Drivers</button>
            <ul>
                {drivers.map((driver) => (
                    <li key={driver.driver_id}>{driver.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default HomePage;