using Repositories.Core.Dtos.Order;
using Repositories.Core.Dtos.Ticket;
using TicketResell.Repositories.Core.Dtos.Order;

namespace Repositories.Core.Dtos.Payment;
public class PaymentDto
{
    public string OrderId { get; set; } = null!;

    public string Email { get; set; } = null!;

    public CreateVirtualOrderDto OrderInfo { get; set; } = null!;

}