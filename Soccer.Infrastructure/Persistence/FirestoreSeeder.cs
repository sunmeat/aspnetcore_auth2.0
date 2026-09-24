using Google.Cloud.Firestore;

namespace Soccer.Infrastructure.Persistence
{
    public class FirestoreSeeder
    {
        private readonly FirestoreDb db;

        public FirestoreSeeder(FirestoreDb db)
        {
            this.db = db;
        }

        public async Task SeedAsync()
        {
            await SeedTeamsAsync();
            await SeedPlayersAsync();
        }

        private async Task SeedTeamsAsync()
        {
            var teams = new[]
            {
                ("Ліверпуль", "Арне Слот"),
                ("Динамо Київ", "Ігор Костюк"),
                ("Барселона", "Гансі Флік"),
                ("Баварія Мюнхен", "Вінсент Компані"),
                ("Фенербахче", "Доменіко Тедеско"),
                ("Парі Сен-Жермен", "Луїс Енріке"),
                ("Манчестер Сіті", "Пеп Гвардіола"),
                ("Евертон", "Девід Моєс"),
                ("Реал Мадрид", "Сабо Алонсо"),
                ("Борнмут", "Андоні Іраола"),
                ("Наполі", "Антоніо Конте"),
                ("Інтер Мілан", "Крістіан Ківу"),
                ("Аль-Іттіхад", "Сержіу Консейсау"),
                ("Аль-Гіляль", "Сімоне Інзагі"),
                ("Інтер Маямі", "Хавьєр Маскерано")
            };

            var collection = db.Collection("teams");

            for (int i = 0; i < teams.Length; i++)
            {
                var document = collection.Document((i + 1).ToString());

                if (!(await document.GetSnapshotAsync()).Exists)
                {
                    await document.SetAsync(new
                    {
                        id = i + 1,
                        name = teams[i].Item1,
                        coach = teams[i].Item2
                    });
                }
            }
        }

        private async Task SeedPlayersAsync()
        {
            var players = new[]
            {
                ("Роберт Левандовські", 37, "Форвард", 3),
                ("Мохамед Салах", 33, "Форвард", 1),
                ("Ліонель Мессі", 38, "Форвард", 6),
                ("Ерлінг Голанд", 25, "Форвард", 7),
                ("Віталій Миколенко", 26, "Лівий захисник", 8),
                ("Віктор Осімхен", 26, "Форвард", 11),
                ("Хвіча Кварацхелія", 24, "Лівий вінгер", 11),
                ("Віталій Буяльський", 32, "Центральний півзахисник", 2),
                ("Карім Бензема", 37, "Форвард", 13),
                ("Серж Гнабрі", 30, "Правий вінгер", 4),
                ("Ромелу Лукаку", 32, "Форвард", 11),
                ("Едін Джеко", 39, "Форвард", 5),
                ("Хакан Чалханоглу", 31, "Центральний півзахисник", 12),
                ("Бенжамен Павар", 29, "Центральний захисник", 12),
                ("Леон Горецка", 30, "Центральний півзахисник", 4),
                ("Усман Дембеле", 28, "Правий вінгер", 6),
                ("Кіліан Мбаппе", 26, "Форвард", 9),
                ("Кевін Де Брюйне", 34, "Атакувальний півзахисник", 7),
                ("Едер Мілітао", 27, "Центральний захисник", 9),
                ("Вінісіус Жуніор", 25, "Лівий вінгер", 9),
                ("Пьотр Зелінський", 31, "Центральний півзахисник", 12),
                ("Джуд Беллінгем", 22, "Центральний півзахисник", 9),
                ("Ламін Ямаль", 18, "Правий вінгер", 3),
                ("Філ Фоден", 25, "Атакувальний півзахисник", 7),
                ("Ілля Забарний", 23, "Центральний захисник", 10),
                ("Джамал Мусіяла", 22, "Атакувальний півзахисник", 4)
            };

            var collection = db.Collection("players");

            for (int i = 0; i < players.Length; i++)
            {
                var player = players[i];
                var document = collection.Document((i + 1).ToString());

                if (!(await document.GetSnapshotAsync()).Exists)
                {
                    await document.SetAsync(new
                    {
                        id = i + 1,
                        name = player.Item1,
                        age = player.Item2,
                        position = player.Item3,
                        team_id = player.Item4
                    });
                }
            }
        }
    }
}