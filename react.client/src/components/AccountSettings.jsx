import { useEffect, useState } from 'react';

import {
    onUserChanged,
    normalizePhoneNumber,
    isValidPhoneNumber
} from '../firebase/authService';

import {
    PROVIDER_IDS,
    getLinkedProviders,
    linkProvider,
    linkPassword,
    unlinkProvider,
    sendPhoneLinkCode,
    confirmPhoneLink,
    cancelPhoneLink,
    mapLinkError
} from '../firebase/accountLinking';

import './styles/AccountSettings.css';

const PROVIDERS = [
    { id: PROVIDER_IDS.google, label: 'Google', icon: 'G', kind: 'oauth' },
    { id: PROVIDER_IDS.github, label: 'GitHub', icon: '</>', kind: 'oauth' },
    { id: PROVIDER_IDS.password, label: 'Email і пароль', icon: '@', kind: 'password' },
    { id: PROVIDER_IDS.phone, label: 'Номер телефону', icon: '#', kind: 'phone' }
];

function AccountSettings({ onBack }) {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [providers, setProviders] = useState([]);

    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // яка форма зараз відкрита: 'password' | 'phone' | null
    const [openForm, setOpenForm] = useState(null);
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);

    useEffect(() => {
        const unsubscribe = onUserChanged((currentUser) => {
            setUser(currentUser);
            setProviders(getLinkedProviders(currentUser));
            setAuthReady(true);
        });

        return () => {
            unsubscribe();
            cancelPhoneLink();
        };
    }, []);

    // виконує дію, показує результат і не дає натискати кнопки паралельно
    async function run(action, successMessage) {
        setBusy(true);
        setError('');
        setMessage('');

        try {
            const updatedProviders = await action();

            if (updatedProviders) {
                setProviders(updatedProviders);
            }

            if (successMessage) {
                setMessage(successMessage);
            }

            return true;
        } catch (err) {
            const text = mapLinkError(err);

            if (text) {
                setError(text);
            }

            return false;
        } finally {
            setBusy(false);
        }
    }

    function closeForms() {
        cancelPhoneLink();
        setOpenForm(null);
        setPassword('');
        setPhone('');
        setCode('');
        setCodeSent(false);
    }

    function toggleForm(formName) {
        setError('');
        setMessage('');

        if (openForm === formName) {
            closeForms();
            return;
        }

        closeForms();
        setOpenForm(formName);
    }

    function handleLinkOAuth(provider) {
        return run(
            () => linkProvider(provider.id),
            `${provider.label} прив'язано до акаунта.`
        );
    }

    function handleUnlink(provider) {
        const confirmed = window.confirm(
            `Відв'язати ${provider.label}? Увійти цим способом більше не вдасться.`
        );

        if (!confirmed) {
            return;
        }

        return run(
            () => unlinkProvider(provider.id),
            `${provider.label} відв'язано.`
        );
    }

    async function handleLinkPassword(event) {
        event.preventDefault();

        if (password.length < 6) {
            setError('Пароль має містити щонайменше 6 символів.');
            return;
        }

        const ok = await run(
            () => linkPassword(password),
            'Тепер можна входити за поштою і паролем.'
        );

        if (ok) {
            closeForms();
        }
    }

    async function handleSendCode(event) {
        event.preventDefault();

        const normalized = normalizePhoneNumber(phone);

        if (!isValidPhoneNumber(normalized)) {
            setError('Введіть номер у форматі +380501234567.');
            return;
        }

        await run(async () => {
            await sendPhoneLinkCode(normalized);
            setCodeSent(true);
            return null;
        }, 'Код надіслано. Введіть його нижче.');
    }

    async function handleConfirmCode(event) {
        event.preventDefault();

        if (!code.trim()) {
            setError('Введіть код із SMS.');
            return;
        }

        const ok = await run(
            () => confirmPhoneLink(code.trim()),
            'Номер телефону прив\'язано.'
        );

        if (ok) {
            closeForms();
        }
    }

    if (!authReady) {
        return (
            <div className="account-page">
                <div className="account-card">
                    <div className="account-loading">
                        <div className="account-spinner" />
                        Завантаження...
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="account-page">
                <div className="account-card">
                    <h1>Налаштування акаунта</h1>
                    <p className="account-description">
                        Увійдіть, щоб керувати способами входу.
                    </p>
                </div>
            </div>
        );
    }

    const canLinkPassword = Boolean(user.email && user.emailVerified);
    const onlyOneProvider = providers.length <= 1;

    return (
        <div className="account-page">
            <div className="account-card">
                {onBack && (
                    <button type="button" className="account-back" onClick={onBack}>
                        Назад
                    </button>
                )}

                <h1>Налаштування акаунта</h1>

                <p className="account-description">
                    Прив'яжіть кілька способів входу до одного профілю, щоб не втрачати
                    доступ і не створювати дублікатів.
                </p>

                <div className="account-identity">
                    <div className="account-identity-email">
                        {user.email || user.phoneNumber || 'Без пошти'}
                    </div>

                    {user.email && (
                        <div
                            className={
                                user.emailVerified
                                    ? 'account-badge verified'
                                    : 'account-badge unverified'
                            }
                        >
                            {user.emailVerified ? 'Пошту підтверджено' : 'Пошту не підтверджено'}
                        </div>
                    )}
                </div>

                <ul className="account-providers">
                    {PROVIDERS.map((provider) => {
                        const linked = providers.find(
                            (item) => item.providerId === provider.id
                        );

                        const details = linked?.email || linked?.phoneNumber || '';

                        const emailMismatch =
                            linked?.email &&
                            user.email &&
                            linked.email.toLowerCase() !== user.email.toLowerCase();

                        const isPasswordBlocked =
                            provider.kind === 'password' && !linked && !canLinkPassword;

                        return (
                            <li key={provider.id} className="account-provider">
                                <div className="account-provider-row">
                                    <span className="account-provider-icon">{provider.icon}</span>

                                    <div className="account-provider-info">
                                        <div className="account-provider-name">{provider.label}</div>

                                        <div className="account-provider-status">
                                            {linked
                                                ? details || 'Прив\'язано'
                                                : 'Не прив\'язано'}
                                        </div>

                                        {emailMismatch && (
                                            <div className="account-provider-warning">
                                                Пошта відрізняється від основної
                                            </div>
                                        )}

                                        {isPasswordBlocked && (
                                            <div className="account-provider-warning">
                                                Потрібна підтверджена пошта. Спершу прив'яжіть Google
                                                або GitHub.
                                            </div>
                                        )}
                                    </div>

                                    {linked ? (
                                        <button
                                            type="button"
                                            className="account-btn danger"
                                            disabled={busy || onlyOneProvider}
                                            title={
                                                onlyOneProvider
                                                    ? 'Це єдиний спосіб входу'
                                                    : undefined
                                            }
                                            onClick={() => handleUnlink(provider)}
                                        >
                                            Відв'язати
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="account-btn"
                                            disabled={busy || isPasswordBlocked}
                                            onClick={() =>
                                                provider.kind === 'oauth'
                                                    ? handleLinkOAuth(provider)
                                                    : toggleForm(provider.kind)
                                            }
                                        >
                                            {openForm === provider.kind ? 'Скасувати' : 'Прив\'язати'}
                                        </button>
                                    )}
                                </div>

                                {provider.kind === 'password' && openForm === 'password' && (
                                    <form className="account-form" onSubmit={handleLinkPassword}>
                                        <label htmlFor="link-password">
                                            Пароль для {user.email}
                                        </label>
                                        <input
                                            id="link-password"
                                            type="password"
                                            autoComplete="new-password"
                                            placeholder="Щонайменше 6 символів"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            disabled={busy}
                                        />
                                        <button
                                            type="submit"
                                            className="account-btn primary"
                                            disabled={busy}
                                        >
                                            Зберегти пароль
                                        </button>
                                    </form>
                                )}

                                {provider.kind === 'phone' && openForm === 'phone' && (
                                    <form
                                        className="account-form"
                                        onSubmit={codeSent ? handleConfirmCode : handleSendCode}
                                    >
                                        <label htmlFor="link-phone">Номер телефону</label>
                                        <input
                                            id="link-phone"
                                            type="tel"
                                            autoComplete="tel"
                                            placeholder="+380501234567"
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                            disabled={busy || codeSent}
                                        />

                                        {codeSent && (
                                            <>
                                                <label htmlFor="link-code">Код із SMS</label>
                                                <input
                                                    id="link-code"
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    placeholder="123456"
                                                    value={code}
                                                    onChange={(event) => setCode(event.target.value)}
                                                    disabled={busy}
                                                />
                                            </>
                                        )}

                                        <button
                                            type="submit"
                                            className="account-btn primary"
                                            disabled={busy}
                                        >
                                            {codeSent ? 'Підтвердити код' : 'Надіслати код'}
                                        </button>

                                        {codeSent && (
                                            <button
                                                type="button"
                                                className="account-link-btn"
                                                disabled={busy}
                                                onClick={() => {
                                                    cancelPhoneLink();
                                                    setCodeSent(false);
                                                    setCode('');
                                                }}
                                            >
                                                Змінити номер
                                            </button>
                                        )}
                                    </form>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {busy && (
                    <div className="account-loading">
                        <div className="account-spinner" />
                        Зачекайте...
                    </div>
                )}

                {message && <div className="account-message">{message}</div>}
                {error && <div className="account-error">{error}</div>}

                {/* сюди Firebase вставляє невидиму reCAPTCHA для прив'язки телефону */}
                <div id="recaptcha-link-container" />
            </div>
        </div>
    );
}

export default AccountSettings;