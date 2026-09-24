# ⚽ ASP.NET Core Authentication & Authorization

Навчальний проєкт на **ASP.NET Core 10**, присвячений реалізації автентифікації та авторизації користувачів за допомогою **Firebase Authentication** і **JWT-токенів**.

Проєкт демонструє захист Web API, перевірку токенів, обмеження доступу до ресурсів і взаємодію між багаторівневою архітектурою .NET та React-клієнтом.

---

## 📌 Основні можливості

- автентифікація користувачів через Firebase Authentication;
- передавання JWT-токенів від клієнта до Web API;
- перевірка видавця, аудиторії та терміну дії JWT;
- авторизація доступу до захищених контролерів;
- використання атрибута `[Authorize]`;
- робота з гравцями та футбольними командами;
- розділення відповідальності між шарами застосунку;
- інтеграція ASP.NET Core Web API з React-клієнтом.

---

## 🔐 Автентифікація та авторизація

У проєкті використовується Firebase Authentication як зовнішній сервіс для автентифікації користувачів.

### Схема роботи

```text
Користувач
    │
    ▼
React-клієнт
    │
    │  Вхід через Firebase Authentication
    ▼
Firebase Authentication
    │
    │  JWT-токен
    ▼
ASP.NET Core Web API
    │
    │  Перевірка JWT
    ▼
Authentication Middleware
    │
    │  Перевірка прав доступу
    ▼
Authorization Middleware
    │
    ▼
Захищений контролер
    │
    ▼
Application / Infrastructure
```

### Перевірка JWT

Web API перевіряє такі параметри токена:

- **Issuer** — чи є Firebase правильним видавцем токена;
- **Audience** — чи належить токен потрібному Firebase-проєкту;
- **Lifetime** — чи не завершився термін дії токена.

Для підключення використовується:

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();
```

Захист контролерів реалізується за допомогою атрибута:

```csharp
[Authorize]
public class PlayersController : ControllerBase
{
    // Захищені HTTP-методи
}
```

> **Автентифікація** визначає, ким є користувач.  
> **Авторизація** визначає, чи має користувач право доступу до певного ресурсу.

---

## 🏗️ Архітектура проєкту

Проєкт організований за принципом багаторівневої архітектури.

```text
aspnetcore_auth2.0
│
├── Soccer.Domain
│   └── Сутності предметної області
│
├── Soccer.Application
│   ├── DTO
│   ├── Сервіси
│   ├── Інтерфейси
│   └── Бізнес-логіка застосунку
│
├── Soccer.Infrastructure
│   ├── Репозиторії
│   ├── Робота з Firebase / Firestore
│   ├── Реалізація залежностей
│   └── Конфігурація інфраструктури
│
├── Soccer.Common
│   └── Спільні винятки та допоміжні компоненти
│
├── Soccer.WebAPI
│   ├── Controllers
│   ├── Program.cs
│   └── Конфігурація Web API
│
├── react.client
│   └── React-клієнт
│
└── Soccer.sln
```

### Призначення шарів

| Шар | Відповідальність |
|---|---|
| `Soccer.Domain` | Сутності предметної області |
| `Soccer.Application` | Сервіси, DTO, інтерфейси та прикладна логіка |
| `Soccer.Infrastructure` | Репозиторії, Firebase та доступ до даних |
| `Soccer.Common` | Спільні винятки й допоміжні компоненти |
| `Soccer.WebAPI` | HTTP-контролери, middleware та конфігурація застосунку |
| `react.client` | Клієнтська частина застосунку |

---

## 🛠️ Технології

### Backend

- **.NET 10**
- **ASP.NET Core Web API**
- **C#**
- **JWT Bearer Authentication**
- **Microsoft IdentityModel Tokens**
- **Firebase Authentication**
- **Google Cloud Firestore**

### Frontend

- **React**
- **JavaScript**
- **Vite**
- **ASP.NET Core SPA Proxy**

### Архітектурні підходи

- багаторівнева архітектура;
- Dependency Injection;
- DTO;
- сервісний підхід;
- репозиторії;
- middleware ASP.NET Core.

---

## 🚀 Запуск проєкту

### 1. Клонування репозиторію

```bash
git clone https://github.com/sunmeat/aspnetcore_auth2.0.git
cd aspnetcore_auth2.0
```

### 2. Налаштування Firebase

Створіть або використайте Firebase-проєкт і налаштуйте:

1. Firebase Authentication.
2. Спосіб входу користувачів.
3. Google Cloud Firestore.
4. Облікові дані сервісного облікового запису.
5. Файл `firebase.json` у проєкті `Soccer.Infrastructure`.

У `Soccer.WebAPI/Program.cs` необхідно вказати власний Firebase Project ID:

```csharp
options.Authority =
    "https://securetoken.google.com/YOUR_PROJECT_ID";

ValidAudience = "YOUR_PROJECT_ID";
```

> Не додавайте приватні ключі Firebase до репозиторію. Для реального застосунку використовуйте змінні середовища або захищене сховище секретів.

### 3. Запуск backend

Перейдіть до каталогу Web API:

```bash
cd Soccer.WebAPI
dotnet restore
dotnet run
```

### 4. Запуск React-клієнта

У каталозі клієнта встановіть залежності:

```bash
cd react.client
npm install
npm run dev
```

Адреса React-клієнта визначається налаштуваннями SPA Proxy.

---

## 🌐 API-контролери

У проєкті передбачені контролери для роботи з футбольними даними:

- `PlayersController` — робота з гравцями;
- `TeamsController` — робота з командами.

Контролер гравців захищений атрибутом `[Authorize]`. Для виконання запитів клієнт повинен передати дійсний JWT-токен у заголовку:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔄 Життєвий цикл запиту

1. Користувач проходить автентифікацію через Firebase.
2. Firebase повертає JWT-токен.
3. React-клієнт додає токен до HTTP-запиту.
4. ASP.NET Core перевіряє токен через JWT Bearer Authentication.
5. Middleware авторизації перевіряє доступ до ресурсу.
6. Захищений контролер обробляє запит.
7. Application та Infrastructure виконують відповідну операцію.

Якщо токен відсутній або недійсний, доступ до захищеного ресурсу обмежується.

---

## 📂 Основні файли

| Файл / каталог | Призначення |
|---|---|
| `Soccer.WebAPI/Program.cs` | Реєстрація сервісів і налаштування authentication/authorization |
| `Soccer.WebAPI/Controllers` | HTTP-контролери API |
| `Soccer.Application` | Прикладні сервіси та DTO |
| `Soccer.Infrastructure` | Репозиторії та інтеграція з Firebase |
| `react.client` | Клієнтський React-застосунок |

---

## 🎯 Навчальна мета

Проєкт призначений для практичного вивчення:

- різниці між автентифікацією та авторизацією;
- роботи JWT Bearer Authentication;
- інтеграції Firebase Authentication з ASP.NET Core;
- захисту Web API за допомогою `[Authorize]`;
- організації багаторівневої архітектури;
- взаємодії React-клієнта з захищеним backend.

---

## 📄 Ліцензія

Проєкт поширюється відповідно до ліцензії **MIT**.
