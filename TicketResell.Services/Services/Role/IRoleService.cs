﻿using Repositories.Core.Dtos.Role;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TicketResell.Services.Services
{
    public interface IRoleService
    {
        public Task<ResponseModel> CreateRoleAsync(RoleCreateDto dto, bool saveAll = true);
        public Task<ResponseModel> GetRoleByIdAsync(string id);
        public Task<ResponseModel> GetAllRoleAsync();
        public Task<ResponseModel> UpdateRoleAsync(string id, RoleUpdateDto dto, bool saveAll = true);
        public Task<ResponseModel> DeleteRoleAsync(string id, bool saveAll = true);
    }
}
