namespace Soccer.Common.Exceptions
{
    /// <summary>
    /// Спільний (наскрізний) виняток застосунку. Винесений у шар Common, тому що:
    /// - його кидає Application (наприклад, коли сутність не знайдена);
    /// - його ловить Presentation (щоб коректно повернути NotFound користувачу).
    /// Обидва шари можуть посилатися на Common, не порушуючи напрямок залежностей Clean Architecture.
    /// </summary>
    public class ValidationException : Exception
    {
        public string? Property { get; protected set; } // назва властивості, що викликала помилку

        public ValidationException(string message) : base(message)
        {
        }

        public ValidationException(string message, string prop) : base(message)
        {
            Property = prop; // зберігаємо назву властивості
        }
    }
}