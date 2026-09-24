import { useState, useEffect, useCallback } from 'react';
import './App.css';
import Login from './components/Login';
import AccountSettings from './components/AccountSettings';
import { onUserChanged, logout, getIdToken } from './firebase/authService';

const API_BASE_URL = '/api';

export default function App() {
    // ===== Auth =====
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // 'main' - гравці/команди, 'account' - налаштування акаунта (прив'язки)
    const [view, setView] = useState('main');

    useEffect(() => {
        const unsub = onUserChanged((currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);

            // після виходу наступний вхід має починатися з головної сторінки
            if (!currentUser) {
                setView('main');
            }
        });
        return unsub;
    }, []);

    // ===== App state =====
    const [activeTab, setActiveTab] = useState('players');
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [playerForm, setPlayerForm] = useState({ id: 0, name: '', age: '', position: '', teamId: '' });
    const [teamForm, setTeamForm] = useState({ id: 0, name: '', coach: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const resetForm = useCallback(() => {
        setPlayerForm({ id: 0, name: '', age: '', position: '', teamId: '' });
        setTeamForm({ id: 0, name: '', coach: '' });
        setIsEditing(false);
    }, []);

    // ===== Запити з токеном =====
    const authFetch = async (url, options = {}) => {
        const token = await getIdToken();
        const headers = {
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        return fetch(url, { ...options, headers });
    };

    const refreshTeamOptions = async () => {
        try {
            const response = await authFetch(`${API_BASE_URL}/teams`);
            if (!response.ok) return;
            const data = await response.json();
            setTeamOptions(data);
        } catch {
            setTeamOptions([]);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = activeTab === 'players' ? 'players' : 'teams';
            const response = await authFetch(`${API_BASE_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`Помилка завантаження: ${response.statusText}`);
            const data = await response.json();
            if (activeTab === 'players') setPlayers(data);
            else setTeams(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!user) return;

        let ignore = false;
        const load = async () => {
            resetForm();
            setLoading(true);
            setError(null);
            try {
                const endpoint = activeTab === 'players' ? 'players' : 'teams';
                const response = await authFetch(`${API_BASE_URL}/${endpoint}`);
                if (!response.ok) throw new Error(`Помилка завантаження: ${response.statusText}`);
                const data = await response.json();

                if (activeTab === 'players') {
                    const teamsResponse = await authFetch(`${API_BASE_URL}/teams`);
                    const teamsData = teamsResponse.ok ? await teamsResponse.json() : [];
                    if (!ignore) {
                        setPlayers(data);
                        setTeamOptions(teamsData);
                    }
                } else {
                    if (!ignore) {
                        setTeams(data);
                        setTeamOptions(data);
                    }
                }
            } catch (err) {
                if (!ignore) setError(err.message);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        load();
        return () => { ignore = true; };
    }, [activeTab, resetForm, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isPlayer = activeTab === 'players';
        const endpoint = isPlayer ? 'players' : 'teams';
        const formData = isPlayer
            ? { ...playerForm, age: Number(playerForm.age), teamId: playerForm.teamId ? Number(playerForm.teamId) : null }
            : teamForm;
        const url = isEditing ? `${API_BASE_URL}/${endpoint}/${formData.id}` : `${API_BASE_URL}/${endpoint}`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error('Не вдалося зберегти дані');
            resetForm();
            fetchData();
            if (!isPlayer) refreshTeamOptions();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        if (activeTab === 'players') {
            setPlayerForm({
                id: item.id,
                name: item.name || '',
                age: item.age ?? '',
                position: item.position || '',
                teamId: item.teamId ?? '',
            });
        } else {
            setTeamForm({
                id: item.id,
                name: item.name || '',
                coach: item.coach || '',
            });
        }
    };

    const requestDelete = (id, name) => setConfirmDialog({ id, name });
    const cancelDelete = () => setConfirmDialog(null);

    const confirmDelete = async () => {
        if (!confirmDialog) return;
        const id = confirmDialog.id;
        setConfirmDialog(null);
        const endpoint = activeTab === 'players' ? 'players' : 'teams';
        try {
            const response = await authFetch(`${API_BASE_URL}/${endpoint}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Помилка при видаленні');
            fetchData();
            if (activeTab === 'teams') refreshTeamOptions();
        } catch (err) {
            setError(err.message);
        }
    };

    // ===== Екрани =====
    if (authLoading) {
        return (
            <div className="login-page">
                <div className="loader" style={{ color: '#8b96b3' }}>
                    <div className="spinner"></div>
                    <span>Перевірка сесії...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    // ===== Налаштування акаунта (прив'язка способів входу) =====
    if (view === 'account') {
        return <AccountSettings onBack={() => setView('main')} />;
    }

    // ===== Основний інтерфейс =====
    return (
        <div className="app">
            <header className="header">
                <div className="header-inner">
                    <div className="brand">
                        <span className="brand-icon">⚽</span>
                        <div className="brand-text">
                            <span className="brand-title">Футбольна ліга</span>
                            <span className="brand-sub">Менеджер гравців та команд</span>
                        </div>
                    </div>
                    <nav className="nav">
                        <button
                            className={`nav-btn ${activeTab === 'players' ? 'active' : ''}`}
                            onClick={() => setActiveTab('players')}
                        >
                            Гравці
                        </button>
                        <button
                            className={`nav-btn ${activeTab === 'teams' ? 'active' : ''}`}
                            onClick={() => setActiveTab('teams')}
                        >
                            Команди
                        </button>
                    </nav>
                    <div className="user-info">
                        <span className="user-name">{user.displayName || user.email || 'Користувач'}</span>
                        <button
                            className="btn-logout"
                            onClick={() => setView('account')}
                            title="Прив'язка акаунтів і способи входу"
                        >
                            Акаунт
                        </button>
                        <button className="btn-logout" onClick={logout}>Вийти</button>
                    </div>
                </div>
            </header>

            <main className="main">
                {error && <div className="alert">{error}</div>}
                <div className="layout">
                    <section className="panel form-panel">
                        <div className="panel-head">
                            <h2>{isEditing ? 'Редагувати' : 'Додати'} {activeTab === 'players' ? 'гравця' : 'команду'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="form">
                            {activeTab === 'players' ? (
                                <>
                                    <div className="field">
                                        <label>Ім'я гравця</label>
                                        <input
                                            type="text"
                                            required
                                            value={playerForm.name}
                                            onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                                            placeholder="наприклад, Тимерлан Гусейнов"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Вік</label>
                                        <input
                                            type="number"
                                            required
                                            min="15"
                                            max="50"
                                            value={playerForm.age}
                                            onChange={(e) => setPlayerForm({ ...playerForm, age: e.target.value })}
                                            placeholder="25"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Позиція</label>
                                        <input
                                            type="text"
                                            required
                                            value={playerForm.position}
                                            onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                                            placeholder="наприклад, Форвард"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Команда</label>
                                        <select
                                            value={playerForm.teamId}
                                            onChange={(e) => setPlayerForm({ ...playerForm, teamId: e.target.value })}
                                        >
                                            <option value="">Без команди</option>
                                            {teamOptions.map((team) => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="field">
                                        <label>Назва команди</label>
                                        <input
                                            type="text"
                                            required
                                            value={teamForm.name}
                                            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                            placeholder="наприклад, ФК Чорноморець Одеса"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Тренер</label>
                                        <input
                                            type="text"
                                            required
                                            value={teamForm.coach}
                                            onChange={(e) => setTeamForm({ ...teamForm, coach: e.target.value })}
                                            placeholder="наприклад, Валерій Лобановський"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {isEditing ? 'Зберегти' : 'Створити'}
                                </button>
                                {isEditing && (
                                    <button type="button" className="btn btn-ghost" onClick={resetForm}>
                                        Скасувати
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section className="panel list-panel">
                        <div className="panel-head">
                            <h2>Список {activeTab === 'players' ? 'гравців' : 'команд'}</h2>
                            <span className="count">
                                {(activeTab === 'players' ? players : teams).length} записів
                            </span>
                        </div>
                        {loading ? (
                            <div className="loader">
                                <div className="spinner"></div>
                                <span>Завантаження...</span>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>{activeTab === 'players' ? "Ім'я" : 'Команда'}</th>
                                            {activeTab === 'players' ? (
                                                <>
                                                    <th>Вік</th>
                                                    <th>Позиція</th>
                                                    <th>Команда</th>
                                                </>
                                            ) : (
                                                <th>Тренер</th>
                                            )}
                                            <th>Дії</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(activeTab === 'players' ? players : teams).length === 0 ? (
                                            <tr>
                                                <td colSpan={activeTab === 'players' ? 6 : 4} className="empty">
                                                    Дані відсутні
                                                </td>
                                            </tr>
                                        ) : (
                                            (activeTab === 'players' ? players : teams).map((item) => (
                                                <tr key={item.id}>
                                                    <td className="id">#{item.id}</td>
                                                    <td className="name">{item.name}</td>
                                                    {activeTab === 'players' ? (
                                                        <>
                                                            <td>{item.age}</td>
                                                            <td>
                                                                <span className="badge">{item.position}</span>
                                                            </td>
                                                            <td className="team-name">{item.team || '—'}</td>
                                                        </>
                                                    ) : (
                                                        <td className="coach">{item.coach}</td>
                                                    )}
                                                    <td className="actions">
                                                        <button className="icon-btn edit" onClick={() => handleEdit(item)} title="Редагувати">
                                                            ✎
                                                        </button>
                                                        <button className="icon-btn delete" onClick={() => requestDelete(item.id, item.name)} title="Видалити">
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <span className="brand-icon">⚽</span>
                        <span>Футбольна ліга</span>
                    </div>
                    <p>Приклад на локалізацію: чиста архітектура ASP.NET Core Web API + React</p>
                    <p className="footer-copy">© {new Date().toLocaleString('uk-UA')}</p>
                </div>
            </footer>

            {confirmDialog && (
                <div className="modal-overlay" onClick={cancelDelete}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon">⚠</div>
                        <h3 className="modal-title">Видалити запис?</h3>
                        <p className="modal-text">
                            {activeTab === 'players' ? 'Гравця' : 'Команду'} «{confirmDialog.name}» буде видалено назавжди. Цю дію неможливо скасувати.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={cancelDelete}>Скасувати</button>
                            <button className="btn btn-danger" onClick={confirmDelete}>Видалити</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}