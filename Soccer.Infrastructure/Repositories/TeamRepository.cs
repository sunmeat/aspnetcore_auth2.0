using Google.Cloud.Firestore;
using Soccer.Domain.Entities;
using Soccer.Domain.Interfaces;

namespace Soccer.Infrastructure.Repositories
{
    public class TeamRepository : IRepository<Team>
    {
        private readonly CollectionReference collection;

        public TeamRepository(FirestoreDb db)
        {
            collection = db.Collection("teams");
        }

        public async Task<IEnumerable<Team>> GetAll()
        {
            QuerySnapshot snapshot = await collection.GetSnapshotAsync();

            return snapshot.Documents
                .Select(MapDocument)
                .OrderBy(team => team.Id);
        }

        public async Task<Team?> Get(int id)
        {
            DocumentSnapshot document =
                await collection
                    .Document(id.ToString())
                    .GetSnapshotAsync();

            if (!document.Exists)
                return null;

            return MapDocument(document);
        }

        public async Task<Team?> Get(string name)
        {
            QuerySnapshot snapshot = await collection
                .WhereEqualTo("name", name)
                .Limit(1)
                .GetSnapshotAsync();

            DocumentSnapshot? document =
                snapshot.Documents.FirstOrDefault();

            if (document == null)
                return null;

            return MapDocument(document);
        }

        public async Task Create(Team team)
        {
            QuerySnapshot snapshot =
                await collection.GetSnapshotAsync();

            int maxId = snapshot.Documents
                .Select(document =>
                    Convert.ToInt32(document.ToDictionary()["id"]))
                .DefaultIfEmpty(0)
                .Max();

            int newId = maxId + 1;

            DocumentReference document =
                collection.Document(newId.ToString());

            await document.SetAsync(new
            {
                id = newId,
                name = team.Name,
                coach = team.Coach
            });
        }

        public async Task Update(Team team)
        {
            DocumentReference document =
                collection.Document(team.Id.ToString());

            await document.SetAsync(new
            {
                id = team.Id,
                name = team.Name,
                coach = team.Coach
            });
        }

        public async Task Delete(int id)
        {
            await collection
                .Document(id.ToString())
                .DeleteAsync();
        }

        private static Team MapDocument(
            DocumentSnapshot document)
        {
            Dictionary<string, object> data =
                document.ToDictionary();

            return new Team
            {
                Id = Convert.ToInt32(data["id"]),
                Name = data["name"]?.ToString(),
                Coach = data["coach"]?.ToString()
            };
        }
    }
}