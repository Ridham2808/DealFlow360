# DealFlow360 — Intelligent, Self-Governing Sales Operations Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/Tests-157%20Passed-success?logo=jest&logoColor=white)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **DealFlow360** is an enterprise-grade Sales Operations and Quote-to-Cash (QTC) engine built for complex B2B sales environments. It replaces fragmented spreadsheets, manual approvals, and disconnected inventory tools with an autonomous, self-governing sales execution platform.

---

## 👥 Authors & Team Members

- **Ridham Patel**
- **Yasar Khan**

---

## 📑 Table of Contents

1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [High-Level System Architecture](#-high-level-system-architecture)
3. [Core Capabilities & Modules](#-core-capabilities--modules)
   - [A. Advanced Quotation Builder & Mixed-Line Engine](#a-advanced-quotation-builder--mixed-line-engine)
   - [B. Multi-Tier Approval Governance & Sequential Routing](#b-multi-tier-approval-governance--sequential-routing)
   - [C. Inbound Customer Demand & RFQ Quotation Generation](#c-inbound-customer-demand--rfq-quotation-generation)
   - [D. Multi-Warehouse Fulfillment & Backorder Management](#d-multi-warehouse-fulfillment--backorder-management)
   - [E. Hybrid Invoicing & Subscription Billing Cycles](#e-hybrid-invoicing--subscription-billing-cycles)
   - [F. Isolated Customer Portal & Live Negotiation Loop](#f-isolated-customer-portal--live-negotiation-loop)
   - [G. Deal Health Monitoring & Anomaly Detection](#g-deal-health-monitoring--anomaly-detection)
4. [Quotation Lifecycle & State Machine](#-quotation-lifecycle--state-machine)
5. [Relational Data Model & ERD](#-relational-data-model--erd)
6. [Technology Stack](#-technology-stack)
7. [Repository Structure](#-repository-structure)
8. [Local Installation & Setup Guide](#-local-installation--setup-guide)
9. [Pre-Seeded Demo Dataset & Credentials](#-pre-seeded-demo-dataset--credentials)
10. [Automated Test Suite & Verification](#-automated-test-suite--verification)

---

## 🎯 Executive Summary & Problem Statement

### The Problem in Enterprise B2B Sales
Most CRM and quoting tools handle only simplistic scenarios: a sales rep selects a single product, applies a discount, sends a PDF, and marks it as won. Real-world enterprise sales teams operate in far messier conditions:

1. **Rogue Discounting & Margin Erosion**: Reps apply unmonitored discounts to win deals, destroying company margins before finance even notices.
2. **Disconnected Approvals**: Deals requiring manager or finance review get stuck in endless Slack threads or email chains without audit trails.
3. **Complex Mixed Offerings**: Modern contracts mix **one-time hardware**, **setup services**, **extended warranties**, and **recurring SaaS subscriptions** in a single contract.
4. **Multi-Warehouse Stock Splitting**: Partial inventory across geographically dispersed warehouses leads to delayed shipments, unallocated backorders, and disappointed customers.
5. **Friction in Negotiations**: Negotiating over email or redlines creates version desynchronization; customers propose terms that exceed governance thresholds without automatic escalation.

### The DealFlow360 Solution
DealFlow360 solves these operational gaps with an **authoritative, self-governing pricing, fulfillment, and negotiation engine**:

```
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ Inbound Demand  │ ───▶  │ Quotation Build │ ───▶  │ Multi-Tier      │
 │ (Customer RFQ)  │       │ (Mixed Lines)   │       │ Governance      │
 └─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                              │
 ┌─────────────────┐       ┌─────────────────┐                ▼
 │ Hybrid Billing  │ ◀───  │ Multi-Warehouse │ ◀───  ┌─────────────────┐
 │ & Invoices      │       │ Fulfillment     │       │ Customer Portal │
 └─────────────────┘       └─────────────────┘       │ & Negotiation   │
                                                     └─────────────────┘
```

---

## 🏛️ High-Level System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (Next.js 14 App Router)"]
        direction TB
        InternalUI["Internal Workspace\n(/dashboard, /quotations, /approvals,\n/fulfillment, /subscriptions, /invoices,\n/deal-health, /reports, /admin)"]
        PortalUI["Customer Portal (Isolated Layout)\n(/portal - My Quotations, Negotiation,\nInbound RFQ Requests)"]
    end

    subgraph APILayer ["Backend Application Layer (Express.js)"]
        direction TB
        AuthMid["JWT Auth Middleware & HttpOnly Cookies"]
        RoleGuard["Role & Customer Isolation Guards"]
        
        subgraph Services ["Core Business Logic Services"]
            QuoteSvc["Quotation & Pricing Engine\n(quoterService.js / pricingService.js)"]
            RiskSvc["Blended Risk & Margin Engine\n(riskScoreService.js)"]
            ApprSvc["Sequential Approval Engine\n(approvalService.js)"]
            FulfillSvc["Multi-Warehouse Fulfillment\n(fulfillmentService.js)"]
            BillSvc["Hybrid Billing & Invoices\n(billingService.js)"]
            NegotSvc["Portal Negotiation & Auto Re-Approval\n(negotiationService.js)"]
            CustReqSvc["Customer RFQ & Auto-Quote\n(customerRequestRoutes.js)"]
            HealthSvc["Deal Health & Anomaly Detector\n(dealHealthService.js)"]
        end
    end

    subgraph DataLayer ["Data & Persistence Layer"]
        PrismaORM["Prisma ORM (Strict Schemas & Transactions)"]
        PostgresDB[("PostgreSQL Database\n(400+ Enterprise Seed Records)")]
    end

    InternalUI --> AuthMid
    PortalUI --> AuthMid
    AuthMid --> RoleGuard
    RoleGuard --> Services
    Services --> PrismaORM
    PrismaORM --> PostgresDB
```

---

## ⚙️ Core Capabilities & Modules

### A. Advanced Quotation Builder & Mixed-Line Engine
- **Mixed Line Item Types**: Build quotes containing physical **Hardware**, hourly **Services**, tied **Warranties**, and recurring **Subscriptions**.
- **Intelligent Stock Checks**: Physical hardware checks live warehouse inventory; service and subscription lines bypass warehouse allocations.
- **Dynamic Tier-Based Margins**: Automatically computes authoritative cost, line subtotals, margins, and taxes.
- **Real-Time Upsell & Cross-Sell Suggestions**: Evaluates active quotation lines and customer tier against defined `UpsellRule` records to suggest high-margin add-ons with one-click injection.

### B. Multi-Tier Approval Governance & Sequential Routing
- **Rule-Driven Escalation**:
  - `SALES_REP`: Self-approval for discounts within customer tier limit.
  - `SALES_MANAGER` (Level 1): Required when discounts exceed tier/category ceilings (0.01% to 10.00% overage).
  - `FINANCE` (Level 2): Required for heavy discounts (> 10.00% overage) or low-margin deals.
- **Optimistic Concurrency & Audit Trails**: Uses version checks and transactional rollbacks. Managers can Approve, Reject, or **Return with Review Notes**.
- **Dedicated "Returned for Review" Stage**: Visual amber callouts on the Quotations Kanban board notify reps immediately of returned quotes requiring revision.

### C. Inbound Customer Demand & RFQ Quotation Generation
- **Customer Self-Service RFQ**: Customers can submit structured Quote Requests (`/portal`) specifying project title, delivery deadline, budget target, and requested product lines.
- **Catalog Product Search**: Offers safe catalog auto-suggestions without leaking internal margins or costs.
- **1-Click Quote Generation**: Sales reps view inbound customer requests in a dedicated tab on `/quotations` and click **"⚡ Create Quotation from Request"**, automatically generating a draft quotation pre-populated with customer details and line items.

### D. Multi-Warehouse Fulfillment & Backorder Management
- **Intelligent Inventory Allocation**: Distributes physical product demand across warehouses (e.g., Austin TX, East PA, West AZ).
- **Split Shipments & Backorder Tracking**: When single warehouses lack sufficient stock, the engine automatically splits fulfillment across multiple locations and logs backorder quantities.
- **Replenishment Thresholds**: Flags warehouses when available inventory drops below safety thresholds.

### E. Hybrid Invoicing & Subscription Billing Cycles
- **One-Time + Recurring**: Handles split billing where hardware is invoiced upfront while subscriptions are placed on automated billing schedules (`MONTHLY`, `QUARTERLY`, `YEARLY`).
- **Invoice Lifecycle**: Full tracking across `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, and `VOID`.
- **Payment Reconciliation**: Recording payment updates invoice balances and automatically triggers downstream order fulfillment.

### F. Isolated Customer Portal & Live Negotiation Loop
- **Security-First Architecture**: Dedicated route layout at `/portal` utilizing strict server-side scoping. No exposure of internal costs, margins, approval notes, or warehouse stock.
- **Smooth Viewport Scrolling**: Completely responsive viewport allowing customers to scroll effortlessly through extensive line items, comments, and proposals.
- **Live Counter-Offers**: Customers can submit counter-discount requests and requested delivery dates.
- **Automatic Re-Approval Protocol**: If a customer accepts terms that exceed discount governance rules, the quotation **automatically re-enters the manager approval chain**.

### G. Deal Health Monitoring & Anomaly Detection
- **Automated Health Engine**: Constantly monitors pipeline metrics and flags risks:
  - `STALLED`: Quotes inactive in draft or negotiation past threshold limits.
  - `DISCOUNT_ANOMALY`: Extreme discounts eroding target margins.
  - `DELIVERY_SLIPPAGE`: Warehouse fulfillment or delivery dates at risk of breach.
  - `OVERDUE_INVOICE`: Confirmed orders with unpaid balances past due date.

---

## 🔄 Quotation Lifecycle & State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Rep Creates Quote / RFQ Converted
    DRAFT --> PENDING_APPROVAL: Rep Submits for Approval (Discount > Ceilings)
    DRAFT --> CONFIRMED: Rep Confirms (No approval required)
    
    PENDING_APPROVAL --> APPROVED: Manager / Finance Approves
    PENDING_APPROVAL --> RETURNED: Returned with Review Comments
    PENDING_APPROVAL --> REJECTED: Disapproved by Manager / Finance
    
    RETURNED --> DRAFT: Rep Edits Pricing / Terms
    
    APPROVED --> SENT_TO_CUSTOMER: Sent to Customer Portal
    SENT_TO_CUSTOMER --> UNDER_NEGOTIATION: Customer Proposes Counter-Offer
    UNDER_NEGOTIATION --> SENT_TO_CUSTOMER: Rep Adjusts & Re-sends
    
    SENT_TO_CUSTOMER --> CONFIRMED: Customer Confirms Terms
    UNDER_NEGOTIATION --> PENDING_APPROVAL: Customer Confirms but terms exceed Governance Limits
    
    CONFIRMED --> CONVERTED_TO_ORDER: Invoiced & Sent to Fulfillment
    CONVERTED_TO_ORDER --> [*]
    
    DRAFT --> EXPIRED: Expiration Date Passed
    SENT_TO_CUSTOMER --> EXPIRED: Expiration Date Passed
```

---

## 🗄️ Relational Data Model & ERD

```mermaid
erDiagram
    Customer ||--o{ User : "has portal users"
    Customer ||--o{ Quotation : "owns"
    Customer ||--o{ CustomerRequest : "submits RFQs"
    
    User ||--o{ Quotation : "owns as sales rep"
    User ||--o{ ApprovalStep : "assigned to action"
    User ||--o{ AuditLog : "acts on"
    User ||--o{ CustomerRequest : "submits"
    
    Quotation ||--|{ QuotationLine : "contains"
    Quotation ||--o{ ApprovalStep : "governed by"
    Quotation ||--o{ FulfillmentSplit : "dispatches to"
    Quotation ||--o{ Invoice : "billed via"
    Quotation ||--o{ DealHealthFlag : "monitored by"
    Quotation ||--o{ AuditLog : "audited by"
    
    Product ||--o{ ProductVariant : "has"
    Product ||--o{ QuotationLine : "quoted in"
    Product ||--o{ StockLevel : "stored in"
    Product ||--o{ PriceListItem : "priced in"
    Product ||--o{ UpsellRule : "triggers / suggested"
    
    Warehouse ||--o{ StockLevel : "stores"
    Warehouse ||--o{ FulfillmentSplit : "fulfills"
    
    PriceList ||--|{ PriceListItem : "contains"
    SubscriptionPlan ||--o{ QuotationLine : "recurring tier"
    SubscriptionPlan ||--o{ BillingSchedule : "schedules"
    
    CustomerRequest ||--o| Quotation : "converted to"
```

---

## 💻 Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router, Server & Client Components)
- **Styling**: Vanilla CSS & Tailwind CSS for utility grids, custom CSS Variables dark-theme design tokens
- **Icons**: Lucide React
- **State Management**: React Context (`AuthContext`, `QuotationContext`, `WorkspaceContext`)
- **Theme**: Enterprise Sleek Dark Mode (`#080808`, `#101217`, `#12141a`)

### Backend & Database
- **Runtime**: Node.js (v18+)
- **API Server**: Express.js with custom middleware (JWT, Request Tracking, Role-Based Access Control)
- **Database**: PostgreSQL 15+
- **ORM**: Prisma Client v6
- **Testing**: Jest & SuperTest (Full End-to-End API Test Suite)

---

## 📁 Repository Structure

```
DealFlow360/
├── client/                     # Next.js 14 Frontend Application
│   ├── app/
│   │   ├── (auth)/             # Login, Sign Up, Accept Invitation
│   │   ├── (workspace)/        # Protected Internal Operations Portal
│   │   │   ├── dashboard/      # Executive KPIs, Velocity, Deal Health
│   │   │   ├── quotations/     # Kanban Board, Table View, Customer Inbound RFQs
│   │   │   │   ├── [id]/       # Quotation Detail Builder & Line Engine
│   │   │   │   └── new/        # Create Quotation Draft
│   │   │   ├── approvals/      # Sequential Multi-Tier Approval Queue
│   │   │   ├── fulfillment/    # Multi-Warehouse Split & Backorders
│   │   │   ├── subscriptions/  # Recurring Hybrid Subscriptions
│   │   │   ├── invoices/       # Invoice Generator & Payment Processing
│   │   │   ├── deal-health/    # Anomaly Telemetry & Flag Management
│   │   │   ├── reports/        # Pipeline Reports & CSV Export Engine
│   │   │   └── admin/          # Users, Products, Price Lists, Governance Rules
│   │   ├── portal/             # Isolated Customer Negotiation Portal
│   │   │   ├── layout.jsx      # Customer Security Wrapper (Zero internal leak)
│   │   │   └── page.jsx        # Customer Quotations, Negotiation, RFQ modal
│   │   └── globals.css         # Typography, Custom Dark Theme & Scrollbars
│   ├── components/             # Reusable UI Atoms, Badges, Modals, TopNav
│   └── context/                # AuthContext, QuotationContext, WorkspaceContext
│
├── server/                     # Node.js / Express Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Complete Relational Forward-Compatible Schema
│   │   └── seed.js             # 400+ Enterprise Dataset Seed Script
│   ├── routes/                 # RESTful Endpoints (Quotations, Approvals, Portal, etc.)
│   ├── services/               # Authoritative Business Logic Engines
│   ├── middleware/             # JWT, Customer Identification, RBAC, Request IDs
│   └── tests/                  # 20 Jest Integration Test Suites (157 Passing Tests)
│
└── README.md                   # System Architecture & Documentation
```

---

## 🚀 Local Installation & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.17.0 or newer
- **PostgreSQL**: Running locally on port `5432` with a database named `dealflow360`
- **npm**: v9 or newer

### 2. Clone the Repository
```bash
git clone https://github.com/Ridham2808/DealFlow360.git
cd DealFlow360
```

### 3. Configure Environment Variables

**Server Environment** (`server/.env`):
```env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=dealflow360_super_secret_jwt_key_2026_change_in_production
JWT_EXPIRES_IN=7d
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dealflow360?schema=public"
COOKIE_NAME=dealflow_token
CLIENT_URL=http://localhost:3000
```

**Client Environment** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client
```

### 5. Initialize Database & Seed Demo Data
```bash
# Push schema changes to PostgreSQL
cd server
npx prisma db push

# Seed 400+ comprehensive enterprise records
node prisma/seed.js
cd ..
```

### 6. Start the Development Servers
```bash
# Runs both backend (port 5000) and frontend (port 3000) concurrently
npm run dev
```

Open your browser and navigate to:
- **Internal Operations Workspace**: [http://localhost:3000](http://localhost:3000)
- **Customer Negotiation Portal**: [http://localhost:3000/portal](http://localhost:3000/portal)

---

## 🔑 Pre-Seeded Demo Dataset & Credentials

All seeded accounts share the password: **`Password123!`**

| Role | Email | Best Use Case to Demo |
| :--- | :--- | :--- |
| **Sales Rep** | `rep@dealflow360.com` | Convert inbound RFQs, build mixed quotes, view *Returned for Review* quotes |
| **Sales Manager** | `manager@dealflow360.com` | Level 1 discount governance, approve or return quotes with notes |
| **Finance** | `finance@dealflow360.com` | Level 2 escalations, review hybrid billing schedules and invoices |
| **Customer Portal** | `customer@acmecorp.com` | Submit RFQ quote requests, negotiate terms, or confirm quotes |
| **Admin** | `admin@dealflow360.com` | Configure discount tiers, price lists, warehouses, and manage users |

### Seeded Enterprise Customers
- **Acme Corp** (`GOLD` Tier — 15% discount ceiling)
- **NovaTech Solutions** (`GOLD` Tier — 15% discount ceiling)
- **Beta Industries** (`SILVER` Tier — 10% discount ceiling)
- **Quantum Dynamics** (`SILVER` Tier — 10% discount ceiling)
- **Summit Retail Co** (`BRONZE` Tier — 5% discount ceiling)

---

## 🧪 Automated Test Suite & Verification

DealFlow360 comes with a comprehensive end-to-end integration and unit test suite verifying data isolation, risk calculations, sequential approvals, fulfillment splitting, and customer RFQs.

### Run All Tests:
```bash
npm test --prefix server
```

### Test Suite Summary:
```text
Test Suites: 20 passed, 20 total
Tests:       157 passed, 157 total
Snapshots:   0 total
Time:        11.395 s
Ran all test suites.
```

| Test Suite | Focus Area |
| :--- | :--- |
| `customerRequest.test.js` | Inbound RFQ creation, public catalog, 1-click quote conversion |
| `quotationBuilderMixedLines.test.js` | Hardware, services, warranties, subscriptions, upsells |
| `approvalService.test.js` | Multi-tier sequential approval, finance escalation, optimistic locking |
| `portalAndReports.test.js` | Data isolation, security boundaries, customer counter-offers |
| `fulfillmentService.test.js` | Multi-warehouse stock splitting and backorder handling |
| `billingService.test.js` | Hybrid recurring schedules and automated invoice generation |
| `dealHealthService.test.js` | Anomaly telemetry: stalled, discount breach, slippage |
| `pricingService.test.js` | Price list hierarchy and tier ceiling validation |
| `auth.test.js` | JWT httpOnly cookies, password hashing, invitation verification |

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.