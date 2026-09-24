using Soccer.Application.DTO;
using Soccer.Application.Interfaces;
using Soccer.Common.Exceptions;
using Soccer.Domain.Entities;
using Soccer.Domain.Interfaces;

namespace Soccer.Application.Services
{
    public class TeamService : IEntityService<TeamDTO>
    {
        private readonly IRepository<Team> teams;

        public TeamService(IRepository<Team> teams)
        {
            this.teams = teams;
        }

        public async Task Create(TeamDTO teamDto)
        {
            var team = new Team
            {
                Id = teamDto.Id,
                Name = teamDto.Name,
                Coach = teamDto.Coach
            };

            await teams.Create(team);
        }

        public async Task Update(TeamDTO teamDto)
        {
            var team = new Team
            {
                Id = teamDto.Id,
                Name = teamDto.Name,
                Coach = teamDto.Coach
            };

            await teams.Update(team);
        }

        public async Task Delete(int id)
        {
            await teams.Delete(id);
        }

        public async Task<TeamDTO> Get(int id)
        {
            var team = await teams.Get(id);

            if (team == null)
                throw new ValidationException("Немає такого клуба!");

            return new TeamDTO
            {
                Id = team.Id,
                Name = team.Name,
                Coach = team.Coach
            };
        }

        public async Task<IEnumerable<TeamDTO>> GetAll()
        {
            var teamsList = await teams.GetAll();

            return teamsList.Select(team => new TeamDTO
            {
                Id = team.Id,
                Name = team.Name,
                Coach = team.Coach
            });
        }
    }
}