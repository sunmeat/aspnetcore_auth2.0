using Soccer.Application.DTO;
using Soccer.Application.Interfaces;
using Soccer.Common.Exceptions;
using Soccer.Domain.Entities;
using Soccer.Domain.Interfaces;

namespace Soccer.Application.Services
{
    public class PlayerService : IEntityService<PlayerDTO>
    {
        private readonly IRepository<Player> players;
        private readonly IRepository<Team> teams;

        public PlayerService(
            IRepository<Player> players,
            IRepository<Team> teams)
        {
            this.players = players;
            this.teams = teams;
        }

        public async Task Create(PlayerDTO playerDto)
        {
            var player = new Player
            {
                Id = playerDto.Id,
                Name = playerDto.Name,
                Age = playerDto.Age,
                Position = playerDto.Position,
                TeamId = playerDto.TeamId
            };

            await players.Create(player);
        }

        public async Task Update(PlayerDTO playerDto)
        {
            var player = new Player
            {
                Id = playerDto.Id,
                Name = playerDto.Name,
                Age = playerDto.Age,
                Position = playerDto.Position,
                TeamId = playerDto.TeamId
            };

            await players.Update(player);
        }

        public async Task Delete(int id)
        {
            await players.Delete(id);
        }

        public async Task<PlayerDTO> Get(int id)
        {
            var player = await players.Get(id);

            if (player == null)
                throw new ValidationException("Немає такого гравця!");

            string? teamName = null;

            if (player.TeamId.HasValue)
            {
                var team = await teams.Get(player.TeamId.Value);
                teamName = team?.Name;
            }

            return new PlayerDTO
            {
                Id = player.Id,
                Name = player.Name,
                Age = player.Age,
                Position = player.Position,
                TeamId = player.TeamId,
                Team = teamName
            };
        }

        public async Task<IEnumerable<PlayerDTO>> GetAll()
        {
            var playersTask = players.GetAll();
            var teamsTask = teams.GetAll();

            await Task.WhenAll(playersTask, teamsTask);

            var playersList = (await playersTask).ToList();
            var teamsList = (await teamsTask).ToList();

            var teamsDictionary = teamsList.ToDictionary(
                team => team.Id,
                team => team);

            return playersList.Select(player =>
            {
                Team? team = null;

                if (player.TeamId.HasValue)
                {
                    teamsDictionary.TryGetValue(
                        player.TeamId.Value,
                        out team);
                }

                return new PlayerDTO
                {
                    Id = player.Id,
                    Name = player.Name,
                    Age = player.Age,
                    Position = player.Position,
                    TeamId = player.TeamId,
                    Team = team?.Name
                };
            });
        }
    }
}