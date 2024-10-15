using Repositories.Core.Dtos.Ticket;

namespace TicketResell.Services.Services.Tickets;

public interface ITicketService
{
    public Task<ResponseModel> CreateTicketAsync(TicketCreateDto dto, bool saveAll = true);
    public Task<ResponseModel> GetTicketBySellerId(string id);

    public Task<ResponseModel> CheckExistId(string id);

    public Task<ResponseModel> GetTicketByNameAsync(string name);
    public Task<ResponseModel> GetQrImageAsBase64Async(string ticketId);
    public Task<ResponseModel> GetTicketsAsync();
    public Task<ResponseModel> GetTicketRangeAsync(int start, int count);
    public Task<ResponseModel> GetTopTicket(int amount);
    public Task<ResponseModel> GetTicketByDateAsync(DateTime date);
    public Task<ResponseModel> GetTicketByIdAsync(string id);
    public Task<ResponseModel> GetTicketsByCategoryAndDateAsync(string categoryName, int amount);
    public Task<ResponseModel> GetTicketsStartingWithinTimeRangeAsync(int ticketAmount, TimeSpan timeRange);
    public Task<ResponseModel> UpdateTicketAsync(string id, TicketUpdateDto? dto, bool saveAll = true);

    public Task<ResponseModel> DeleteTicketAsync(string id, bool saveAll = true);
    public Task<ResponseModel> GetTicketByCategoryAsync(string id);
    public Task<ResponseModel> GetTicketRemainingAsync(string id);
    public Task<ResponseModel> GetTicketByCategoryIdAsync (string ticketid, string [] categoryId);
    public Task<ResponseModel> GetTicketNotByCategoryIdAsync(string[] categoryId);

}