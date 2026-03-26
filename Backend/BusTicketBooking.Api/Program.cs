using System.Text;
using BusTicketBooking.Contexts;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models; // for Roles if you enable policies
using BusTicketBooking.Repositories;
using BusTicketBooking.Seed;
using BusTicketBooking.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // Ensure DateTime values are always serialized with 'Z' (UTC).
        // Without this, System.Text.Json omits the 'Z' and browsers treat the
        // value as local time instead of UTC, causing the time shift bug.
        o.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
        o.JsonSerializerOptions.Converters.Add(new UtcNullableDateTimeConverter());
    });

// Swagger + JWT bearer security
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BusTicketBooking API",
        Version = "v1",
        Description = "Web API for Bus Ticket Booking (Auth + Roles + Generic Repository)"
    });

    // JWT security definition for Swagger "Authorize" button
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by your token. Example: Bearer abc123"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

#region Contexts
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default"));
});
#endregion

#region CORS
// Keep your existing default "AllowAny*" CORS for now.
// You can tighten this when you hook up the real FE domain(s).
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});
#endregion

#region Services
// Auth-related services
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IUserService, UserService>();

// Domain services
builder.Services.AddScoped<IBusService, BusService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<IBookingService, BookingService>();

// ? NEW: needed for From/To dropdowns (cities & stops)
builder.Services.AddScoped<IStopService, StopService>();

// Wallet
builder.Services.AddScoped<WalletService>();

// Audit & error logging
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<BusTicketBooking.Middlewares.GlobalExceptionMiddleware>();
#endregion

#region Repositories
// Single generic repository for all entities
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
#endregion

#region Middlewares (Authentication/Authorization)
// JWT configuration
string jwtKey = builder.Configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT secret not found. Set 'Jwt:Key' in User Secrets or appsettings.");
string? jwtIssuer = builder.Configuration["Jwt:Issuer"];
string? jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

// Optional named policies if you prefer policy-based attributes
// builder.Services.AddAuthorization(options =>
// {
//     options.AddPolicy("AdminOnly", p => p.RequireRole(Roles.Admin));
//     options.AddPolicy("OperatorOnly", p => p.RequireRole(Roles.Operator));
// });
builder.Services.AddAuthorization(); // keep default authorization enabled
#endregion

var app = builder.Build();

// Seed database in Development (migrate + seed Admin/Operator + sample Stops)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var sp = scope.ServiceProvider;

    var db = sp.GetRequiredService<AppDbContext>();
    var passwords = sp.GetRequiredService<IPasswordService>();
    var cfg = sp.GetRequiredService<IConfiguration>();
    var logger = app.Logger;

    await DbSeeder.SeedAsync(db, passwords, cfg, logger);

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Keep your existing default CORS usage
app.UseCors();

app.UseMiddleware<BusTicketBooking.Middlewares.AuditMiddleware>();
app.UseMiddleware<BusTicketBooking.Middlewares.GlobalExceptionMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();