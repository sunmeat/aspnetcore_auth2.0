import {
    signInWithPopup,
    signOut,
    GithubAuthProvider,
    GoogleAuthProvider,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "firebase/auth";

import { auth } from "./firebase";
import {
    PROVIDER_IDS,
    rememberPendingCredential,
    completePendingLink
} from "./accountLinking";

const githubProvider = new GithubAuthProvider();
githubProvider.addScope("user:email");
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

// після натискання на посилання в листі Firebase підтвердить пошту
// і покаже кнопку "Продовжити", яка веде на цей URL.
// коли задеплоїте сайт - замініть на адресу свого сайту
// (домен має бути в Authentication -> Settings -> Authorized domains)
const VERIFICATION_CONTINUE_URL = "https://google.com";

const actionCodeSettings = {
    url: VERIFICATION_CONTINUE_URL,
    handleCodeInApp: false
};

// id елемента в DOM, куди Firebase вставляє невидиму reCAPTCHA
const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let recaptchaVerifier = null;
let phoneConfirmation = null;

// користувач, зареєстрований через email+пароль, але без підтвердженої пошти
// (користувачів із телефоном, Google та GitHub це не стосується)
function isUnverifiedPasswordUser(user) {
    if (!user) {
        return false;
    }

    const usesPassword = user.providerData.some(
        (provider) => provider.providerId === "password"
    );

    return usesPassword && !user.emailVerified;
}

// логін через GitHub
export async function loginWithGitHub() {
    try {
        const result = await signInWithPopup(auth, githubProvider);

        // якщо раніше був відхилений вхід через Google (акаунт з тією ж поштою),
        // тут його можна дозволити прив'язати
        await completePendingLink(result.user);

        console.log("Успішний вхід через GitHub:", result.user);

        return result.user;
    } catch (error) {
        // запам'ятовуємо GitHub, якщо акаунт із такою поштою вже існує
        rememberPendingCredential(error, PROVIDER_IDS.github);

        console.error("Помилка входу через GitHub:", error);
        throw error;
    }
}

// логін через Google
export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);

        await completePendingLink(result.user);

        console.log("Успішний вхід через Google:", result.user);

        return result.user;
    } catch (error) {
        // запам'ятовуємо Google, якщо акаунт із такою поштою вже існує
        rememberPendingCredential(error, PROVIDER_IDS.google);

        console.error("Помилка входу через Google:", error);
        throw error;
    }
}

// реєстрація через email та пароль
export async function registerWithEmail(email, password) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        try {
            await sendEmailVerification(result.user, actionCodeSettings);
        } finally {
            // у будь-якому разі не залишаємо непідтвердженого користувача в сесії
            await signOut(auth);
        }

        console.log(
            "Користувача зареєстровано. Лист для підтвердження email надіслано:",
            email
        );

        return result.user;
    } catch (error) {
        console.error("Помилка реєстрації через email:", error);
        throw error;
    }
}

// логін через email та пароль
export async function loginWithEmail(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);

        if (!result.user.emailVerified) {
            await signOut(auth);

            const error = new Error("Email користувача не підтверджено.");
            error.code = "auth/email-not-verified";

            throw error;
        }

        // тут прив'язується GitHub/Google, якщо вхід через них був відхилений
        // через збіг пошти
        await completePendingLink(result.user);

        console.log("Успішний вхід через email:", result.user);

        return result.user;
    } catch (error) {
        console.error("Помилка входу через email:", error);
        throw error;
    }
}

// повторне надсилання листа підтвердження
// повертає true, якщо пошта вже була підтверджена (лист не надсилався)
export async function resendEmailVerification(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);

        if (result.user.emailVerified) {
            await signOut(auth);
            return true;
        }

        try {
            await sendEmailVerification(result.user, actionCodeSettings);
        } finally {
            await signOut(auth);
        }

        console.log("Лист для підтвердження email надіслано повторно:", email);

        return false;
    } catch (error) {
        console.error("Помилка повторного надсилання листа:", error);

        try {
            await signOut(auth);
        } catch {
            // користувач уже вийшов із системи
        }

        throw error;
    }
}

// приводить введений номер до міжнародного формату E.164
// 0501234567 -> +380501234567, 380501234567 -> +380501234567
export function normalizePhoneNumber(rawValue) {
    const cleaned = rawValue.replace(/[\s\-().]/g, "");

    if (/^0\d{9}$/.test(cleaned)) {
        return `+38${cleaned}`;
    }

    if (/^380\d{9}$/.test(cleaned)) {
        return `+${cleaned}`;
    }

    return cleaned;
}

export function isValidPhoneNumber(phoneNumber) {
    return /^\+[1-9]\d{7,14}$/.test(phoneNumber);
}

function clearRecaptcha() {
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        } catch {
            // віджет уже видалено
        }

        recaptchaVerifier = null;
    }
}

// крок 1: надіслати SMS з кодом
export async function sendPhoneCode(phoneNumber) {
    try {
        // невидима reCAPTCHA одноразова, тому для кожної відправки створюємо нову
        clearRecaptcha();

        recaptchaVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
            size: "invisible"
        });

        phoneConfirmation = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );

        console.log("Код підтвердження надіслано на номер:", phoneNumber);
    } catch (error) {
        console.error("Помилка надсилання коду на телефон:", error);

        clearRecaptcha();
        phoneConfirmation = null;

        throw error;
    }
}

// крок 2: підтвердити код і увійти
export async function confirmPhoneCode(code) {
    if (!phoneConfirmation) {
        const error = new Error("Спочатку надішліть код на номер телефону.");
        error.code = "auth/no-pending-verification";

        throw error;
    }

    try {
        const result = await phoneConfirmation.confirm(code);

        console.log("Успішний вхід за номером телефону:", result.user);

        phoneConfirmation = null;
        clearRecaptcha();

        return result.user;
    } catch (error) {
        // при неправильному коді користувач може спробувати ще раз,
        // тому phoneConfirmation не скидаємо
        console.error("Помилка підтвердження коду:", error);
        throw error;
    }
}

// скасувати поточну верифікацію телефону (зміна номера, перемикання режиму)
export function cancelPhoneVerification() {
    phoneConfirmation = null;
    clearRecaptcha();
}

// відновлення пароля
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Помилка відновлення пароля:", error);
        throw error;
    }
}

// вихід
export async function logout() {
    await signOut(auth);
}

// отримати Firebase ID Token для бекенду
// для непідтвердженого email+password користувача токен не віддаємо
export async function getIdToken(forceRefresh = false) {
    const user = auth.currentUser;

    if (!user || isUnverifiedPasswordUser(user)) {
        return null;
    }

    return await user.getIdToken(forceRefresh);
}

// підписка на зміну користувача
// непідтверджені користувачі для решти застосунку "невидимі" (null),
// тому навіть на мить не потрапляють на закриті сторінки
export function onUserChanged(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(isUnverifiedPasswordUser(user) ? null : user);
    });
}