# Integration.app Solution Engineer Test Assignment

## Task Overview

This repository contains a contact management app that lets users add, edit and delete contacts. It connects to other systems using the Integration.app SDK. The task is to add two-way contact syncing between this app and connected CRM systems, so that contacts stay up to date everywhere.

##  Description

Your goal is to implement a contact synchronization system that can:
1. Import contacts from connected CRM systems
2. Export contacts to connected CRM systems
3. Keep contacts in sync between the application and CRM systems
4. Handle conflicts and data inconsistencies
5. Provide a user-friendly interface for managing sync operations

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local and add your Integration.app credentials
   # Get these from: https://console.integration.app
   INTEGRATION_APP_WORKSPACE_KEY=your_workspace_key_here
   INTEGRATION_APP_WORKSPACE_SECRET=your_workspace_secret_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

The application requires the following environment variables:

- `INTEGRATION_APP_WORKSPACE_KEY` - Your Integration.app workspace key
- `INTEGRATION_APP_WORKSPACE_SECRET` - Your Integration.app workspace secret
- `MONGODB_URI` - MongoDB connection string (optional, defaults to local instance)
- `NEXT_PUBLIC_CUSTOMER_ID` - Customer ID for authentication (demo purposes)

If these are not configured, you'll see helpful error messages in the Integrations page with setup instructions.

## Implementation Requirements

- Implement integration with at least two CRM systems (e.g. HubSpot and Pipedrive - it's easy to get account there)
- Use the Integration.app React SDK

## Evaluation Criteria

We'll evaluate your solution based on:
1. **Integration Logic**
   - Clean and maintainable code structure
   - Proper error handling
   - Robust bi-directional sync logic
2. **Code Quality**
3. **User Experience**


## Submission Requirements

1. Source code repository
2. Live demo URL (e.g., Vercel deployment)
3. Brief documentation of your implementation approach and any assumptions or decisions made during development

## Questions and Support

Feel free to:
- Ask questions about the requirements
- Discuss implementation approaches
- Request clarification on any aspect
- Share your progress and get feedback

Remember, there's no single "correct" solution. We're interested in your approach, problem-solving skills, and ability to build a practical, working solution on your own.