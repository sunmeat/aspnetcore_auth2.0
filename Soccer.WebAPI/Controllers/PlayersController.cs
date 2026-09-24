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
    public class PlayersController : ControllerBase
    {
        private readonly IEntityService<PlayerDTO> playerService;

        public PlayersController(IEntityService<PlayerDTO> playerserv)
        {
            playerService = playerserv;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PlayerDTO>>> Get()
        {
            var players = await playerService.GetAll();
            return Ok(players);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PlayerDTO>> Get(int id)
        {
            try
            {
                var player = await playerService.Get(id);
                return Ok(player);
            }
            catch (ValidationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] PlayerDTO player)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await playerService.Create(player);
            return Ok();
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] PlayerDTO player)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await playerService.Update(player);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            try
            {
                await playerService.Delete(id);
                return NoContent();
            }
            catch (ValidationException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}