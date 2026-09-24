import {
    GithubAuthProvider,
    GoogleAuthProvider,
    EmailAuthProvider,
    RecaptchaVerifier,
    linkWithPopup,
    linkWithCredential,
    linkWithPhoneNumber,
    unlink,
    fetchSignInMethodsForEmail
} from "firebase/auth";

import { auth } from "./firebase";

// ідентифікатори провайдерів у Firebase
export const PROVIDER_IDS = {
    google: "google.com",
    github: "github.com",
    password: "password",
    phone: "phone"
};

const PROVIDER_LABELS = {
    "google.com": "Google",
    "github.com": "GitHub",
    password: "email і пароль",
    emailLink: "посилання з листа",
    phone: "номер телефону"
};

// окремий контейнер для reCAPTCHA, щоб не конфліктувати зі сторінкою логіну
const LINK_RECAPTCHA_CONTAINER_ID = "recaptcha-link-container";

const oauthProviderFactories = {
    "google.com": () => {
        const provider = new GoogleAuthProvider();
        provider.addScope("email");
        provider.addScope("profile");
        return provider;
    },
    "github.com": () => {
        const provider = new GithubAuthProvider();
        provider.addScope("user:email");
        return provider;
    }
};

function createError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function requireUser() {
    const user = auth.currentUser;

    if (!user) {
        throw createError("auth/no-current-user", "Спочатку увійдіть в акаунт.");
    }

    return user;
}

// ---------------------------------------------------------------------------
// автоматичне об'єднання під час входу
//
// сценарій: акаунт із поштою X уже існує (наприклад, через Google), а людина
// натискає "Увійти через GitHub" з тією самою поштою. Firebase кидає помилку
// auth/account-exists-with-different-credential. Ми запам'ятовуємо
// облікові дані GitHub, людина входить своїм основним способом, і одразу після
// цього ми додаємо GitHub до того самого акаунта (UID не змінюється).
// ---------------------------------------------------------------------------

let pendingLink = null;
let lastAutoLinkedProviderId = null;

// викликається в catch входу через Google/GitHub
// повертає true, якщо помилка - саме про існуючий акаунт і ми зберегли дані
export function rememberPendingCredential(error, providerId) {
    if (error?.code !== "auth/account-exists-with-different-credential") {
        return false;
    }

    const credential =
        providerId === PROVIDER_IDS.github
            ? GithubAuthProvider.credentialFromError(error)
            : GoogleAuthProvider.credentialFromError(error);

    const email = error.customData?.email;

    if (!credential || !email) {
        pendingLink = null;
        return false;
    }

    pendingLink = {
        credential,
        providerId,
        email: email.toLowerCase()
    };

    return true;
}

export function getPendingLinkInfo() {
    if (!pendingLink) {
        return null;
    }

    return { email: pendingLink.email, providerId: pendingLink.providerId };
}

export function clearPendingLink() {
    pendingLink = null;
}

// викликається після кожного успішного входу
// прив'язує збережений провайдер, лише якщо пошта збігається і підтверджена
// повертає providerId, якщо щось прив'язали, інакше null
export async function completePendingLink(user) {
    if (!pendingLink || !user) {
        return null;
    }

    const sameEmail = user.email?.toLowerCase() === pendingLink.email;

    if (!sameEmail || !user.emailVerified) {
        return null;
    }

    const { credential, providerId } = pendingLink;

    const alreadyLinked = user.providerData.some(
        (provider) => provider.providerId === providerId
    );

    if (alreadyLinked) {
        pendingLink = null;
        return null;
    }

    try {
        await linkWithCredential(user, credential);
        await user.reload();

        pendingLink = null;
        lastAutoLinkedProviderId = providerId;

        console.log("Автоматично прив'язано провайдера:", providerId);

        return providerId;
    } catch (error) {
        // вхід не повинен ламатися через невдалу прив'язку
        console.error("Не вдалося автоматично прив'язати провайдера:", error);
        pendingLink = null;

        return null;
    }
}

// одноразово віддає назву провайдера, який щойно прив'язали автоматично
// (щоб показати повідомлення після входу)
export function consumeAutoLinkedProvider() {
    const providerId = lastAutoLinkedProviderId;
    lastAutoLinkedProviderId = null;

    return providerId ? PROVIDER_LABELS[providerId] : null;
}

// текст для сторінки логіну, коли Firebase повернув
// auth/account-exists-with-different-credential
export async function describeAccountExistsError(error) {
    const email = error?.customData?.email;
    const newProviderLabel = pendingLink
        ? PROVIDER_LABELS[pendingLink.providerId]
        : "новий спосіб входу";

    let methods = [];

    if (email) {
        try {
            // якщо в проєкті ввімкнено Email Enumeration Protection,
            // Firebase поверне порожній масив - це нормально
            methods = await fetchSignInMethodsForEmail(auth, email);
        } catch {
            methods = [];
        }
    }

    const labels = methods
        .map((method) => PROVIDER_LABELS[method])
        .filter(Boolean);

    if (labels.length > 0) {
        return `Акаунт із поштою ${email} уже існує. Увійдіть через ${labels.join(
            " або "
        )}, і ми автоматично додамо ${newProviderLabel} до вашого профілю.`;
    }

    return `Акаунт із поштою ${email ?? "цією поштою"
        } уже існує. Увійдіть тим способом, яким реєструвалися раніше (Google, GitHub або email і пароль), і ми автоматично додамо ${newProviderLabel} до вашого профілю.`;
}

// ---------------------------------------------------------------------------
// ручне керування прив'язками (сторінка налаштувань акаунта)
// ---------------------------------------------------------------------------

export function getLinkedProviders(user = auth.currentUser) {
    if (!user) {
        return [];
    }

    // копіюємо дані, щоб React бачив нові об'єкти після reload()
    return user.providerData.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
        phoneNumber: provider.phoneNumber,
        displayName: provider.displayName
    }));
}

// прив'язати Google або GitHub до поточного акаунта
export async function linkProvider(providerId) {
    const user = requireUser();
    const createProvider = oauthProviderFactories[providerId];

    if (!createProvider) {
        throw createError("auth/unsupported-provider", "Непідтримуваний провайдер.");
    }

    await linkWithPopup(user, createProvider());
    await user.reload();

    return getLinkedProviders(auth.currentUser);
}

// додати вхід за паролем до акаунта з підтвердженою поштою
// пошта береться з акаунта, тому вона лишається підтвердженою
export async function linkPassword(password) {
    const user = requireUser();

    if (!user.email || !user.emailVerified) {
        throw createError(
            "auth/email-not-verified",
            "Для входу за паролем потрібна підтверджена пошта."
        );
    }

    const credential = EmailAuthProvider.credential(user.email, password);

    await linkWithCredential(user, credential);
    await user.reload();

    return getLinkedProviders(auth.currentUser);
}

// відв'язати провайдера (мінімум один спосіб входу має залишитися)
export async function unlinkProvider(providerId) {
    const user = requireUser();

    if (user.providerData.length <= 1) {
        throw createError(
            "auth/cannot-unlink-last-provider",
            "Не можна відв'язати останній спосіб входу."
        );
    }

    await unlink(user, providerId);
    await user.reload();

    return getLinkedProviders(auth.currentUser);
}

// --- прив'язка телефону ---

let linkRecaptchaVerifier = null;
let linkConfirmation = null;

function clearLinkRecaptcha() {
    if (linkRecaptchaVerifier) {
        try {
            linkRecaptchaVerifier.clear();
        } catch {
            // віджет уже видалено
        }

        linkRecaptchaVerifier = null;
    }
}

// крок 1: надіслати SMS з кодом
// номер уже має бути у форматі E.164 (normalizePhoneNumber з authService)
export async function sendPhoneLinkCode(phoneNumber) {
    const user = requireUser();

    clearLinkRecaptcha();

    linkRecaptchaVerifier = new RecaptchaVerifier(
        auth,
        LINK_RECAPTCHA_CONTAINER_ID,
        { size: "invisible" }
    );

    try {
        linkConfirmation = await linkWithPhoneNumber(
            user,
            phoneNumber,
            linkRecaptchaVerifier
        );
    } catch (error) {
        clearLinkRecaptcha();
        linkConfirmation = null;

        throw error;
    }
}

// крок 2: підтвердити код - телефон стає способом входу для цього акаунта
export async function confirmPhoneLink(code) {
    if (!linkConfirmation) {
        throw createError(
            "auth/no-pending-verification",
            "Спочатку надішліть код на номер телефону."
        );
    }

    // при неправильному коді linkConfirmation не скидаємо,
    // щоб можна було ввести код ще раз
    await linkConfirmation.confirm(code);

    linkConfirmation = null;
    clearLinkRecaptcha();

    await auth.currentUser.reload();

    return getLinkedProviders(auth.currentUser);
}

export function cancelPhoneLink() {
    linkConfirmation = null;
    clearLinkRecaptcha();
}

// ---------------------------------------------------------------------------
// зрозумілі повідомлення про помилки
// повертає порожній рядок для дій, які не варто показувати (закрито вікно)
// ---------------------------------------------------------------------------

export function mapLinkError(error) {
    switch (error?.code) {
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
            return "";

        case "auth/popup-blocked":
            return "Браузер заблокував спливаюче вікно. Дозвольте його для цього сайту й повторіть.";

        case "auth/credential-already-in-use":
            return "Цей обліковий запис уже прив'язано до іншого профілю. Увійдіть у той профіль і відв'яжіть його там, потім повторіть.";

        case "auth/provider-already-linked":
            return "Цей спосіб входу вже прив'язано до вашого акаунта.";

        case "auth/email-already-in-use":
            return "Ця пошта вже використовується в іншому акаунті.";

        case "auth/account-exists-with-different-credential":
            return "Акаунт із такою поштою вже існує. Увійдіть у нього й прив'яжіть цей спосіб на сторінці налаштувань.";

        case "auth/requires-recent-login":
            return "Із міркувань безпеки увійдіть в акаунт заново й повторіть дію.";

        case "auth/weak-password":
            return "Пароль надто простий. Використайте щонайменше 6 символів.";

        case "auth/email-not-verified":
            return "Для входу за паролем потрібна підтверджена пошта.";

        case "auth/invalid-phone-number":
            return "Некоректний номер телефону. Введіть його у форматі +380501234567.";

        case "auth/invalid-verification-code":
            return "Неправильний код. Перевірте SMS і спробуйте ще раз.";

        case "auth/code-expired":
            return "Термін дії коду минув. Надішліть новий код.";

        case "auth/too-many-requests":
            return "Забагато спроб. Зачекайте трохи й повторіть.";

        case "auth/no-pending-verification":
        case "auth/cannot-unlink-last-provider":
        case "auth/no-current-user":
            return error.message;

        default:
            return error?.message || "Сталася помилка. Спробуйте ще раз.";
    }
}