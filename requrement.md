# Community Member & Family Management System

## Production Ready Enterprise Application Specification

---

# Project Objective

Develop a production-ready, enterprise-grade web application to manage members of a community association (Samithiya) and their complete family information.

The application must be secure, scalable, responsive, mobile-first, cloud-native, and designed for long-term maintenance.

Primary users will be community officers, committee members, administrators, and data entry operators.

The system must support thousands of members while maintaining excellent performance and usability.

---

# Highest Priority Requirements

1. Sinhala is the primary application language.
2. Mobile-first responsive design is mandatory.
3. Production-ready code quality.
4. Secure authentication and authorization.
5. Scalable database design.
6. Photo management for all persons.
7. Birthday reminder automation.
8. Audit logging.
9. Document management.
10. Cloud deployment readiness.

---

# Technology Stack

## Frontend

* React 19
* TypeScript
* Vite
* Material UI (MUI)
* Redux Toolkit
* React Router
* React Hook Form
* Yup Validation
* Axios
* React-i18next

## Backend

* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Storage
* Supabase Edge Functions
* Supabase Cron

## Email Service

* SendGrid

## Deployment

Frontend:

* Vercel

Backend:

* Supabase

Repository:

* GitHub

---

# Application Architecture

Implement Clean Architecture principles.

Structure:

src/
├── api/
├── assets/
├── components/
├── constants/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── translations/
├── theme/
├── types/
├── utils/
└── App.tsx

Requirements:

* Reusable components
* Strong typing
* Modular architecture
* Lazy loading
* Error boundaries
* Feature-based organization

---

# Language Requirements

## Sinhala First

All UI elements must use Sinhala.

Includes:

* Menus
* Labels
* Buttons
* Forms
* Validation Messages
* Notifications
* Reports
* Emails
* Dashboard Widgets

Implement using:

* react-i18next

Prepare architecture for future English support.

All reports and exported files must support Sinhala Unicode.

---

# User Roles

## Administrator

Can:

* Manage members
* Manage family members
* Upload photos
* Upload documents
* Manage users
* Configure system
* Configure email settings
* Generate reports
* View audit logs
* Delete records

---

## Data Entry User

Can:

* Add members
* Edit members
* Upload photos
* Upload documents
* Search information

Cannot:

* Delete records
* Manage users
* Configure system

---

## Viewer

Can:

* View information
* Search information
* View reports

Cannot:

* Create
* Update
* Delete

---

# Database Design

Use normalized relational structure.

---

## Members

Store primary member information.

Fields:

* id
* member_number
* full_name
* nic
* date_of_birth
* gender
* address
* phone_number
* email
* photo_url
* active_status
* created_at
* updated_at

---

## Family Members

Store all family relationships.

Fields:

* id
* member_id
* relationship_type
* full_name
* nic
* date_of_birth
* address
* photo_url
* created_at
* updated_at

Relationship Types:

* SPOUSE
* MOTHER
* FATHER
* SPOUSE_MOTHER
* SPOUSE_FATHER
* CHILD

Support unlimited children.

---

## Documents

Fields:

* id
* member_id
* family_member_id
* document_type
* file_name
* file_url
* uploaded_by
* uploaded_at

Document Types:

* NIC
* Birth Certificate
* Marriage Certificate
* Membership Application
* Other

---

## Users

Fields:

* id
* full_name
* email
* role
* active_status
* created_at

---

## Email Recipients

Fields:

* id
* email
* enabled
* created_at

---

## System Settings

Fields:

* id
* setting_key
* setting_value

Store:

* SendGrid API Key
* Sender Email
* Sender Name
* Reminder Schedule

---

## Audit Logs

Fields:

* id
* user_id
* action
* entity_type
* entity_id
* description
* created_at

---

# Authentication & Security

Implement using Supabase Authentication.

Features:

* Login
* Logout
* Forgot Password
* Password Reset
* Session Management

Implement:

* Role Based Access Control
* Protected Routes
* Row Level Security
* Secure Storage Policies
* JWT Validation

Security requirements:

* No hardcoded secrets
* Environment variables only
* Input validation
* XSS protection
* CSRF protection where applicable

---

# Member Management Module

Create complete CRUD functionality.

Member Registration Wizard:

Step 1:
Member Information

Step 2:
Spouse Information

Step 3:
Member Mother

Step 4:
Member Father

Step 5:
Spouse Mother

Step 6:
Spouse Father

Step 7:
Children

Step 8:
Review and Save

Validation:

* NIC uniqueness
* Required fields
* Date validation
* Duplicate detection

---

# Family Management

Support:

* Add
* Edit
* Delete
* View

Unlimited family members.

Family Tree View required.

---

# Photo Management

Every person record must support photos.

Includes:

* Member
* Spouse
* Parents
* Spouse Parents
* Children

Supported Formats:

* JPG
* JPEG
* PNG
* WEBP

Maximum Size:

5 MB

Store in Supabase Storage.

Features:

* Upload
* Preview
* Crop
* Thumbnail
* Full Screen Viewer
* Download

---

# Document Management

Supported Files:

* PDF
* JPG
* PNG

Maximum Size:

10 MB

Store in Supabase Storage.

Features:

* Upload
* Preview
* Download
* Delete
* Version Tracking

---

# Dashboard

Create modern analytics dashboard.

Widgets:

* Total Members
* Total Families
* Total Children
* New Members This Month
* Birthdays This Month

Charts:

* Monthly Registrations
* Age Distribution
* Family Size Distribution
* Gender Distribution

Use Recharts.

---

# Birthday Management

Dedicated Birthday Dashboard.

Show:

* Today's Birthdays
* Upcoming 7 Days
* Upcoming 30 Days

Display:

* Photo
* Name
* Relationship
* Age
* Address

---

# Birthday Reminder Automation

Implement using:

* Supabase Cron
* Supabase Edge Functions
* SendGrid

Run daily at:

07:00 AM Sri Lanka Time

Reminder Schedule:

* 30 Days Before
* 14 Days Before
* 7 Days Before
* 3 Days Before
* 1 Day Before
* Birthday Day

Email Content:

* Photo
* Name
* Relationship
* Birthday Date
* Age
* Address

All emails must support Sinhala Unicode.

---

# Search Module

Global Search:

* Member Name
* NIC
* Member Number
* Address

Advanced Search:

* Age Range
* Birthday Month
* Relationship
* Area

Features:

* Pagination
* Sorting
* Filtering

---

# Reports Module

Generate:

## Member Report

Export:

* PDF
* Excel
* CSV

---

## Family Report

Display full family information.

---

## Birthday Report

Display:

* Monthly Birthdays
* Upcoming Birthdays

---

# Audit Logging

Track:

* Login
* Logout
* Create
* Update
* Delete
* Upload Photo
* Upload Document
* Send Email

Store all actions.

Provide audit log search screen.

---

# Responsive Design Requirements

This is a mandatory requirement.

The application must be mobile-first.

Responsive support required for:

Mobile:

* 320px+
* 360px+
* 390px+

Tablet:

* 768px+
* 1024px+

Desktop:

* 1280px+
* 1440px+
* 1920px+

---

## Mobile UI Requirements

Mobile usage is the primary target.

Use:

* Hamburger Menu
* Drawer Navigation
* Full Width Forms
* Card Based Data Views

Tables must automatically switch to card layouts on mobile.

No horizontal scrolling.

---

## Tablet UI Requirements

Use:

* Collapsible Sidebar
* Responsive Grids

---

## Desktop UI Requirements

Use:

* Permanent Sidebar
* Dashboard Layout
* Multi-column Forms

---

## Dashboard Responsiveness

Desktop:

* 4 widgets per row

Tablet:

* 2 widgets per row

Mobile:

* 1 widget per row

Charts must resize automatically.

---

## Form Responsiveness

Mobile:

* Single Column

Tablet:

* Two Columns

Desktop:

* Two to Four Columns

---

## Accessibility

Support:

* Keyboard Navigation
* ARIA Labels
* Screen Readers
* High Contrast Mode

Target Lighthouse Score:

* Performance > 90
* Accessibility > 90
* Best Practices > 90

---

# Performance Requirements

Must support:

* 10,000+ Members
* 50,000+ Family Records

Implement:

* Database Indexes
* Server-side Pagination
* Query Optimization
* Lazy Loading
* Image Optimization

---

# Error Handling

Implement:

* Global Error Boundary
* API Error Handling
* User Friendly Messages
* Logging

---

# Notifications

Use Snackbar Notifications.

Types:

* Success
* Warning
* Error
* Information

---

# Dark Mode

Provide:

* Light Theme
* Dark Theme

Persist user preference.

---

# Deployment Requirements

Provide:

* Production Environment Setup
* Supabase SQL Scripts
* RLS Policies
* Storage Policies
* Vercel Deployment Configuration
* Environment Variable Documentation

---

# Deliverables

1. Complete React Application
2. TypeScript Codebase
3. Supabase Database Schema
4. Authentication Module
5. Member Management Module
6. Family Management Module
7. Photo Management Module
8. Document Management Module
9. Dashboard Module
10. Search Module
11. Reports Module
12. Birthday Reminder Module
13. Audit Logging Module
14. Responsive UI
15. Dark Mode
16. Deployment Documentation
17. Database Migration Scripts
18. Production Ready Configuration

The final solution must be deployable to production without requiring major architectural changes and must follow enterprise-grade coding standards, security practices, scalability principles, and responsive design best practices.
