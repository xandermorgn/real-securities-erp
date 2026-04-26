# Real Securities ERP System - Owner Panel

A comprehensive ERP system for Real Security Investigations, built with Next.js, TypeScript, and Express.

## Features

- **Dashboard**: Real-time attendance overview and statistics
- **Staff Management**: Complete CRUD operations for security staff
- **Area Management**: Organize security zones and areas
- **Points Management**: Manage security checkpoints
- **Roles & Users**: User management with role-based access

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19 + TypeScript
- TailwindCSS (Glassmorphism UI)
- Radix UI Components
- Lucide React Icons

### Backend
- Node.js + Express
- TypeScript
- REST API

### Database
- Supabase (PostgreSQL)
- Supabase Storage

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
JWT_SECRET=your_jwt_secret_key_here
```

3. Set up the database:
- Go to your Supabase project
- Run the SQL schema in `lib/database-schema.sql`
- Create storage buckets: `staff-photos` and `documents`

## Running the Application

### Development Mode

Run both frontend and backend together:
```bash
npm run start:full
```

Or run them separately:

Frontend (Next.js on port 3000):
```bash
npm run dev
```

Backend API (Express on port 4000):
```bash
npm run api
```

### Access the Application

- Frontend: http://localhost:3000
- API: http://localhost:4000
- API Health Check: http://localhost:4000/api/health

## Project Structure

```
real-securities-erp/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── staff/             # Staff management
│   ├── areas/             # Area management
│   ├── points/            # Points management
│   └── roles/             # User roles
├── api/                    # Express API server
│   └── server.ts          # API routes and logic
├── components/            # Reusable UI components
├── lib/                   # Utilities and configs
├── types/                 # TypeScript type definitions
└── public/                # Static assets (logo, favicon)
```

## Default Data

The system comes with pre-configured:

### Shifts
- 8 AM - 8 PM
- 8 PM - 8 AM
- 8 AM - 4 PM
- 4 PM - 12 AM
- 12 AM - 8 AM

### Designations
- Guard
- Supervisor
- Head Guard
- Dog Squad
- Security Officer
- Gunman
- Laborer
- Forklift
- OP
- BO
- Housekeeping

## Design System

The UI uses a custom glassmorphism design with:
- Frosted glass effect cards
- Backdrop blur
- Translucent overlays
- Mobile-first responsive layout
- Dark gradient background

## API Endpoints

### Dashboard
- `GET /api/dashboard/attendance` - Get attendance stats

### Staff
- `GET /api/staff` - List all staff
- `GET /api/staff/:id` - Get staff details
- `POST /api/staff` - Create staff
- `PUT /api/staff/:id` - Update staff
- `DELETE /api/staff/:id` - Delete staff

### Areas & Points
- `GET /api/areas` - List areas
- `POST /api/areas` - Create area
- `GET /api/points` - List points
- `POST /api/points` - Create point

### System
- `GET /api/shifts` - Get shifts
- `GET /api/designations` - Get designations
- `GET /api/users` - List users
- `POST /api/users` - Create user

## License

Private - Real Security Investigations

## Support

For issues or questions, contact the development team.
