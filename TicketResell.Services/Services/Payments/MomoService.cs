using AutoMapper;
using Microsoft.Extensions.Options;
using Repositories.Core.Dtos.Payment;
using System.Security.Cryptography;
using System.Text;
using TicketResell.Repositories.UnitOfWork;
using System.Net.Http.Json;
using TicketResell.Services.Services.Payments;
using Repositories.Config;
using System.Text.Json;
using TicketResell.Repositories.Logger;

namespace TicketResell.Services.Services
{
    public class MomoService : IMomoService
    {
        private readonly HttpClient _httpClient;
        private readonly AppConfig _config;

        private readonly string _ipnUrl;
        private readonly string _redirectUrl;
        private readonly string _momoApiUrl;


        private const string OrderInfo = "Demo tích hợp SDK MOMO";
        private const string ExtraData = "eyJ1c2VybmFtZSI6ICJtb21vIn0=";

        private readonly IAppLogger _logger;

        public MomoService(HttpClient httpClient, IOptions<AppConfig> config, IAppLogger logger)
        {
            _httpClient = httpClient;
            _config = config.Value;
            _logger = logger;

            _ipnUrl = $"{_config.BaseUrl}/payment-return?method=momo";
            _redirectUrl = $"{_config.BaseUrl}/payment-return?method=momo";
            _momoApiUrl = _config.MomoApiUrl;
        }

        public async Task<ResponseModel> CheckTransactionStatus(string orderId)
        {
            try
            {
                string requestId = Guid.NewGuid().ToString();
                string signatureString = $"accessKey={_config.MomoAccessKey}&orderId={orderId}&partnerCode={_config.MomoPartnerCode}&requestId={requestId}";
                string signature = CreateSignature(signatureString, _config.MomoSecretKey);

                var payload = new
                {
                    partnerCode = _config.MomoPartnerCode,
                    requestId = requestId,
                    orderId = orderId,
                    lang = "vi",
                    signature = signature
                };

                var response = await _httpClient.PostAsJsonAsync($"{_momoApiUrl}/v2/gateway/api/query", payload);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var jsonDoc = JsonDocument.Parse(content);
                    int resultCode = jsonDoc.RootElement.GetProperty("resultCode").GetInt32();
                    string message = jsonDoc.RootElement.GetProperty("message").GetString();
                    if (resultCode == 0)
                        return ResponseModel.Success(message);
                    else
                        return ResponseModel.Error(message);
                }

                return ResponseModel.Error("Failed to check transaction status");
            }
            catch (Exception ex)
            {
                return ResponseModel.Error("Error checking transaction status", ex.Message);
            }
        }

        public async Task<ResponseModel> CreatePaymentAsync(PaymentDto dto, double amount)
        {

            if (string.IsNullOrEmpty(dto.OrderId))
            {
                return ResponseModel.BadRequest("OrderId, and amount are required.");
            }

            // Build the signature string
            string RequestId = Guid.NewGuid().ToString();
            string signatureString = $"accessKey={_config.MomoAccessKey}&amount={amount}&extraData={ExtraData}&ipnUrl={_ipnUrl}&orderId={dto.OrderId}&orderInfo={OrderInfo}&partnerCode={_config.MomoPartnerCode}&redirectUrl={_redirectUrl}&requestId={RequestId}&requestType=captureWallet";

            // Create SHA256 signature
            string signature = CreateSignature(signatureString, _config.MomoSecretKey);

            // Prepare the MoMo payment request payload
            var payload = new
            {
                partnerCode = _config.MomoPartnerCode,
                partnerName = "Tên doanh nghiệp SDK4ME",
                storeId = $"{_config.MomoPartnerCode}_1",
                requestId = RequestId,
                amount = amount,
                orderId = dto.OrderId,
                orderInfo = OrderInfo,
                redirectUrl = $"{_redirectUrl}&orderId={dto.OrderId}",
                ipnUrl = $"{_ipnUrl}&orderId={dto.OrderId}",
                requestType = "captureWallet",
                extraData = ExtraData,
                lang = "vi",
                signature = signature
            };

            try
            {
                var response = await _httpClient.PostAsJsonAsync($"{_momoApiUrl}/v2/gateway/api/create", payload);
                _logger.LogError(await response.Content.ReadAsStringAsync());
                string paymentUrl = await GetPayUrl(response);
                if (response.IsSuccessStatusCode)
                {
                    return ResponseModel.Success("Payment created successfully", paymentUrl);
                }

                return ResponseModel.Error("Failed to create MoMo payment");
            }
            catch (Exception ex)
            {
                return ResponseModel.Error("Error occurred while processing payment.", ex.Message);
            }
        }

        public async Task<string> GetPayUrl(HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();

            // Deserialize the JSON content into a JsonDocument
            var jsonDoc = JsonDocument.Parse(content);

            // Directly access the payUrl property
            string payUrl = jsonDoc.RootElement.GetProperty("payUrl").GetString();

            return payUrl;
        }

        private string CreateSignature(string signatureString, string secretKey)
        {
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signatureString));
                return BitConverter.ToString(hash).Replace("-", "").ToLower();
            }
        }
    }
}
