# Niche Community Platform

A modern web application for creating and participating in niche communities. Built with React, Tailwind CSS, and Firebase.

## Features

- User authentication (signup, login, logout)
- Create and join communities
- Post and interact with community content
- Real-time updates
- Responsive design
- Rich text editing
- Community categories and search
- User profiles
- Member management

## Tech Stack

- Frontend: React + Tailwind CSS
- Backend: Firebase (Authentication, Firestore)
- State Management: React Context API
- Routing: React Router
- UI Components: Headless UI

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd niche-community-platform
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a Firebase project and enable:
   - Authentication (Email/Password)
   - Firestore Database
   - Analytics (optional)

4. Update the Firebase configuration in `src/config/firebase.js` with your project credentials.

5. Start the development server:
```bash
npm start
# or
yarn start
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── contexts/       # React context providers
  ├── pages/         # Page components
  ├── config/        # Configuration files
  ├── App.js         # Main application component
  └── index.js       # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 