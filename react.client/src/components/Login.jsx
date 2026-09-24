import { useEffect, useState } from 'react';

import {
    loginWithGitHub,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resendEmailVerification,
    resetPassword,
    sendPhoneCode,
    confirmPhoneCode,
    cancelPhoneVerification,
    normalizePhoneNumber,
    isValidPhoneNumber
} from '../firebase/authService';

import { describeAccountExistsError } from '../firebase/accountLinking';

import './styles/Login.css';

// вмикаємо Sign-In Method > Phone у Firebase Console
// вказуємо тестові номери
// Settings > SMS region policy > List of regions > Allow for Ukraine

// пауза між повторними надсиланнями
const RESEND_COOLDOWN_SECONDS = 60;

function getPhoneErrorMessage(error, fallback) {
    switch (error.code) {
        case 'auth/invalid-phone-number':
            return 'Некоректний номер телефону. Приклад: +380501234567.';
        case 'auth/missing-phone-number':
            return 'Введіть номер телефону.';
        case 'auth/invalid-verification-code':
            return 'Невірний код. Перевірте й спробуйте ще раз.';
        case 'auth/code-expired':
            return 'Термін дії коду минув. Надішліть новий код.';
        case 'auth/no-pending-verification':
            return 'Спочатку надішліть код на номер телефону.';
        case 'auth/captcha-check-failed':
            return 'Не вдалося пройти перевірку reCAPTCHA. Спробуйте ще раз.';
        case 'auth/too-many-requests':
            return 'Занадто багато спроб. Спробуйте пізніше.';
        case 'auth/quota-exceeded':
            return 'Ліміт SMS вичерпано. Спробуйте пізніше.';
        case 'auth/operation-not-allowed':
            return 'Вхід за номером телефону не ввімкнено або цей регіон заборонено в налаштуваннях Firebase.';
        case 'auth/network-request-failed':
            return 'Помилка мережі. Перевірте підключення до інтернету.';
        default:
            return fallback;
    }
}

export default function Login() {
    const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // показувати кнопку "надіслати лист повторно" лише коли це доречно:
    // після реєстрації або після спроби входу з непідтвердженим email
    const [needsVerification, setNeedsVerification] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [codeCooldown, setCodeCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCooldown((value) => value - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [cooldown]);

    useEffect(() => {
        if (codeCooldown <= 0) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCodeCooldown((value) => value - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [codeCooldown]);

    // прибираємо reCAPTCHA, якщо компонент зникає зі сторінки
    useEffect(() => {
        return () => cancelPhoneVerification();
    }, []);

    const clearMessages = () => {
        setError('');
        setMessage('');
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        clearMessages();

        try {
            await loginWithGoogle();
        } catch (error) {
            console.error(error);

            if (error.code === 'auth/popup-closed-by-user') {
                setError('Вікно входу було закрито.');
            } else if (error.code === 'auth/popup-blocked') {
                setError('Браузер заблокував спливаюче вікно.');
            } else if (
                error.code === 'auth/account-exists-with-different-credential'
            ) {
                // підказуємо, яким способом увійти, щоб акаунти об'єдналися
                setError(await describeAccountExistsError(error));
            } else {
                setError('Не вдалося виконати вхід через Google.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubLogin = async () => {
        setLoading(true);
        clearMessages();

        try {
            await loginWithGitHub();
        } catch (error) {
            console.error(error);

            if (error.code === 'auth/popup-closed-by-user') {
                setError('Вікно входу було закрито.');
            } else if (error.code === 'auth/popup-blocked') {
                setError('Браузер заблокував спливаюче вікно.');
            } else if (
                error.code === 'auth/account-exists-with-different-credential'
            ) {
                // підказуємо, яким способом увійти, щоб акаунти об'єдналися
                setError(await describeAccountExistsError(error));
            } else {
                setError('Не вдалося виконати вхід через GitHub.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (event) => {
        event.preventDefault();

        clearMessages();

        if (!email.trim()) {
            setError('Введіть email.');
            return;
        }

        if (!password) {
            setError('Введіть пароль.');
            return;
        }

        setLoading(true);

        try {
            if (isRegistering) {
                await registerWithEmail(email.trim(), password);

                // переходимо в режим входу, щоб поруч була кнопка
                // повторного надсилання листа
                setIsRegistering(false);
                setNeedsVerification(true);
                setCooldown(RESEND_COOLDOWN_SECONDS);

                setMessage(
                    `Акаунт створено! Зайдіть на свою пошту (${email.trim()}) та підтвердьте обліковий запис за посиланням у листі. Після цього поверніться сюди й увійдіть. Якщо листа немає, перевірте папку «Спам».`
                );
            } else {
                await loginWithEmail(email.trim(), password);
            }
        } catch (error) {
            console.error(error);

            if (error.code === 'auth/email-not-verified') {
                setNeedsVerification(true);

                setError(
                    'Email ще не підтверджено. Зайдіть на свою пошту та перейдіть за посиланням у листі, або надішліть лист повторно.'
                );
            } else if (error.code === 'auth/email-already-in-use') {
                setError(
                    'Користувач із таким email уже існує. Спробуйте увійти.'
                );
            } else if (error.code === 'auth/invalid-credential') {
                setError('Неправильний email або пароль.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Введіть коректну адресу електронної пошти.');
            } else if (error.code === 'auth/weak-password') {
                setError('Пароль має містити щонайменше 6 символів.');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Занадто багато спроб. Спробуйте пізніше.');
            } else if (error.code === 'auth/network-request-failed') {
                setError(
                    'Помилка мережі. Перевірте підключення до інтернету.'
                );
            } else if (error.code === 'auth/unauthorized-continue-uri') {
                setError(
                    'Домен для переходу після підтвердження не додано в Authorized domains у Firebase.'
                );
            } else {
                setError(
                    isRegistering
                        ? 'Не вдалося створити акаунт.'
                        : 'Не вдалося виконати вхід.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        clearMessages();

        if (!email.trim()) {
            setError('Введіть email.');
            return;
        }

        if (!password) {
            setError(
                'Введіть пароль, щоб повторно надіслати лист підтвердження.'
            );
            return;
        }

        setLoading(true);

        try {
            const alreadyVerified = await resendEmailVerification(
                email.trim(),
                password
            );

            if (alreadyVerified) {
                setNeedsVerification(false);
                setMessage('Email уже підтверджено. Можете входити.');
            } else {
                setCooldown(RESEND_COOLDOWN_SECONDS);

                setMessage(
                    'Лист для підтвердження email надіслано повторно. Перевірте пошту та папку «Спам».'
                );
            }
        } catch (error) {
            console.error(error);

            if (error.code === 'auth/invalid-credential') {
                setError('Неправильний email або пароль.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Введіть коректну адресу електронної пошти.');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Занадто багато запитів. Спробуйте пізніше.');
            } else if (error.code === 'auth/network-request-failed') {
                setError(
                    'Помилка мережі. Перевірте підключення до інтернету.'
                );
            } else if (error.code === 'auth/unauthorized-continue-uri') {
                setError(
                    'Домен для переходу після підтвердження не додано в Authorized domains у Firebase.'
                );
            } else {
                setError(
                    'Не вдалося повторно надіслати лист підтвердження.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        clearMessages();

        if (!email.trim()) {
            setError('Введіть email для відновлення пароля.');
            return;
        }

        setLoading(true);

        try {
            await resetPassword(email.trim());

            setMessage(
                'Лист для відновлення пароля надіслано на вашу електронну пошту.'
            );
        } catch (error) {
            console.error(error);

            if (error.code === 'auth/invalid-email') {
                setError('Введіть коректну адресу електронної пошти.');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Занадто багато запитів. Спробуйте пізніше.');
            } else if (error.code === 'auth/network-request-failed') {
                setError(
                    'Помилка мережі. Перевірте підключення до інтернету.'
                );
            } else {
                setError(
                    'Не вдалося надіслати лист для відновлення пароля.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // ---------- вхід за номером телефону ----------

    const handleSendCode = async (event) => {
        if (event) {
            event.preventDefault();
        }

        clearMessages();

        const normalized = normalizePhoneNumber(phone);

        if (!normalized) {
            setError('Введіть номер телефону.');
            return;
        }

        if (!isValidPhoneNumber(normalized)) {
            setError(
                'Введіть номер у міжнародному форматі, наприклад +380501234567.'
            );
            return;
        }

        setLoading(true);

        try {
            await sendPhoneCode(normalized);

            setPhone(normalized);
            setCode('');
            setCodeSent(true);
            setCodeCooldown(RESEND_COOLDOWN_SECONDS);

            setMessage(`Ми надіслали SMS з кодом на номер ${normalized}.`);
        } catch (error) {
            console.error(error);

            setError(
                getPhoneErrorMessage(error, 'Не вдалося надіслати код.')
            );
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCode = async (event) => {
        event.preventDefault();

        clearMessages();

        const trimmedCode = code.trim();

        if (!/^\d{6}$/.test(trimmedCode)) {
            setError('Введіть 6-значний код із SMS.');
            return;
        }

        setLoading(true);

        try {
            await confirmPhoneCode(trimmedCode);
        } catch (error) {
            console.error(error);

            setError(
                getPhoneErrorMessage(error, 'Не вдалося підтвердити код.')
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChangeNumber = () => {
        cancelPhoneVerification();

        setCodeSent(false);
        setCode('');
        setCodeCooldown(0);
        clearMessages();
    };

    const toggleAuthMethod = () => {
        cancelPhoneVerification();

        setAuthMethod((value) => (value === 'email' ? 'phone' : 'email'));
        setIsRegistering(false);
        setNeedsVerification(false);
        setCodeSent(false);
        setCode('');
        setCodeCooldown(0);
        clearMessages();
    };

    const toggleMode = () => {
        setIsRegistering((value) => !value);
        setNeedsVerification(false);
        clearMessages();
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    ⚽
                </div>

                <h1>Футбольна ліга</h1>

                <p className="login-description">
                    Менеджер гравців та команд
                </p>

                <div className="login-buttons">
                    <button
                        className="login-btn google"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <svg
                            className="login-provider-icon"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fill="#4285F4"
                                d="M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.93-4.18 2.93-7.4z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.7z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M6.54 13.79A5.85 5.85 0 0 1 6.24 12c0-.62.11-1.22.3-1.79V7.69H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.31l3.24-2.52z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 6.18c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.15 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.39l3.24 2.52C7.31 7.9 9.46 6.18 12 6.18z"
                            />
                        </svg>

                        <span>Увійти через Google</span>
                    </button>

                    <button
                        className="login-btn github"
                        onClick={handleGitHubLogin}
                        disabled={loading}
                    >
                        <svg
                            className="login-provider-icon github-icon"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fill="currentColor"
                                d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.1c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.67 1.24 3.32.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.73 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.08.78 2.18v3.23c0 .3.21.65.79.54A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
                            />
                        </svg>

                        <span>Увійти через GitHub</span>
                    </button>

                    <button
                        type="button"
                        className="login-btn phone"
                        onClick={toggleAuthMethod}
                        disabled={loading}
                    >
                        <svg
                            className="login-provider-icon"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fill="currentColor"
                                d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                            />
                        </svg>

                        <span>
                            {authMethod === 'phone'
                                ? 'Увійти через email'
                                : 'Увійти за номером телефону'}
                        </span>
                    </button>
                </div>

                <div className="login-divider">
                    <span>або</span>
                </div>

                {authMethod === 'email' && (
                    <form
                        className="email-form"
                        onSubmit={handleEmailSubmit}
                    >
                        <div className="form-field">
                            <label htmlFor="email">
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="example@email.com"
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="password">
                                Пароль
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="Введіть пароль"
                                autoComplete={
                                    isRegistering
                                        ? 'new-password'
                                        : 'current-password'
                                }
                                disabled={loading}
                            />
                        </div>

                        {!isRegistering && (
                            <button
                                type="button"
                                className="forgot-password"
                                onClick={handlePasswordReset}
                                disabled={loading}
                            >
                                Забули пароль?
                            </button>
                        )}

                        <button
                            type="submit"
                            className="login-btn email"
                            disabled={loading}
                        >
                            {isRegistering
                                ? 'Зареєструватися'
                                : 'Увійти'}
                        </button>
                    </form>
                )}

                {authMethod === 'phone' && !codeSent && (
                    <form
                        className="email-form"
                        onSubmit={handleSendCode}
                    >
                        <div className="form-field">
                            <label htmlFor="phone">
                                Номер телефону
                            </label>

                            <input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
                                placeholder="+380501234567"
                                autoComplete="tel"
                                disabled={loading}
                            />

                            <div className="form-hint">
                                Міжнародний формат. Можна ввести й 0501234567.
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-btn email"
                            disabled={loading}
                        >
                            Надіслати код
                        </button>
                    </form>
                )}

                {authMethod === 'phone' && codeSent && (
                    <form
                        className="email-form"
                        onSubmit={handleConfirmCode}
                    >
                        <div className="form-field">
                            <label htmlFor="code">
                                Код із SMS
                            </label>

                            <input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={code}
                                onChange={(event) =>
                                    setCode(
                                        event.target.value.replace(/\D/g, '')
                                    )
                                }
                                placeholder="123456"
                                autoComplete="one-time-code"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-btn email"
                            disabled={loading}
                        >
                            Підтвердити код
                        </button>

                        <button
                            type="button"
                            className="forgot-password"
                            onClick={handleSendCode}
                            disabled={loading || codeCooldown > 0}
                        >
                            {codeCooldown > 0
                                ? `Надіслати код ще раз (через ${codeCooldown} с)`
                                : 'Надіслати код ще раз'}
                        </button>

                        <button
                            type="button"
                            className="forgot-password"
                            onClick={handleChangeNumber}
                            disabled={loading}
                        >
                            Змінити номер
                        </button>
                    </form>
                )}

                {loading && (
                    <div className="login-loading">
                        <div className="spinner"></div>
                        <span>Зачекайте...</span>
                    </div>
                )}

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="login-message">
                        {message}
                    </div>
                )}

                {authMethod === 'email' && !isRegistering && needsVerification && (
                    <button
                        type="button"
                        className="verification-button"
                        onClick={handleResendVerification}
                        disabled={loading || cooldown > 0}
                    >
                        Підтвердьте email
                        <span>
                            {cooldown > 0
                                ? `Надіслати лист повторно (через ${cooldown} с)`
                                : 'Надіслати лист повторно'}
                        </span>
                    </button>
                )}

                {authMethod === 'email' && (
                    <button
                        type="button"
                        className="login-mode-switch"
                        onClick={toggleMode}
                        disabled={loading}
                    >
                        {isRegistering
                            ? 'Вже маєте акаунт? Увійти'
                            : 'Ще не маєте акаунта? Зареєструватися'}
                    </button>
                )}

                {/* сюди Firebase вставляє невидиму reCAPTCHA */}
                <div id="recaptcha-container"></div>

                <div className="login-footer">
                    Авторизація через Firebase
                </div>
            </div>
        </div>
    );
}