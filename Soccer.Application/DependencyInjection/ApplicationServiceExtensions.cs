using Microsoft.Extensions.DependencyInjection;
using Soccer.Application.DTO;
using Soccer.Application.Interfaces;
using Soccer.Application.Services;

namespace Soccer.Application.DependencyInjection
{
    /// <summary>
    /// Реєструє все, що належить до шару Application: AutoMapper-профіль (якщо він є)
    /// та сервіси use-case'ів (TeamService, PlayerService) за їхніми інтерфейсами.
    /// Presentation викликає лише цей один метод у Program.cs, не знаючи деталей.
    /// </summary>
    public static class ApplicationServiceExtensions
    {
        public static void AddApplication(this IServiceCollection services)
        {
            // сканує складання Soccer.Application
            services.AddTransient<IEntityService<TeamDTO>, TeamService>(); // реєструємо сервіс команд
            services.AddTransient<IEntityService<PlayerDTO>, PlayerService>(); // реєструємо сервіс гравців
        }
    }
}