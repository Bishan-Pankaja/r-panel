<div align="center">
  <h1>🚀 R-Panel</h1>
  <p>A self-hostable Platform as a Service (PaaS) with role-based access control and subscription support</p>
</div>
<br />

R-Panel is a free, self-hostable Platform as a Service (PaaS) that simplifies the deployment and management of applications and databases with advanced role-based access control and subscription management.

## ✨ Features

R-Panel includes multiple features to make your life easier.

- **Role-Based Access Control**: 
  - **Owner/Admin**: Full access to all features
  - **Hobby/Startup**: Limited access based on active subscription
  - **Member**: Access to Home, Profile, and Buy pages only
- **Subscription Management**: 
  - One-time payment support via Regz Pay
  - Flexible duration options (1 month, 3 months, 9 months, 1 year)
  - Automatic role assignment based on subscription tier
- **Applications**: Deploy any type of application (Node.js, PHP, Python, Go, Ruby, etc.).
- **Databases**: Create and manage databases with support for MySQL, PostgreSQL, MongoDB, MariaDB, libsql, and Redis.
- **Backups**: Automate backups for databases to an external storage destination.
- **Docker Compose**: Native support for Docker Compose to manage complex applications.
- **Multi Node**: Scale applications to multiple nodes using Docker Swarm to manage the cluster.
- **Templates**: Deploy open-source templates (Plausible, Pocketbase, Calcom, etc.) with a single click.
- **Traefik Integration**: Automatically integrates with Traefik for routing and load balancing.
- **Real-time Monitoring**: Monitor CPU, memory, storage, and network usage for every resource.
- **Docker Management**: Easily deploy and manage Docker containers.
- **CLI/API**: Manage your applications and databases using the command line or through the API.
- **Notifications**: Get notified when your deployments succeed or fail (via Slack, Discord, Telegram, Email, etc.).
- **Multi Server**: Deploy and manage your applications remotely to external servers.
- **Self-Hosted**: Self-host R-Panel on your VPS.

## 🚀 Getting Started

To get started, run the following command on a VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/Bishan-Pankaja/r-panel/main/install.sh | bash
```

### With Predefined Root User

```bash
ROOT_USERNAME=admin ROOT_USER_EMAIL=admin@example.com ROOT_USER_PASSWORD=securepass curl -fsSL https://raw.githubusercontent.com/Bishan-Pankaja/r-panel/main/install.sh | bash
```

### Environment Variables

- `ROOT_USERNAME` - Predefined root username
- `ROOT_USER_EMAIL` - Predefined root user email
- `ROOT_USER_PASSWORD` - Predefined root user password
- `DATABASE_URL` - PostgreSQL database URL
- `AUTOUPDATE` - Set to "false" to disable auto-updates

## 📋 Role Permissions

### Owner / Admin
- Full access to all features
- Can manage users and organizations
- Can configure system settings
- Can deploy and manage all resources

### Hobby / Startup (with active subscription)
- Access to Home, Profile, Buy, Projects, Deployments, Schedules, Traefik File System, Docker, Swarm
- Limited time access based on subscription duration
- Can manage their own applications and databases

### Member
- Access to Home, Profile, and Buy pages only
- Can purchase subscriptions to upgrade access

## 💳 Subscription Plans

### Hobby Plan
- $4.50/month per server
- Basic application deployment
- Essential database management

### Startup Plan
- $15/month base (includes 3 servers)
- $4.50/month per additional server
- Advanced features and priority support

### Duration Options
- 1 month
- 3 months
- 9 months
- 1 year

## 🛠️ Manual Installation

If you prefer manual installation:

1. Clone the repository:
```bash
git clone https://github.com/Bishan-Pankaja/r-panel.git
cd r-panel
```

2. Install dependencies:
```bash
pnpm install
```

3. Setup environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations:
```bash
# Add subscription support columns
psql -h localhost -U postgres -d rpanel -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"subscriptionTier\" text;"
psql -h localhost -U postgres -d rpanel -c "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS \"subscriptionEndDate\" timestamp;"

# Run Drizzle migrations
pnpm drizzle-kit migrate --config=apps/dokploy/server/db/drizzle.config.ts
```

5. Build and start:
```bash
pnpm build
docker-compose up -d
```

## 🤝 Contributing

Check out the [Contributing Guide](CONTRIBUTING.md) for more information.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Based on [Dokploy](https://github.com/dokploy/dokploy) - An open-source PaaS solution.
