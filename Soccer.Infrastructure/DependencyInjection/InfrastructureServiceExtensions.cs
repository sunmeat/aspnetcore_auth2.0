using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.Extensions.DependencyInjection;
using Soccer.Domain.Entities;
using Soccer.Domain.Interfaces;
using Soccer.Infrastructure.Persistence;
using Soccer.Infrastructure.Repositories;

namespace Soccer.Infrastructure.DependencyInjection
{
    public static class InfrastructureServiceExtensions
    {
        public static void AddInfrastructure(
            this IServiceCollection services,
            string firebasePath)
        {
            GoogleCredential credential =
                CredentialFactory
                    .FromFile<ServiceAccountCredential>(firebasePath)
                    .ToGoogleCredential();

            FirestoreDb db = new FirestoreDbBuilder
            {
                ProjectId = "alex-odesa",
                Credential = credential
            }.Build();

            services.AddSingleton(db);

            services.AddScoped<IRepository<Team>, TeamRepository>(); // !!!
            services.AddScoped<IRepository<Player>, PlayerRepository>(); // !!!

            services.AddScoped<FirestoreSeeder>();
        }
    }
}