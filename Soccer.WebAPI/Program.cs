using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens; // ця бібліотека потрібна для валідації JWT токенів
using Soccer.Application.DependencyInjection;
using Soccer.Infrastructure.DependencyInjection;
using Soccer.Infrastructure.Persistence;

// View > Terminal:
// cd Soccer.WebAPI
// dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
// ця бібліотека потрібна для аутентифікації через JWT токени, які видає Firebase
// JWT токен - JSON Web Token, використовується для передачі інформації між клієнтом і сервером у безпечний спосіб
// він містить закодовану інформацію про користувача та його права доступу

var builder = WebApplication.CreateBuilder(args);

string firebasePath = Path.GetFullPath(
    Path.Combine(
        builder.Environment.ContentRootPath,
        "..",
        "Soccer.Infrastructure",
        "firebase.json"));

builder.Services.AddInfrastructure(firebasePath);
builder.Services.AddApplication();

builder.Services.AddControllers();

// ===== Firebase JWT Authentication =====
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Project ID з Firebase
        options.Authority = "https://securetoken.google.com/alex-odesa"; // замініть "alex-odesa" на ваш Project ID з Firebase
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, // перевірка, чи є видавець токена дійсним
            ValidIssuer = options.Authority, // перевірка, чи видавець токена збігається з очікуваним
            ValidateAudience = true, // аудиторія токена - токен призначений тільки для проєкту alex-odesa
            ValidAudience = "alex-odesa", // замініть "alex-odesa" на ваш Project ID з Firebase
            ValidateLifetime = true // перевірка, чи не закінчився термін дії токена
        };
    });

builder.Services.AddAuthorization(); // додавання сервісу авторизації, який буде перевіряти права доступу користувача до ресурсів

var app = builder.Build();

using (IServiceScope scope = app.Services.CreateScope())
{
    FirestoreSeeder seeder = scope.ServiceProvider.GetRequiredService<FirestoreSeeder>();
    await seeder.SeedAsync();
}

app.UseAuthentication(); // це потрібно для того, щоб додати middleware для аутентифікації, який буде перевіряти JWT токени у запитах
app.UseAuthorization();  // автентифікація - це процес перевірки, чи є у користувача дійсний токен, а авторизація - це процес перевірки, чи має користувач права доступу до певного ресурсу

// різниця між AddAuthorization і UseAuthorization полягає в тому, що AddAuthorization додає сервіс авторизації до DI контейнера,
// а UseAuthorization додає middleware для авторизації у конвеєр обробки запитів

app.MapControllers();

app.Run();