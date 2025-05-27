# LNMIIT Medical Unit Management System (Backend Focused Role)

**A collaborative full-stack web application (3-person team) where my primary role was the design, development, and implementation of the backend system using Node.js, Express.js, and MySQL.**

This project simulates a real-world system for managing student medical records. While the team worked together on the overall application, my core responsibilities revolved around building the server-side logic, API endpoints, database interactions, and authentication mechanisms.

---

## Table of Contents

- [Project Overview & My Role](#project-overview--my-role)
- [Project Screenshots](#project-screenshots)
- [Key Learnings & Backend Skills Demonstrated](#key-learnings--backend-skills-demonstrated)
- [Core Features (Backend Perspective)](#core-features-backend-perspective)
- [Technologies Used](#technologies-used)
  - [Backend (My Focus Area)](#backend-my-focus-area)
  - [Frontend (Developed by Team Members)](#frontend-developed-by-team-members)
  - [Database](#database)
- [System Architecture (High-Level)](#system-architecture-high-level)
- [Setup and Installation Guide](#setup-and-installation-guide)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
  - [Database Seeding (Important for Testing)](#database-seeding-important-for-testing)
  - [Starting the Server](#starting-the-server)
- [Project Structure (Highlighting Backend)](#project-structure-highlighting-backend)
- [Backend Challenges & Future Enhancements](#backend-challenges--future-enhancements)

---

## 📖 Project Overview & My Role

The LNMIIT Medical Unit Management System is a web application built by a team of three students to streamline medical record management. It offers distinct portals for students and medical staff.

**My specific role in this team project was focused on the backend development.** This involved:

* Designing and developing the RESTful API using Node.js and Express.js to power all application functionalities.
* Implementing the database schema and managing all data interactions with MySQL.
* Building the user authentication system using JWT and bcryptjs for secure password handling.
* Developing the server-side logic for medical record management, certificate data storage, and file upload handling for certificates.
* Ensuring the backend effectively integrated with the frontend components developed by my teammates.

---

## 📸 Project Screenshots

While a live demo is not currently available, these screenshots (showcasing the full application built by our team) illustrate the functionalities powered by the backend I developed:

**(Please replace the placeholder text below with your actual screenshots. You can embed images in Markdown using the `![Alt text](path/to/image.png)` syntax. If you upload your screenshots to the GitHub repository, you can use relative paths.)**

1.  **Login Page:**
    * *Backend: API endpoint for role-based user authentication and JWT generation.*
    * `![Login Page Screenshot](path/to/your/login_page_screenshot.png)`

2.  **Student Dashboard (Data retrieved via Backend APIs):**
    * *Backend: APIs to fetch student profile details, medical history, and certificate information.*
    * `![Student Dashboard Screenshot](path/to/your/student_dashboard_screenshot.png)`

3.  **Student Profile Edit Mode (Data submitted to Backend APIs):**
    * *Backend: API endpoint to securely update student hostel/room details.*
    * `![Student Profile Edit Screenshot](path/to/your/student_profile_edit_screenshot.png)`

4.  **Medical Staff Dashboard (Data managed by Backend):**
    * *Backend: APIs for adding new records, fetching records by date, and managing certificate issuance status.*
    * `![Medical Staff Dashboard Screenshot](path/to/your/medical_staff_dashboard_screenshot.png)`

5.  **Medical Certificate Generation (PDF data submitted to Backend):**
    * *Backend: API endpoint to handle PDF certificate uploads (via Multer), store metadata, and associate with patient records.*
    * `![Certificate Generation Form Screenshot](path/to/your/certificate_form_screenshot.png)`

---

## 🔑 Key Learnings & Backend Skills Demonstrated

This project was instrumental in honing my backend development skills. I was primarily responsible for, and gained significant experience in:

* **Server-Side API Development (Node.js & Express.js):**
    * Designing and implementing RESTful APIs for all application features.
    * Creating robust routing, request handling (GET, POST, PUT), and middleware.
    * Managing server-side application state and logic.
* **Database Design & Management (MySQL):**
    * Designing the relational database schema for users, medical records, and certificates.
    * Writing efficient SQL queries for CRUD operations using the `mysql2` library.
    * Implementing database seeding for development and testing (`createTestUser.js`).
* **User Authentication & Security:**
    * Implementing secure user authentication using JSON Web Tokens (JWT).
    * Safely storing user credentials by hashing passwords with `bcryptjs`.
    * Developing role-based authorization middleware to protect API endpoints.
* **File Upload Management (Multer):**
    * Implementing server-side logic to handle PDF file uploads for medical certificates.
    * Configuring file storage, naming conventions, and size/type validation.
* **Data Validation & Error Handling:**
    * Implementing server-side input validation for API endpoints using `express-validator`.
    * Developing comprehensive error handling strategies for the backend.
* **Environment Configuration (`.env`):**
    * Managing application secrets and configurations securely.
* **Collaboration & Version Control (Git/GitHub):**
    * Working effectively within a team environment.
    * Using Git for version control and collaborating on a shared codebase.
* **Understanding of Full-Stack Integration:**
    * Ensuring seamless communication and data flow between the backend APIs and the frontend (developed by teammates).

---

## ✨ Core Features (Backend Perspective)

As the backend developer, I implemented the server-side logic and APIs that powered the following features:

* **Secure User Authentication:**
    * Developed `/login` endpoint with credential validation (bcrypt) and JWT generation.
    * Created `authenticateToken` middleware for protecting routes.
* **Student Data Management:**
    * APIs for fetching student profile data (`/student/:rollno`).
    * API for students to update their hostel/room details (`PUT /student/hostel-details`).
* **Medical Record Management:**
    * Endpoints for medical staff to create new patient records (`POST /medical/staff/record`).
    * APIs to retrieve medical records for students (`GET /records/:rollno`) and for staff dashboard ( `GET /medical/staff/records`, including date filtering).
* **Certificate Management:**
    * API (`POST /generate-and-save-certificate`) to handle PDF uploads (via Multer), validate data, and store certificate metadata in the database, linking it to a patient record.
    * Endpoints for students to list their certificates (`GET /student/certificates/:rollno`) and download specific certificates (`GET /download/certificate/:filename`) with appropriate authorization checks.
* **Role-Based Access Control:**
    * Implemented logic within API routes and middleware to ensure users could only access data and perform actions appropriate to their role (student or medical-staff).

---

## 🛠️ Technologies Used

### Backend (My Focus Area)

* **Node.js:** JavaScript runtime environment for building server-side applications.
* **Express.js:** Web application framework for Node.js, used for routing and middleware.
* **`mysql2`:** MySQL client for Node.js, enabling database interaction.
* **`jsonwebtoken` (JWT):** For generating and verifying secure access tokens.
* **`bcryptjs`:** For securely hashing user passwords before storing them.
* **`multer`:** Middleware for handling `multipart/form-data`, specifically for PDF certificate uploads.
* **`dotenv`:** For loading environment variables from a `.env` file (database credentials, JWT secrets).
* **`cors`:** Middleware to enable Cross-Origin Resource Sharing for frontend-backend communication.
* **`express-validator`:** For robust server-side validation of incoming API request data.

### Frontend (Developed by Team Members)

* HTML5, CSS3, Vanilla JavaScript
* `jsPDF` (Client-side library used for generating PDF medical certificates before upload)
    *(My role involved defining API contracts for the frontend to consume and ensuring successful integration.)*

### Database

* **MySQL:** Relational database used for storing all application data.

---

## 🏗️ System Architecture (High-Level)

The application follows a standard client-server architecture. My work was central to the **Server (Backend)** and **Database** components.

1.  **Client (Frontend):** Developed by my teammates, this part renders the user interface in the browser and makes API calls to the backend.
2.  **Server (Backend - My Responsibility):** A Node.js/Express.js application I developed. It:
    * Exposes RESTful API endpoints.
    * Handles all business logic (user authentication, data validation, record management).
    * Interacts with the MySQL database.
    * Manages file uploads for certificates.
3.  **Database (MySQL):** Stores user information, medical records, and certificate details. I designed the schema and managed its interaction with the backend.

---

## 🚀 Setup and Installation Guide

(This section remains largely the same as it describes how to get the entire project running. Your teammates and potential reviewers would need these steps.)

Follow these steps to set up and run the project locally:

### Prerequisites

* Node.js (v14.x or later recommended)
* NPM (usually comes with Node.js)
* MySQL Server
* Git

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/your-username/your-repository-name.git](https://github.com/your-username/your-repository-name.git)
    cd your-repository-name
    ```
    *(Replace `your-username/your-repository-name` with your actual GitHub repo details)*

2.  **Install Backend Dependencies:**
    ```bash
    npm install
    ```

3.  **Database Setup:**
    * Ensure your MySQL server is running.
    * Create a new database (e.g., `medical_records`).
        ```sql
        CREATE DATABASE medical_records;
        ```
    * **Table Creation:** Create the `users`, `patient_data`, and `certificates` tables using the SQL schema provided below or a `schema.sql` file if you have one.

        **Database Schema (Verify and refine based on your final implementation):**
        ```sql
        -- users table
        CREATE TABLE users (
            roll_no VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL, -- 'student' or 'medical-staff'
            hostel_no VARCHAR(50),
            room_no VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- patient_data table
        CREATE TABLE patient_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roll_no VARCHAR(50),
            name VARCHAR(255),
            date DATE NOT NULL,
            diagnosis TEXT,
            medications TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (roll_no) REFERENCES users(roll_no)
        );

        -- certificates table
        CREATE TABLE certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            roll_no VARCHAR(50) NOT NULL,
            name VARCHAR(255),
            date DATE,
            diagnosis TEXT,
            medications TEXT,
            age VARCHAR(10),
            gender VARCHAR(20),
            relaxations TEXT,
            serial_no VARCHAR(100) UNIQUE,
            file_path VARCHAR(255) NOT NULL UNIQUE,
            patient_data_id INT UNIQUE, -- Ensure one cert per record
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (roll_no) REFERENCES users(roll_no),
            FOREIGN KEY (patient_data_id) REFERENCES patient_data(id) ON DELETE CASCADE
        );
        ```

4.  **Configure Environment Variables (see next section).**

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root:

```ini
# .env file content

DB_HOST=localhost
DB_USER=your_mysql_user    # Replace
DB_PASSWORD=your_mysql_password # Replace
DB_NAME=medical_records

PORT=3000
NODE_ENV=development

JWT_SECRET=a_very_strong_and_unique_secret_key_for_jwt_please_change # IMPORTANT: Use a strong random string!
JWT_EXPIRES_IN=24h

UPLOAD_DIR=public/uploads/certificates
MAX_FILE_SIZE=5242880

CORS_ORIGIN=http://localhost:3000 # Or frontend origin

EMERGENCY_PHONE=+911234567890
EMERGENCY_EMAIL=medical@campus.edu
