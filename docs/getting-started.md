# Getting Started with PGLink Payment Aggregator

This guide will walk you through setting up and running the PGLink Payment Aggregator on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** database
- **PNPM** package manager (comes with Node.js)
- **Git** (for cloning the repository)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pglink
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required Node.js packages including:

- NestJS framework
- TypeORM for database ORM
- PostgreSQL driver
- Authentication libraries (Passport, JWT)
- HTTP client (Axios)
- Validation libraries (Class-validator, Class-transformer)
- Testing utilities (Jest, Supertest)

## Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your specific settings:

```env
# Application Settings
NODE_ENV=development
PORT=3000

# Database Connection
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=PGLink_payment
DATABASE_SSL=false  # Set to true for production with SSL

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Payment Provider Credentials
# Get these from your provider dashboards
XENDIT_API_KEY=your_xendit_api_key_here
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token_here

MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
```

> **Note**: Never commit your `.env` file to version control. The `.gitignore` file is already configured to exclude it.

### 3. Database Setup

Ensure PostgreSQL is running and create the database:

```bash
# Start PostgreSQL (if not already running)
# On macOS with Homebrew:
brew services start postgresql

# Create the database
createdb PGLink_payment
```

The application will automatically create tables on startup using TypeORM synchronization.

## Running the Application

### Development Mode

```bash
# Start with hot reload for development
pnpm run start:dev
```

The API will be available at `http://localhost:3000`

### Production Mode

```bash
# Build the application
pnpm run build

# Start the production server
pnpm run start:prod
```

### Debug Mode

```bash
# Start with debugging enabled
pnpm run start:debug
```

This enables the Node.js debugger on port 9229.

## Verifying the Installation

Once the application is running, you can verify it's working:

### Health Check

```bash
curl http://localhost:3000
```

You should see a response indicating the server is running.

### API Documentation

While there's no automated API documentation endpoint yet, you can:

1. Refer to the [API Reference](./api-reference.md) in this documentation
2. Check the source code in `src/modules/` for controller definitions
3. Use tools like Postman or Insomnia to test endpoints

## Common Issues

### Port Already in Use

If you get an error about port 3000 being in use:

- Change the PORT in your `.env` file
- Or stop the existing process using that port

### Database Connection Failed

Verify:

- PostgreSQL is running
- Database credentials in `.env` are correct
- The database `PGLink_payment` exists
- User has sufficient permissions

### Missing Environment Variables

The application will log warnings for missing required variables. Check your `.env` file against the template in `.env.example`.

## Next Steps

After getting the application running:

1. Explore the [API Reference](./api-reference.md)
2. Try registering an application via the Applications API
3. Create a payment request using your application's API key
4. Set up webhook endpoints to receive payment notifications
5. Review the [Architecture Overview](./architecture.md) for deeper understanding

## Need Help?

If you encounter issues:

1. Check the application logs for error messages
2. Review the [FAQ](./faq.md)
3. Open an issue in the repository
4. Contact the development team
