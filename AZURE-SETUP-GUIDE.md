# Azure Portal setup guide

This guide intentionally keeps the Azure architecture simple.

Resources:
1. Resource Group
2. Storage Account
3. Function App
4. Static Web App
5. Microsoft Entra ID App Registrations
6. Key Vault later

No SQL Managed Instance, Blob Storage, VNet, or private endpoints.

---

## STEP 0 - Install local tools

On macOS:

1. Install Node.js 20+.
2. Install Git.
3. Install VS Code.
4. Install Azure Functions Core Tools if you want to run the API locally.
5. Optional: install Azure CLI.

Verify:

node --version
npm --version
git --version
func --version

---

## STEP 1 - Create GitHub repository

GitHub:
1. Click + in the top-right.
2. Click New repository.
3. Repository name: engagement-lifecycle-platform
4. Choose Private.
5. Click Create repository.
6. Do not add a README if you are using this ZIP as the starting point.

Unzip this project locally, then:

cd engagement-lifecycle-platform
git init
git branch -M main
git add .
git commit -m "Initial engagement lifecycle platform"
git remote add origin https://github.com/YOUR_USER/engagement-lifecycle-platform.git
git push -u origin main

---

## STEP 2 - Create Resource Group

Azure Portal:
1. Open portal.azure.com.
2. Search for "Resource groups".
3. Click Resource groups.
4. Click + Create.
5. Subscription: choose your subscription.
6. Resource group: rg-engagement-dev
7. Region: choose the region your organization prefers.
8. Click Review + create.
9. Click Create.

Keep all development resources in this group.

---

## STEP 3 - Create Storage Account

Azure Portal:
1. Search "Storage accounts".
2. Click Storage accounts.
3. Click + Create.
4. Subscription: your subscription.
5. Resource group: rg-engagement-dev.
6. Storage account name: a globally unique lowercase name, e.g. stengagementdev12345.
7. Region: same as the resource group.
8. Performance: Standard.
9. Redundancy: LRS for development unless your organization requires another option.
10. Click Review.
11. Click Create.
12. Open the storage account after deployment.

Get the connection string for local development:
1. In the storage account, left menu -> Security + networking -> Access keys.
2. Click Show next to key1.
3. Copy Connection string.
4. Put it ONLY in backend/local.settings.json.
5. Never commit local.settings.json.

The application uses Table Storage inside this Storage Account.

---

## STEP 4 - Create the Function App

Azure Portal:
1. Search "Function App".
2. Click Function App.
3. Click + Create.
4. Choose "Function App".
5. Subscription: your subscription.
6. Resource Group: rg-engagement-dev.
7. Function App name: globally unique, e.g. func-engagement-dev-12345.
8. Publish: Code.
9. Runtime stack: Node.js.
10. Version: choose the current LTS supported by your region/portal, preferably Node 20 for this project.
11. Region: same region as Storage.
12. Operating System: Linux.
13. Plan type: choose a serverless/consumption option suitable for your subscription and workload.
14. Review + create.
15. Create.

After deployment:
1. Open the Function App.
2. Settings -> Environment variables.
3. Add:
   FUNCTIONS_WORKER_RUNTIME = node
   STORAGE_ACCOUNT_URL = https://<storage-account-name>.table.core.windows.net
4. Save.

For the first deployment, the Function can use the Storage connection string if you configure:
STORAGE_CONNECTION_STRING = <connection string>

Later we will switch the Function to Managed Identity so no storage secret is stored in the Function App.

---

## STEP 5 - Configure Function App authentication later

Do not mark this production-ready yet.

The current sample API uses anonymous Function authorization so you can get the infrastructure working first.

Before production:
1. Create the Entra API registration.
2. Expose an API scope.
3. Configure the React app registration.
4. Configure token validation on the Function API.
5. Remove anonymous access where appropriate.

We will do that after the basic API works.

---

## STEP 6 - Create Microsoft Entra ID app registrations

You need two registrations for a clean SPA/API separation.

### A. API registration

Azure Portal:
1. Search "App registrations".
2. Click App registrations.
3. Click + New registration.
4. Name: Engagement Lifecycle API.
5. Supported account types: Accounts in this organizational directory only.
6. Click Register.
7. Copy Application (client) ID and Directory (tenant) ID.

Expose the API:
1. Open the API registration.
2. Click Expose an API.
3. Click Set next to Application ID URI.
4. Accept the default URI.
5. Click Add a scope.
6. Scope name: access_as_user
7. Who can consent: Admins and users (depending on your organization policy).
8. Display name: Access Engagement Lifecycle API.
9. Click Add scope.

You now have a scope similar to:
api://<API-CLIENT-ID>/access_as_user

### B. React SPA registration

1. App registrations -> New registration.
2. Name: Engagement Lifecycle Web.
3. Supported account types: Accounts in this organizational directory only.
4. Register.
5. Copy the Application (client) ID.

Add redirect URI:
1. Open Authentication.
2. Click Add a platform.
3. Select Single-page application.
4. For local development add:
   http://localhost:5173
5. Later add your Static Web Apps URL:
   https://<your-static-web-app>.azurestaticapps.net
6. Save.

API permissions:
1. Open API permissions.
2. Click Add a permission.
3. Select My APIs.
4. Select Engagement Lifecycle API.
5. Select delegated permission: access_as_user.
6. Click Add permissions.
7. Grant admin consent if your organization requires it.

---

## STEP 7 - Configure frontend environment variables

Edit frontend/.env locally:

VITE_API_URL=http://localhost:7071/api
VITE_ENABLE_DEMO_MODE=false
VITE_ENTRA_CLIENT_ID=<WEB-APP-CLIENT-ID>
VITE_ENTRA_TENANT_ID=<TENANT-ID>
VITE_ENTRA_API_SCOPE=api://<API-CLIENT-ID>/access_as_user

Run:

cd frontend
npm install
npm run dev

Open:
http://localhost:5173

---

## STEP 8 - Create Static Web App

Azure Portal:
1. Search "Static Web Apps".
2. Click Static Web Apps.
3. Click + Create.
4. Subscription: your subscription.
5. Resource Group: rg-engagement-dev.
6. Name: swa-engagement-dev-12345.
7. Plan type: Free for development.
8. Source: GitHub.
9. Sign in to GitHub when Azure asks.
10. Organization: your GitHub organization/user.
11. Repository: engagement-lifecycle-platform.
12. Branch: main.

Build details:
- Build preset: Custom
- App location: /frontend
- API location: leave blank because the Function App is separate
- Output location: dist

Then:
13. Click Review + create.
14. Click Create.
15. Open the Static Web App.
16. Wait for the GitHub Action to finish.
17. Click the generated URL.

Azure Static Web Apps will create/connect a GitHub deployment workflow.

---

## STEP 9 - Configure Static Web App environment variables

Azure Portal:
1. Open Static Web App.
2. Settings -> Environment variables.
3. Add:
   VITE_API_URL = https://<your-function-app>.azurewebsites.net/api
   VITE_ENABLE_DEMO_MODE = false
   VITE_ENTRA_CLIENT_ID = <WEB-APP-CLIENT-ID>
   VITE_ENTRA_TENANT_ID = <TENANT-ID>
   VITE_ENTRA_API_SCOPE = api://<API-CLIENT-ID>/access_as_user

Important:
VITE values are frontend/browser configuration. Do not put secrets here.

Because Vite variables are build-time values, the GitHub Actions workflow must build the frontend with these values available. For the easiest beginner setup, add the same values as GitHub Actions secrets/variables and update the workflow to export them during the build.

---

## STEP 10 - GitHub Actions for Function App

The repository contains:
.github/workflows/backend.yml

Before it can deploy, create an Azure identity for GitHub Actions using OIDC.

In Azure Portal:
1. Open Microsoft Entra ID.
2. App registrations -> New registration.
3. Name: GitHub Actions Engagement Lifecycle.
4. Register.
5. Copy:
   Application (client) ID
   Directory (tenant) ID

Then give this identity permission to deploy the Function App:
1. Open the Function App.
2. Access control (IAM).
3. Add -> Add role assignment.
4. Choose a deployment role such as Contributor for a development environment.
5. Select the GitHub Actions app registration.
6. Review + assign.

Then configure GitHub repository secrets:
GitHub repository -> Settings -> Secrets and variables -> Actions -> New repository secret

Add:
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
AZURE_FUNCTIONAPP_NAME

Push to main and the backend workflow deploys the Function App.

For tighter production permissions, replace broad Contributor access with a least-privilege deployment identity.

---

## STEP 11 - Storage access with Managed Identity

Once the Function App is working:

1. Open Function App.
2. Settings -> Identity.
3. System assigned -> On.
4. Save.
5. Copy the Function App principal/object ID.
6. Open Storage Account.
7. Access Control (IAM).
8. Add role assignment.
9. Role: Storage Table Data Contributor.
10. Assign access to: Managed identity.
11. Select your Function App.
12. Review + assign.

Then set:
STORAGE_ACCOUNT_URL=https://<storage-account-name>.table.core.windows.net

Remove STORAGE_CONNECTION_STRING from the Azure Function App after verifying managed identity works.

This is the preferred production direction.

---

## STEP 12 - Key Vault

Do this after the application is running.

Azure Portal:
1. Search Key vaults.
2. Click + Create.
3. Resource group: rg-engagement-dev.
4. Name: kv-engagement-dev-<unique>.
5. Use RBAC permission model.
6. Create.

Then:
1. Function App -> Identity -> enable system assigned identity.
2. Key Vault -> Access control (IAM).
3. Add role assignment.
4. Grant Key Vault Secrets User to the Function App managed identity.

Only store actual secrets in Key Vault. Do not store ordinary public frontend configuration there.

---

## STEP 13 - Test CI/CD

Make a small frontend change.

git add .
git commit -m "Update dashboard"
git push

Then:
1. GitHub -> repository -> Actions.
2. Open the frontend workflow.
3. Wait for it to complete.
4. Open Static Web Apps URL.
5. Verify the change.

For backend:

git add .
git commit -m "Update engagement API"
git push

Then open the backend workflow and verify deployment.

From this point forward, normal changes can be deployed with git push.

---

## Recommended development sequence

Do NOT configure every Azure service on day one.

Day 1:
- GitHub
- Resource Group
- Storage Account
- Function App
- Static Web App

Day 2:
- React UI
- Table Storage
- Function APIs

Day 3:
- Entra ID
- MSAL
- API authorization

Day 4:
- Key Vault
- Managed Identity
- GitHub OIDC hardening

Then build:
- Documents metadata
- Billing
- Payments
- Renewals
- Salesforce/STAR/XCM integrations
