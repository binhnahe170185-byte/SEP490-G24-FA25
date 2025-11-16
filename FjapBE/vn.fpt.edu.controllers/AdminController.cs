using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FJAP.vn.fpt.edu.models;

namespace FJAP.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
	private readonly FjapDbContext _db;

	public AdminController(FjapDbContext db)
	{
		_db = db;
	}

	// ---------------- Dashboard ----------------
	// GET: /api/Admin/dashboard
	// Displays key statistics such as number of users, departments, semesters, and system alerts.
	[HttpGet("dashboard")]
	public async Task<IActionResult> GetDashboard()
	{
		var totalUsers = await _db.Users.AsNoTracking().CountAsync();
		var totalDepartments = await _db.Departments.AsNoTracking().CountAsync();
		var totalSemesters = await _db.Semesters.AsNoTracking().CountAsync();

		// Role breakdown
		var usersByRole = await _db.Users
			.AsNoTracking()
			.GroupBy(u => u.RoleId)
			.Select(g => new { roleId = g.Key, count = g.Count() })
			.ToListAsync();

		// Placeholder for alerts until a real alert subsystem exists
		var systemAlerts = 0;

		return Ok(new
		{
			totalUsers,
			totalDepartments,
			totalSemesters,
			systemAlerts,
			usersByRole
		});
	}

	// ---------------- Assign Head of Administration ----------------
	// POST: /api/Admin/assign/head-admin
	// Allows Admin to appoint or remove Head of Administration and manage staff in the department.
	public class AssignHeadRequest
	{
		public int UserId { get; set; }
	}

	[HttpPost("assign/head-admin")]
	public async Task<IActionResult> AssignHeadOfAdministration([FromBody] AssignHeadRequest request)
	{
		if (request == null || request.UserId <= 0) return BadRequest(new { message = "Invalid request" });

		var candidate = await _db.Users.SingleOrDefaultAsync(u => u.UserId == request.UserId);
		if (candidate == null) return NotFound(new { message = "User not found" });

		// Validate candidate must be Administration_Staff (role 6) in Administration department (id=1)
		if (candidate.RoleId != 6)
		{
			return BadRequest(new { message = "Only Administration_Staff (role 6) can be promoted to Head of Administration" });
		}
		if (candidate.DepartmentId != 1)
		{
			return BadRequest(new { message = "Candidate must belong to Administration department (departmentId=1)" });
		}

		// Demote current Head of Administration (roleId = 2) to Staff of Admin (roleId = 6)
		var currentHead = await _db.Users.SingleOrDefaultAsync(u => u.RoleId == 2);
		if (currentHead != null && currentHead.UserId != candidate.UserId)
		{
			currentHead.RoleId = 6;
			// ensure stays in Administration department
			currentHead.DepartmentId ??= 1;
		}

		candidate.RoleId = 2;
		candidate.DepartmentId ??= 1;
		var changed = await _db.SaveChangesAsync();

		return Ok(new
		{
			message = changed > 0 ? "Assigned Head of Administration successfully" : "No changes were made",
			user = new
			{
				candidate.UserId,
				candidate.FirstName,
				candidate.LastName,
				candidate.Email,
				candidate.RoleId,
				candidate.DepartmentId
			}
		});
	}

	// ---------------- Assign Head of Academic Department ----------------
	// POST: /api/Admin/assign/head-academic
	// Enables Admin to appoint or remove Head of Academic Department and manage academic teams.
	[HttpPost("assign/head-academic")]
	public async Task<IActionResult> AssignHeadOfAcademic([FromBody] AssignHeadRequest request)
	{
		if (request == null || request.UserId <= 0) return BadRequest(new { message = "Invalid request" });

		var candidate = await _db.Users.SingleOrDefaultAsync(u => u.UserId == request.UserId);
		if (candidate == null) return NotFound(new { message = "User not found" });

		// Validate candidate must be Academic_Staff (role 7) in Academic department (id=2)
		if (candidate.RoleId != 7)
		{
			return BadRequest(new { message = "Only Academic_Staff (role 7) can be promoted to Head of Academic" });
		}
		if (candidate.DepartmentId != 2)
		{
			return BadRequest(new { message = "Candidate must belong to Academic department (departmentId=2)" });
		}

		// Demote current Head of Academic (roleId = 5) to Staff Academic (roleId = 7)
		var currentHead = await _db.Users.SingleOrDefaultAsync(u => u.RoleId == 5);
		if (currentHead != null && currentHead.UserId != candidate.UserId)
		{
			currentHead.RoleId = 7;
			// ensure stays in Academic department
			currentHead.DepartmentId ??= 2;
		}

		candidate.RoleId = 5;
		candidate.DepartmentId ??= 2;
		var changed = await _db.SaveChangesAsync();

		return Ok(new
		{
			message = changed > 0 ? "Assigned Head of Academic successfully" : "No changes were made",
			user = new
			{
				candidate.UserId,
				candidate.FirstName,
				candidate.LastName,
				candidate.Email,
				candidate.RoleId,
				candidate.DepartmentId
			}
		});
	}

	// ---------------- Manage Roles & Permissions ----------------
	// Allows Admin to create, update, or delete roles and assign specific permissions.
	// NOTE: The current system uses Role names only; a dedicated permission table does not exist yet.

	// GET: /api/Admin/roles
	[HttpGet("roles")]
	public async Task<IActionResult> GetRoles()
	{
		var roles = await _db.Roles.AsNoTracking()
			.OrderBy(r => r.RoleId)
			.ToListAsync();
		return Ok(roles);
	}

	public class UpsertRoleRequest
	{
		public string RoleName { get; set; } = string.Empty;
	}

	// POST: /api/Admin/roles
	[HttpPost("roles")]
	public async Task<IActionResult> CreateRole([FromBody] UpsertRoleRequest request)
	{
		if (request == null || string.IsNullOrWhiteSpace(request.RoleName))
			return BadRequest(new { message = "RoleName is required" });

		var exists = await _db.Roles.AnyAsync(r => r.RoleName == request.RoleName);
		if (exists) return Conflict(new { message = "Role name already exists" });

		var role = new Role { RoleName = request.RoleName.Trim() };
		_db.Roles.Add(role);
		await _db.SaveChangesAsync();
		return Ok(role);
	}

	// PUT: /api/Admin/roles/{id}
	[HttpPut("roles/{id:int}")]
	public async Task<IActionResult> UpdateRole(int id, [FromBody] UpsertRoleRequest request)
	{
		if (string.IsNullOrWhiteSpace(request.RoleName))
			return BadRequest(new { message = "RoleName is required" });

		var role = await _db.Roles.SingleOrDefaultAsync(r => r.RoleId == id);
		if (role == null) return NotFound(new { message = "Role not found" });

		var nameExists = await _db.Roles.AnyAsync(r => r.RoleName == request.RoleName && r.RoleId != id);
		if (nameExists) return Conflict(new { message = "Role name already exists" });

		role.RoleName = request.RoleName.Trim();
		await _db.SaveChangesAsync();
		return Ok(role);
	}

	// DELETE: /api/Admin/roles/{id}
	[HttpDelete("roles/{id:int}")]
	public async Task<IActionResult> DeleteRole(int id)
	{
		var role = await _db.Roles.SingleOrDefaultAsync(r => r.RoleId == id);
		if (role == null) return NotFound(new { message = "Role not found" });

		var hasUsers = await _db.Users.AnyAsync(u => u.RoleId == id);
		if (hasUsers) return BadRequest(new { message = "Cannot delete role that is assigned to users" });

		_db.Roles.Remove(role);
		await _db.SaveChangesAsync();
		return Ok(new { message = "Role deleted" });
	}
}


