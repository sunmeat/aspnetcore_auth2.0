using System.ComponentModel.DataAnnotations;

namespace Soccer.Application.DTO
{
    // об'єкт передачі даних - спеціальна модель для обміну даними між шарами
    // клас PlayerDTO містить лише ті властивості, які потрібні для подання
    public class PlayerDTO
    {
        public int Id { get; set; } // ідентифікатор, буде отриманий з бази даних

        /*
         * Атрибут [Required(ErrorMessage = "...")] з простору System.ComponentModel.DataAnnotations
         * впливає на валидацію моделі. Він позначає, що властивість, над якою стоїть,
         * є обов’язковою для заповнення: її значення не може бути null (для типів-посилань)
         * або пустим рядком/значенням за замовчуванням. Побачити повідомлення помилки
         * можна буде як на стороні сервера — коли викликається ModelState.IsValid
         * у контролері, так і на стороні клієнта — якщо підключений unobtrusive validation
         * (за замовчуванням це скрипти jquery.validate та jquery.validate.unobtrusive).
         * При спробі відправити форму з незаповненим полем браузер автоматично покаже
         * це повідомлення біля поля (через <span asp-validation-for="PropertyName"></span>) ще до відправки запиту на сервер.
         */
        [Required(ErrorMessage = "поле має бути заповнене.")]
        public string? Name { get; set; } // ім'я гравця

        [Required(ErrorMessage = "поле має бути заповнене.")]
        public int Age { get; set; } // вік гравця

        [Required(ErrorMessage = "поле має бути заповнене.")]
        public string? Position { get; set; } // позиція на полі

        public int? TeamId { get; set; } // ідентифікатор команди

        public string? Team { get; set; } // назва команди (для відображення), саме стрінг, а не посилання на команду, бо на сторінці не потрібен весь об'єкт Team
    }
}