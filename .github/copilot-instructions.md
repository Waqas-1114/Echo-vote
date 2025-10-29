# EchoVote 

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
EchoVote is a transparent feedback democracy platform for Indian administrative bodies. This is a Next.js application with TypeScript, focusing on civic engagement and administrative transparency.

## Key Features
- Hierarchical complaint system with escalation mechanism
- Dual authentication system (citizens and government officers)
- Anonymous user complaints with public tracking
- Administrative division data for all Indian states, districts, and wards
- MongoDB with Docker for data persistence
- Real-time notifications and status updates

## Technical Stack
- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Docker (replica set)
- **Authentication**: JWT-based with separate user types
- **Styling**: Tailwind CSS with modern UI components
- **Deployment**: Docker containerization

## Code Style Guidelines
- Use TypeScript strictly with proper type definitions
- Follow Next.js 14+ App Router patterns
- Use Tailwind CSS for all styling
- Implement proper error handling and validation
- Use async/await for database operations
- Follow Indian administrative hierarchy structure
- Ensure user anonymity and data privacy
- Implement proper role-based access control

## Administrative Structure
- States → Districts → Sub-divisions → Blocks/Tehsils → Panchayats/Wards
- Each level has specific responsibilities and escalation rules
- Government officers are assigned to specific administrative units
- Complaints flow upward if not resolved at lower levels

## Security Considerations
- User anonymity is paramount
- Secure officer authentication with role verification
- Data sanitization for all inputs
- Rate limiting for API endpoints
- Proper session management
- Use HTTPS for all communications
