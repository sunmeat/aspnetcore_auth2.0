namespace Soccer.Domain.Entities
{
    public class Player
    {
        public int Id { get; set; } // первинний ключ, ідентифікатор гравця
        public string? Name { get; set; }
        public int Age { get; set; }
        public string? Position { get; set; } // позиція гравця на полі
        public int? TeamId { get; set; } // зовнішній ключ на команду, nullable (гравець може бути без команди)
        public Team? Team { get; set; } // навігаційна властивість до пов'язаної сутності команди
    }
}
