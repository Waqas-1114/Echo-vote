# EchoVote - Transparent Feedback Democracy 📋

A civic platform where every feedback submission is publicly trackable, like GitHub issues for governance. Built for Indian administrative bodies to provide transparency, accountability, and citizen empowerment.

## 🌟 Overview

**Problem**: Public feedback systems are opaque — people's voices vanish into databases.

**Solution**: EchoVote turns government feedback into transparent version-controlled issues, empowering citizens and building trust.

## ✨ Key Features

- **🔍 Complete Transparency**: Every complaint is publicly visible with real-time status updates
- **📈 Hierarchical Escalation**: Issues automatically escalate from Panchayat → Block → District → State if unresolved
- **🛡️ Anonymous Options**: Citizens can submit complaints anonymously while maintaining issue transparency
- **👥 Community Support**: Other citizens can upvote similar issues and add supportive comments
- **📊 Performance Metrics**: Public dashboards showing response times and department performance
- **✅ Verified Resolution**: Citizens and officials can verify that issues are actually resolved

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Docker (replica set for high availability)
- **Authentication**: JWT-based with separate user types (Citizens, Government Officers, Admin)
- **UI Components**: Radix UI with custom Tailwind styling
- **Deployment**: Docker containerization

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd echovote
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start MongoDB with Docker**
   ```bash
   npm run docker:up
   ```

5. **Seed the database with Indian administrative data**
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Visit [http://localhost:3000](http://localhost:3000)

### One-Command Setup

For a complete setup including Docker and database seeding:
```bash
npm run setup
```

## 🏗️ Architecture

### Authentication System
- **Citizens**: Can submit anonymous or identified complaints
- **Government Officers**: Role-based access to assigned jurisdictions
- **Admin**: Full system access and user verification

### Complaint Lifecycle
1. **Submission**: Citizen posts issue with location details
2. **Assignment**: Automatically routed to appropriate administrative division
3. **Tracking**: Public status updates (submitted → acknowledged → in_progress → resolved)
4. **Escalation**: Auto-escalates if not resolved within SLA
5. **Resolution**: Verified by both officials and citizens

## 🐳 Docker Configuration

The project includes a complete Docker setup with MongoDB replica set:

```bash
# Start all services
npm run docker:up

# View logs  
npm run docker:logs

# Stop services
npm run docker:down
```

## 🌍 Indian Administrative Data

The platform includes comprehensive data for:

- **28 States + 8 Union Territories**
- **700+ Districts** 
- **Sample Blocks and Panchayats**
- **8 Common Government Departments** with categories and subcategories

## 📱 User Types & Dashboards

### Citizen Dashboard
- Submit complaints (anonymous or identified)
- Track complaint status
- Browse public issues
- Support community complaints

### Government Officer Dashboard
- View assigned complaints
- Update complaint status
- Escalate to higher authorities
- Performance analytics

### Admin Dashboard
- Verify government officers
- System analytics
- User management

## 🔒 Security Features

- **User Anonymity**: Protected anonymous submission system
- **Role-based Access Control**: Proper permission management
- **Data Sanitization**: All inputs are validated and sanitized
- **JWT Authentication**: Secure token-based authentication

## 📈 Transparency Features

- **Public Complaint Tracking**: GitHub-style issue tracking
- **Status History**: Complete audit trail of all actions
- **Performance Metrics**: Department-wise statistics
- **Escalation Tracking**: Clear escalation paths and timelines
- **Community Engagement**: Public support and commenting

## 📝 Environment Variables

```env
# Database
MONGODB_URI=mongodb://admin:password@localhost:27017,localhost:27018,localhost:27019/echovote?replicaSet=rs0&authSource=admin

# Authentication
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_here

# Application
NODE_ENV=development
```

## 🤝 Contributing

We welcome contributions! Key areas:

- Follow TypeScript best practices
- Maintain user anonymity and data privacy
- Follow Indian administrative hierarchy structure
- Write tests for new features

## 📄 License

This project is licensed under the MIT License.

---

**EchoVote** - Building transparency in governance, one complaint at a time. 🇮🇳
