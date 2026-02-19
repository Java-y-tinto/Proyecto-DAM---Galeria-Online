# Online Art Gallery E-Commerce Platform

A full-stack e-commerce application designed with a microservices-oriented architecture. This project implements a Backend-for-Frontend (BFF) pattern to decouple the modern Angular frontend from a monolithic Odoo ERP backend, ensuring scalability, type safety, and optimized data fetching.

The frontend is completely detached from the backend,only receiving data through the GraphQL middleware.

## Architecture

The core goal for the architecture of this project was to avoid direct coupling between the client and the Odoo backend.

* **Frontend (Angular):** A reactive Single Page Application (SPA). It does not communicate directly with the database or the ERP.This is a feature to ensure the application's security.
* **BFF Middleware (Apollo GraphQL):** Acts as an API Gateway and orchestration layer. It exposes a clean, strongly-typed GraphQL schema to the frontend while handling the complex XML-RPC communication with Odoo in the background. This solves the "over-fetching" and "under-fetching" problems common in REST APIs.
* **Backend (Odoo V18):** Serves as the backend for all the database operations and houses all the data,including products and user data,with the only exception being payment data,which is handled by Stripe.

This project is fully containerized using docker and orchestrated via Docker Compose.The image of the project is available in this repository.

## Tech Stack

### Frontend
* **Framework:** Angular V19
* **Styling:** SCSS
* **State management and asynchrony:** RxJS
* **Testing:** vitest,Jest
* **Logic:** Typescript

### Middleware (BFF)

* **Runtime used:** Node.js
* **Language:** Typescript (strict)
* **API:** Apollo Server
* **Protocol used:** JSON-RPC (this is the main protocol that allows communication between Apollo and Odoo

### DevOps & CI/CD
* **Containerization:** As stated above,Docker and Docker compose were used.
* **CI Pipeline:** GitHub actions was used for automatic builds and testing,due to ease of use.


 ## Getting Started

 ### Prerequisites
 * Docker and Docker compose
 * Node.js/Bun (for local development without Docker)

 ### Installation
 1. Clone the repository:
    ```bash
    git clone https://github.com/Java-y-tinto/Proyecto-DAM---Galeria-Online.git
    ```
 2. Create a docker compose file for the frontend and middleware.In the backend folder,an example docker compose file is provided for the backend.
 3. Access the aplication
    Endpoints:
      * Frontend: http://localhost:4200 (or configured port in compose file)
      * GraphQL endpoint: http://localhost:4000/graphql
    
    
