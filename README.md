# Engagement Lifecycle Management Platform

A simple Azure-based engagement lifecycle application built with:

- React + TypeScript + Vite
- Azure Static Web Apps
- Azure Functions (Node.js + TypeScript)
- Azure Storage Table
- Microsoft Entra ID + MSAL React
- Azure Key Vault (prepared for later secrets)
- GitHub Actions for CI/CD

## Architecture

Browser
  -> Azure Static Web Apps (React)
  -> Azure Functions REST API
  -> Azure Table Storage

Authentication:
React -> MSAL -> Microsoft Entra ID -> access token -> Azure Functions

For the first version, this project intentionally does NOT use:
- Azure SQL Managed Instance
- Azure Blob Storage
- VNet/private networking

## Repository structure

frontend/     React application
backend/      Azure Functions API
database/     seed script and data model notes
.github/      GitHub Actions workflows

## Prerequisites

Install:
- Node.js 20+
- Git
- VS Code
- Azure account/subscription
- GitHub account

Optional:
- Azure CLI
- Azure Functions Core Tools

## Run the frontend locally

cd frontend
npm install
cp .env.example .env
npm run dev

The default demo mode lets you see the UI without configuring Entra ID.

## Run the backend locally

cd backend
npm install
cp local.settings.example.json local.settings.json

Set:
AzureWebJobsStorage=<your Azure Storage connection string>

Then:

npm run build
npm start

The API will normally run at:
http://localhost:7071/api

## Seed Azure Table Storage

After setting AzureWebJobsStorage in backend/local.settings.json:

cd backend
npm run seed

This creates:
- Clients
- Engagements
- EngagementStages
- Activities

## Azure deployment order

1. Create Resource Group
2. Create Storage Account
3. Create the four tables by running the seed script
4. Create Function App
5. Configure Function App settings
6. Create Entra ID app registrations
7. Configure MSAL in the frontend
8. Create Static Web App and connect GitHub
9. Configure frontend environment variables
10. Configure GitHub Actions for the Function App
11. Enable managed identity for the Function App and grant Storage Table Data Contributor
12. Add Key Vault only when a real secret is needed

## CI/CD

Frontend:
git push -> GitHub -> Static Web Apps GitHub Action -> production site

Backend:
git push -> GitHub -> Function App GitHub Action -> Function App

The workflows are prepared in .github/workflows.

For a beginner-friendly first deployment, connect Static Web Apps to GitHub from the Azure portal. Azure generates the frontend deployment workflow automatically. After that, every push to the configured branch deploys the frontend.

For the backend, create a GitHub Actions OIDC connection to Azure and put these repository variables/secrets in GitHub:
- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID
- AZURE_FUNCTIONAPP_NAME

## Important security notes

- Never put Storage connection strings, Function keys, client secrets, or Key Vault secrets in React.
- VITE_* values are public browser configuration.
- In production, use Managed Identity for Function -> Storage.
- Protect the API with Microsoft Entra ID before production use.
- Do not expose a seed/admin endpoint.

## API

GET    /api/health
GET    /api/engagements
GET    /api/engagements/{id}
POST   /api/engagements
PUT    /api/engagements/{id}
GET    /api/engagements/{id}/timeline
PUT    /api/engagements/{id}/stages/{stageKey}

## Lifecycle

PROSPECT
PROPOSAL
ENGAGEMENT_LETTER
DOCUMENT_COLLECTION
PREPARATION
REVIEW
FILING
BILLING
PAYMENT
RENEWAL


## Demo mode

If `VITE_ENABLE_DEMO_MODE` is missing or set to anything other than `false`, the frontend runs in demo mode.
This is intentional so the UI can be deployed before Entra is configured.

Set:
VITE_ENABLE_DEMO_MODE=false

only after configuring the Entra web/API registrations and API scope.

## Current MVP security boundary

The sample backend is intentionally anonymous during the infrastructure/bootstrap phase so you can verify:
React -> Function -> Table Storage.

Before production, add Entra access-token validation to the Function API and restrict the API to authenticated callers.
The portal guide describes this as the next security step.
