# QuickSend Technology Stack Overview

## Application Overview
QuickSend is a file sharing application that allows users to upload files and share them via links or email. The application is built with a modern tech stack and deployed on Google Cloud Platform.

## Core Technologies

### Frontend
- **React 18**: Modern JavaScript library for building user interfaces
- **TypeScript**: Strongly typed programming language that builds on JavaScript
- **Vite**: Next-generation frontend build tool and development server
- **React Router DOM**: Client-side routing for React applications
- **React Context API**: Built-in state management solution for React

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework for Node.js
- **TypeScript**: For type-safe backend development

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible components for building high‑quality design systems
- **Lucide React**: Beautiful & consistent icons
- **Class Variance Authority**: For managing component variants
- **Tailwind Merge**: For merging Tailwind CSS classes efficiently

## Cloud Infrastructure (Google Cloud Platform)

### Deployment
- **Cloud Run**: Serverless container platform hosting both frontend and backend services
  - Frontend Service: Serves the React application
  - Backend Service: Handles API requests and business logic
- **Cloud Build**: CI/CD pipeline automation
  - Connected to GitHub repository
  - Automated builds and deployments on code changes
  - Handles environment variable injection and secret management

### Storage and Database
- **Google Cloud Storage**: Primary file storage solution
  - Stores user-uploaded files
  - Handles file metadata and access control
- **Cloud Firestore**: NoSQL document database
  - Stores user data
  - Manages file metadata
  - Handles sharing permissions and access control

### Authentication and Security
- **Firebase Authentication**: User authentication and management
- **Google Secret Manager**: Secure storage of sensitive configuration
  - Firebase configuration
  - API keys
  - Environment variables

## Development Tools

### Frontend Development
- **ESLint**: JavaScript/TypeScript linter
- **PostCSS**: CSS transformation tool
- **Autoprefixer**: PostCSS plugin to parse CSS and add vendor prefixes

### Backend Development
- **Nodemon**: Development server with auto-reload
- **Jest**: Testing framework
- **ts-jest**: TypeScript preprocessor for Jest

### Containerization
- **Docker**: Containerization platform
  - Separate containers for frontend and backend
  - Multi-stage builds for optimization
- **Nginx**: Web server for frontend static file serving

## Application Flow

### User Authentication
1. User logs in through Firebase Authentication
2. Authentication state is managed in React Context
3. Protected routes ensure authenticated access

### File Upload and Sharing
1. User uploads file through the frontend interface
2. File is stored in Google Cloud Storage
3. File metadata is saved in Firestore
4. User can share the file in two ways:
   - Copy a shareable link
   - Send via email (automatically generates and sends link)

### Data Flow
1. Frontend (Cloud Run) serves the React application
2. Backend (Cloud Run) handles API requests
3. Files are stored in Cloud Storage
4. Metadata and user data are stored in Firestore
5. Authentication is handled by Firebase Auth

## Development Workflow
1. Local development using Vite dev server
2. TypeScript compilation
3. Docker containerization
4. Automated deployment through Cloud Build
5. Continuous Integration/Continuous Deployment (CI/CD)

## Security Features
- Firebase Authentication for user management
- Secure file storage with Google Cloud Storage
- CORS protection
- Environment variable management through Secret Manager
- Type safety with TypeScript
- Secure file sharing through generated tokens

## Performance Considerations
- Vite for fast development and optimized builds
- Tailwind CSS for optimized CSS
- Cloud Storage for efficient file handling
- Serverless architecture for automatic scaling
- Nginx for efficient static file serving

## Monitoring and Maintenance
- Google Cloud Platform monitoring
- Firebase Analytics
- Error tracking and logging
- Performance monitoring through Cloud Run metrics

This technology stack provides a modern, scalable, and maintainable foundation for the QuickSend application, leveraging Google Cloud Platform services for reliability and performance while maintaining a robust development workflow. 