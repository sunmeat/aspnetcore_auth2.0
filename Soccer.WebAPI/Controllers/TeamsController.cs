using Microsoft.AspNetCore.Authorization; // це потрібно для того, щоб додати атрибут [Authorize], який буде перевіряти, чи є у користувача дійсний токен
using Microsoft.AspNetCore.Mvc;
using Soccer.Application.DTO;
using Soccer.Application.Interfaces;
using Soccer.Common.Exceptions;

namespace Soccer.Presentation.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TeamsController : ControllerBase
    {
        private readonly IEntityService<TeamDTO> teamService;

        public TeamsController(IEntityService<TeamDTO> serv)
        {
            teamService = serv;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TeamDTO>>> Get()
        {
            var teams = await teamService.GetAll();
            return Ok(teams);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TeamDTO>> Get(int id)
        {
            try
            {
                var team = await teamService.Get(id);
                return Ok(team);
            }
            catch (ValidationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] TeamDTO team)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await teamService.Create(team);
            return Ok();
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] TeamDTO team)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await teamService.Update(team);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            try
            {
                await teamService.Delete(id);
                return NoContent();
            }
            catch (ValidationException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}