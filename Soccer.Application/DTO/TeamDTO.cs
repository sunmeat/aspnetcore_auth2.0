using System.ComponentModel.DataAnnotations;

namespace Soccer.Application.DTO
{
    public class TeamDTO
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "поле має бути заповнене.")]
        public string? Name { get; set; } // назва команди

        [Required(ErrorMessage = "поле має бути заповнене.")]
        public string? Coach { get; set; } // ім'я тренера
    }
}