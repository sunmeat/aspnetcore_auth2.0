namespace Soccer.Domain.Entities
{
    public class Team
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Coach { get; set; } // ім'я тренера команди
        public ICollection<Player>? Players { get; set; } // навігаційна властивість-колекція для гравців команди (одна команда - багато гравців)
    }
}
