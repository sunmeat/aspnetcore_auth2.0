using Google.Cloud.Firestore;
using Soccer.Domain.Entities;
using Soccer.Domain.Interfaces;

namespace Soccer.Infrastructure.Repositories
{
    public class PlayerRepository : IRepository<Player>
    {
        private readonly CollectionReference collection;

        public PlayerRepository(FirestoreDb db)
        {
            collection = db.Collection("players");
        }

        public async Task<IEnumerable<Player>> GetAll()
        {
            QuerySnapshot snapshot = await collection.GetSnapshotAsync();

            return snapshot.Documents
                .Select(MapDocument)
                .OrderBy(player => player.Id);
        }

        public async Task<Player?> Get(int id)
        {
            DocumentSnapshot document =
                await collection
                    .Document(id.ToString())
                    .GetSnapshotAsync();

            if (!document.Exists)
                return null;

            return MapDocument(document);
        }

        public async Task<Player?> Get(string name)
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

        public async Task Create(Player player)
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
                name = player.Name,
                age = player.Age,
                position = player.Position,
                team_id = player.TeamId
            });
        }

        public async Task Update(Player player)
        {
            DocumentReference document =
                collection.Document(player.Id.ToString());

            await document.SetAsync(new
            {
                id = player.Id,
                name = player.Name,
                age = player.Age,
                position = player.Position,
                team_id = player.TeamId
            });
        }

        public async Task Delete(int id)
        {
            await collection
                .Document(id.ToString())
                .DeleteAsync();
        }

        private static Player MapDocument(
            DocumentSnapshot document)
        {
            Dictionary<string, object> data =
                document.ToDictionary();

            return new Player
            {
                Id = Convert.ToInt32(data["id"]),
                Name = data["name"]?.ToString(),
                Age = Convert.ToInt32(data["age"]),
                Position = data["position"]?.ToString(),
                TeamId = data["team_id"] == null
                    ? null
                    : Convert.ToInt32(data["team_id"])
            };
        }
    }
}